#!/usr/bin/env python3
"""명시한 Certbot 인증서를 점검하고 --apply에서만 사용 종료된 EC2 IPv4 인증서를 폐기한다.

EC2 호스트에서 실행한다. Python 3.9 이상, OpenSSL, Docker와 --config-dir에
보관된 기존 Certbot 계정이 필요하다. 기본 실행은 파일 변경·폐기 요청을 하지 않는다.
"""

import argparse
import configparser
from contextlib import contextmanager
from dataclasses import dataclass
import hashlib
import ipaddress
import os
from pathlib import Path
import re
import ssl
import subprocess
import sys
import tempfile
import time
from typing import FrozenSet, Optional
from urllib.error import HTTPError
from urllib.request import build_opener, HTTPRedirectHandler, ProxyHandler, Request


ACME_SERVER = "https://acme-v02.api.letsencrypt.org/directory"
CERTBOT_IMAGE = "certbot/certbot:latest"
DISABLED_MARKER = ".travel-ip-disabled.sha256"
REVOKED_MARKER = ".travel-ip-revoked.sha256"
# disabled는 폐기 의도/진행 중 상태, revoked는 CA가 확인한 성공 상태다.
# 두 상태를 나눠야 네트워크 오류를 폐기 성공으로 기록하지 않고 재시도할 수 있다.


class SafetyError(Exception):
    """판단 근거가 부족하거나 상태가 바뀌어 운영자의 확인이 필요한 경우 중단한다."""


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def public_ipv4(value: str) -> str:
    address = ipaddress.IPv4Address(value.strip())
    if not address.is_global:
        raise ValueError("not a public IPv4 address")
    return str(address)


class InstanceMetadata:
    """프록시·리다이렉트를 우회 경로로 허용하지 않고 EC2 IMDSv2만 조회한다."""

    def __init__(self):
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def _read(self, request: Request) -> str:
        with self.opener.open(request, timeout=3) as response:
            data = response.read(65537)
        if len(data) > 65536:
            raise SafetyError("IMDS response too large")
        return data.decode("ascii").strip()

    def public_ipv4s(self) -> FrozenSet[str]:
        # 기본 public-ipv4 하나만 비교하면 보조 ENI/EIP의 정상 인증서를 폐기할 수 있다.
        # 이 인스턴스의 모든 인터페이스에 할당된 공인 IPv4를 사용 중인 주소로 취급한다.
        base = "http://169.254.169.254/latest/"
        try:
            token = self._read(Request(
                base + "api/token", method="PUT",
                headers={"X-aws-ec2-metadata-token-ttl-seconds": "60"},
            ))
            if not token or len(token) > 4096 or any(c.isspace() for c in token):
                raise SafetyError("Invalid IMDSv2 token")

            def get(key):
                return self._read(Request(base + "meta-data/" + key,
                                          headers={"X-aws-ec2-metadata-token": token}))

            macs = get("network/interfaces/macs/").splitlines()
            if not macs or any(not re.fullmatch(r"(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}/", m)
                               for m in macs):
                raise SafetyError("Invalid IMDS network interface list")
            addresses = set()
            for mac in macs:
                try:
                    values = get("network/interfaces/macs/" + mac + "public-ipv4s")
                except HTTPError as error:
                    if error.code == 404:  # 해당 인터페이스에 공인 IPv4가 없는 정상적인 경우.
                        continue
                    raise
                if not values:
                    raise SafetyError("Empty IMDS public IPv4 response")
                addresses.update(public_ipv4(value) for value in values.splitlines())
            if not addresses:
                # IMDS 비활성화·설정 오류를 IP 반납으로 오판해 일괄 폐기하지 않는다.
                raise SafetyError("No public IPv4 found; refusing to infer loss of control")
            return frozenset(addresses)
        except SafetyError:
            raise
        except Exception as error:
            # 진단 메시지에 메타데이터 토큰이나 응답 본문을 노출하지 않는다.
            raise SafetyError("Cannot verify EC2 public IPv4 addresses via IMDSv2") from error


@dataclass(frozen=True)
class Certificate:
    """점검 시점의 leaf 인증서와 갱신 설정을 고정해 적용 직전에 변경 여부를 비교한다."""
    name: str
    lineage: Path
    leaf: Path
    digest: str
    address: Optional[str]
    expires: float
    account: str
    renewal: Path
    renewal_text: str


def run(command, timeout=15):
    return subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)


def inspect_certificate(root: Path, name: str) -> Certificate:
    """이름·실제 SAN·만료·발급 서버·기존 계정을 검사하며 파일은 변경하지 않는다."""
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", name) or name in (".", ".."):
        raise SafetyError("Invalid certificate name")
    lineage = root / "live" / name
    if lineage.is_symlink():
        raise SafetyError("Refusing a symlinked lineage directory: " + name)
    lineage.resolve(strict=True).relative_to(root)
    leaf = (lineage / "cert.pem").resolve(strict=True)
    leaf.relative_to(root)  # archive로 향하는 정상 링크도 config-dir 밖으로 벗어나면 거부한다.
    digest = hashlib.sha256(leaf.read_bytes()).hexdigest()
    result = run(["openssl", "x509", "-in", str(leaf), "-noout", "-ext", "subjectAltName"])
    if result.returncode or not result.stdout.startswith("X509v3 Subject Alternative Name:"):
        raise SafetyError("Cannot inspect certificate SAN: " + name)
    entries = result.stdout.partition("\n")[2].strip().split(",")
    # 하나라도 도메인·다른 IP가 섞이면 이 EC2의 주소만으로 인증서 전체를 판단할 수 없다.
    address = None
    if len(entries) == 1 and entries[0].strip().startswith("IP Address:"):
        try:
            address = public_ipv4(entries[0].strip()[len("IP Address:"):])
        except ValueError:
            pass  # 공인 IPv4 하나인 경우만 대상으로 삼고 나머지는 SKIP한다.
    result = run(["openssl", "x509", "-in", str(leaf), "-noout", "-enddate"])
    if result.returncode or not result.stdout.startswith("notAfter="):
        raise SafetyError("Cannot inspect certificate expiration: " + name)
    expires = ssl.cert_time_to_seconds(result.stdout.strip().split("=", 1)[1])
    config = configparser.RawConfigParser()
    renewal = root / "renewal" / (name + ".conf")
    renewal.resolve(strict=True).relative_to(root)
    if renewal.is_symlink():
        raise SafetyError("Refusing a symlinked renewal config: " + name)
    renewal_text = renewal.read_text(encoding="utf-8")
    # Certbot ConfigObj는 첫 섹션 앞에도 키를 둔다. 가상 섹션은 읽을 때만 붙인다.
    config.read_string("[certbot-root]\n" + renewal_text)
    if config.get("renewalparams", "server", fallback="") != ACME_SERVER:
        raise SafetyError("Only production Let's Encrypt lineages are supported: " + name)
    account = config.get("renewalparams", "account", fallback="")
    # 발급 계정으로 요청하므로 신규 계정 생성·이메일 입력·인증서 개인키 복사가 필요 없다.
    if not re.fullmatch(r"[a-fA-F0-9]{32,64}", account):
        raise SafetyError("Missing or invalid original Certbot account: " + name)
    return Certificate(name, lineage, leaf, digest, address, expires, account, renewal, renewal_text)


def marker_matches(path: Path, digest: str) -> bool:
    if path.is_symlink():
        raise SafetyError("Refusing a symlinked state file: " + path.name)
    return path.exists() and path.read_text(encoding="ascii").strip() == digest


def write_atomic(path: Path, text: str, mode=0o644):
    """동일 디렉토리의 임시 파일을 교체해 중간에 끊긴 상태 파일이 보이지 않게 한다."""
    if path.is_symlink():
        raise SafetyError("Refusing a symlinked state file: " + path.name)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n", dir=path.parent,
                                         prefix=".travel-ip-", delete=False) as output:
            temporary = Path(output.name)
            output.write(text)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def write_marker(path: Path, digest: str):
    write_atomic(path, digest + "\n")  # 공개 leaf 파일의 해시만 저장하며 개인키는 담지 않는다.


def disable_autorenew(certificate: Certificate):
    """주석·중첩 webroot_map을 보존하면서 renewalparams의 자동 갱신만 비활성화한다."""
    # 폐기 후 일괄 renew가 같은 lineage를 다시 발급하는 일을 방지한다.
    # 점검 뒤 다른 프로세스가 설정을 바꿨다면 덮어쓰지 않고 중단한다.
    if certificate.renewal.read_text(encoding="utf-8") != certificate.renewal_text:
        raise SafetyError("Renewal config changed during inspection: " + certificate.name)
    output = []
    in_parameters = False
    headers = 0
    for line in certificate.renewal_text.splitlines(keepends=True):
        if line.lstrip().startswith("["):
            in_parameters = line.strip() == "[renewalparams]"
            if in_parameters:
                headers += 1
                output.extend([line.rstrip("\r\n") + "\n", "autorenew = False\n"])
                continue
        if in_parameters and re.match(r"\s*autorenew\s*=", line):
            continue
        output.append(line)
    if headers != 1:
        raise SafetyError("Cannot safely update renewal parameters: " + certificate.name)
    write_atomic(certificate.renewal, "".join(output), mode=certificate.renewal.stat().st_mode & 0o777)


def revoke(root: Path, certificate: Certificate):
    # 갱신이 live 링크를 바꿔도 새 인증서가 폐기되지 않도록 점검한 공개 인증서를 복사한다.
    # 이 사본은 폐기 요청 대상 고정용이며 서비스용 인증서·개인키를 교체하지 않는다.
    pem = certificate.leaf.read_bytes()
    if hashlib.sha256(pem).hexdigest() != certificate.digest:
        raise SafetyError("Certificate changed before revocation: " + certificate.name)
    snapshots = root / ".travel-ip-revoke"
    if snapshots.is_symlink():
        raise SafetyError("Refusing a symlinked snapshot directory")
    snapshots.mkdir(exist_ok=True)
    snapshot = snapshots / (certificate.digest + ".pem")
    write_atomic(snapshot, pem.decode("ascii"))
    container_path = "/etc/letsencrypt/" + snapshot.relative_to(root).as_posix()
    result = run([
        "docker", "run", "--rm", "-v", str(root) + ":/etc/letsencrypt",
        "-v", "/var/lib/letsencrypt:/var/lib/letsencrypt",
        "-v", "/var/log/letsencrypt:/var/log/letsencrypt",
        CERTBOT_IMAGE, "revoke", "--cert-path", container_path,
        "--server", ACME_SERVER, "--account", certificate.account,
        # 운영 종료 사유로 폐기하며 원본을 보관한다. Nginx 반영·파일 정리는 별도 절차다.
        "--reason", "cessationofoperation", "--no-delete-after-revoke", "--non-interactive",
    ], timeout=180)
    if result.returncode:
        # CA 처리 후 응답만 유실됐을 수 있다. CA의 명시적인 alreadyRevoked만 성공 취급한다.
        # 일반 오류·타임아웃은 성공으로 간주하지 않아 차단 상태에서 재시도하게 한다.
        if "urn:ietf:params:acme:error:alreadyRevoked" not in result.stdout + result.stderr:
            raise SafetyError("Revocation failed or was not confirmed for " + certificate.name +
                              "; disabled marker retained. Inspect Certbot logs and retry.")


def reconcile(root: Path, names, metadata, apply=False, retire_current=False):
    """전체 대상 점검 → IP 비교 → 차단·갱신 중단 → CA 요청 → 성공 기록 순서로 처리한다."""
    # 잘못 지정한 뒤쪽 대상 때문에 앞쪽 인증서부터 폐기되는 일을 줄이도록 먼저 모두 읽는다.
    certificates = [inspect_certificate(root, name) for name in dict.fromkeys(names)]
    addresses = metadata.public_ipv4s()
    print("EC2 public IPv4 addresses: " + ", ".join(sorted(addresses)))
    for certificate in certificates:
        label = certificate.name
        disabled = certificate.lineage / DISABLED_MARKER
        confirmed = certificate.lineage / REVOKED_MARKER
        if certificate.address is None:
            print("SKIP " + label + ": not a single public IPv4-only certificate")
            continue
        if marker_matches(confirmed, certificate.digest):
            # 성공 기록이 있으면 원격 요청을 반복하지 않고 진입점용 차단 표시만 복구한다.
            if apply:
                write_marker(disabled, certificate.digest)
            print("SKIP " + label + ": revocation already recorded")
            continue
        if certificate.expires <= time.time():
            print("SKIP " + label + ": already expired")
            continue
        if certificate.address in addresses and not retire_current:
            # Stop/EIP 반납 전 현재 인증서를 폐기하려면 별도 옵션을 명시해야 한다.
            print("KEEP " + label + ": IPv4 is still assigned to this instance")
            continue
        if not apply:
            print("WOULD REVOKE " + label + " (" + certificate.address + "); no changes made")
            continue
        # 외부 작업으로 ENI/EIP나 인증서가 교체됐으면 오래된 판단으로 계속 진행하지 않는다.
        if metadata.public_ipv4s() != addresses:
            raise SafetyError("EC2 IP assignments changed during inspection; no further actions")
        if hashlib.sha256((certificate.lineage / "cert.pem").read_bytes()).hexdigest() != certificate.digest:
            raise SafetyError("Certificate changed during inspection: " + label)
        # CA 호출 전에 차단 의도를 보존한다. 이후 실패해도 이를 지우거나 갱신을 다시 켜지 않는다.
        # 실행 중인 Nginx의 인증서는 즉시 바뀌지 않으며 새 진입점으로 재시작해야 제외된다.
        write_marker(disabled, certificate.digest)
        disable_autorenew(certificate)
        revoke(root, certificate)
        write_marker(confirmed, certificate.digest)
        print("REVOKED " + label + "; restart the updated frontend to stop serving this certificate")


@contextmanager
def apply_lock(root: Path):
    # 이 도구끼리 중복 적용을 막는다. 별도 Certbot 프로세스 전체를 잠그는 것은 아니다.
    import fcntl  # EC2 Linux 적용 시에만 필요하며 기본 점검·테스트에서는 사용하지 않는다.
    with (root / ".travel-ip-revoke.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SafetyError("Another revocation process is running") from error
        yield


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cert-name", action="append", required=True,
                        help="Explicit Certbot lineage name; repeat to inspect multiple lineages")
    parser.add_argument("--config-dir", type=Path, default=Path("/etc/letsencrypt"))
    parser.add_argument("--apply", action="store_true", help="Send revocation requests (default: inspect only)")
    parser.add_argument("--retire-current-ip", action="store_true",
                        help="Also retire selected certificates still assigned here, e.g. before Stop/release")
    args = parser.parse_args(argv)
    try:
        root = args.config_dir.resolve(strict=True)
        if args.apply:
            if sys.platform != "linux" or os.geteuid() != 0:
                raise SafetyError("--apply requires root on the EC2 Linux host")
            with apply_lock(root):
                reconcile(root, args.cert_name, InstanceMetadata(), True, args.retire_current_ip)
        else:
            reconcile(root, args.cert_name, InstanceMetadata(), False, args.retire_current_ip)
    except (SafetyError, OSError, ValueError, configparser.Error, subprocess.SubprocessError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())

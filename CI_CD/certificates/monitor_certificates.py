#!/usr/bin/env python3
"""EC2 전용 인증서를 자동 탐색하고 사용 종료가 반복 확인되면 CA에 폐기를 요청한다.

기본 실행은 읽기 전용이다. --apply에서만 관측 상태, 갱신 차단, Nginx 재시작,
Certbot revoke를 수행한다. root로 EC2 호스트에서 실행하며 systemd timer로 호출한다.
"""
import argparse
import configparser
from dataclasses import dataclass
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.parse import urlsplit

from certificate_dns import DNSResolver, domain_name
import revoke_ip_certificates as certbot


STATE_FILE = ".travel-certificate-monitor.json"


@dataclass(frozen=True)
class Policy:
    config_dir: Path
    identity_env: Path
    frontend_container: str = "travel-frontend"
    confirmations: int = 3
    grace_seconds: int = 900
    max_sample_gap_seconds: int = 900
    direct_dns: bool = True

    @classmethod
    def load(cls, path):
        data = json.loads(path.read_text(encoding="utf-8"))
        allowed = set(cls.__dataclass_fields__)
        if not isinstance(data, dict) or set(data) - allowed:
            raise certbot.SafetyError("Unknown monitor configuration fields")
        for key in ("config_dir", "identity_env"):
            if not isinstance(data.get(key), str) or not Path(data[key]).is_absolute():
                raise certbot.SafetyError(key + " must be an absolute path")
            data[key] = Path(data[key]).resolve(strict=True)
        value = cls(**data)
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,127}", value.frontend_container):
            raise certbot.SafetyError("Invalid frontend container name")
        for key, minimum, maximum in (("confirmations", 2, 100), ("grace_seconds", 300, 604800),
                                      ("max_sample_gap_seconds", 300, 604800)):
            number = getattr(value, key)
            if type(number) is not int or not minimum <= number <= maximum:
                raise certbot.SafetyError("Invalid monitor setting: " + key)
        if type(value.direct_dns) is not bool:
            raise certbot.SafetyError("direct_dns must be true or false")
        return value


def current_domain(path):
    """FRONTEND_URL만 파싱한다. .env를 shell로 실행하거나 다른 비밀값을 출력하지 않는다."""
    selected = None
    text = path.read_text(encoding="utf-8-sig")
    for line in text.splitlines():
        match = re.match(r"^\s*(?:export\s+)?FRONTEND_URL\s*=\s*(.*)$", line)
        if not match:
            continue
        value = match[1].strip()
        if value.startswith(("'", '"')):
            quoted = re.fullmatch(r"(['\"])(.*?)\1\s*(?:#.*)?", value)
            if not quoted:
                raise certbot.SafetyError("Invalid quoted FRONTEND_URL")
            value = quoted[2]
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].strip()
        selected = value  # dotenv와 마찬가지로 마지막 항목을 사용한다.
    if not selected:
        raise certbot.SafetyError("FRONTEND_URL is missing; no retirement decisions made")
    try:
        parsed = urlsplit(selected)
        if (parsed.scheme != "https" or parsed.username or parsed.password or
                parsed.path not in ("", "/") or parsed.query or parsed.fragment or
                not parsed.hostname or (parsed.port is not None and not 1 <= parsed.port <= 65535)):
            raise ValueError("Not an HTTPS origin")
        return domain_name(parsed.hostname)
    except (ValueError, certbot.SafetyError) as error:
        raise certbot.SafetyError("FRONTEND_URL must be an HTTPS DNS origin, e.g. https://roadfriendtrip.freeddns.org") from error


def discover(root):
    """이 호스트의 live/를 자동 탐색한다. 단일 DNS 또는 공인 IPv4 인증서만 관리한다."""
    values, errors = [], []
    live = root / "live"
    if not live.is_dir():
        raise certbot.SafetyError("Certbot live directory is missing")
    for directory in sorted(live.iterdir()):
        if directory.name.startswith(".") or not directory.is_dir():
            continue
        try:
            certificate = certbot.inspect_certificate(root, directory.name)
            if certificate.address is None and certificate.domain is None:
                print("SKIP " + directory.name + ": not a single supported DNS/IPv4 certificate")
            else:
                values.append(certificate)
        except (certbot.SafetyError, OSError, ValueError, configparser.Error) as error:
            # 다른 CA/손상된 lineage는 건드리지 않는다. 오류는 운영 로그에 남긴다.
            errors.append("DEFER " + directory.name + ": " + str(error))
    return values, errors


def load_state(root):
    path = root / STATE_FILE
    if path.is_symlink():
        raise certbot.SafetyError("Refusing a symlinked monitor state")
    if not path.exists():
        return {"version": 1, "pending": {}, "synced": {}}
    if path.stat().st_size > 1048576:
        raise certbot.SafetyError("Monitor state is too large")
    value = json.loads(path.read_text(encoding="utf-8"))
    if (not isinstance(value, dict) or value.get("version") != 1 or
            not isinstance(value.get("pending"), dict) or not isinstance(value.get("synced"), dict)):
        raise certbot.SafetyError("Invalid monitor state; refusing to infer prior confirmations")
    return value


def save_state(root, state):
    certbot.write_atomic(root / STATE_FILE, json.dumps(state, sort_keys=True) + "\n", mode=0o600)


def decision(certificate, domain, addresses, dns, direct_dns):
    """DNS 매핑은 소유권 증명이 아니다. 현재 EC2에 직접 연결하는 배포 정책을 검사한다."""
    if certificate.address is not None:
        return (None, 0, "") if certificate.address in addresses else ("IP_RELEASED", 0, certificate.address)
    if dns.has_ipv6:
        raise certbot.SafetyError("IPv6 DNS requires separate instance IPv6 validation")
    if certificate.domain != domain:
        # 설정 오타로 사용 중인 인증서를 폐기하지 않도록 새 도메인의 연결을 먼저 확인한다.
        if not (dns.addresses & addresses):
            raise certbot.SafetyError("New FRONTEND_URL is not verified against this EC2")
        return ("DOMAIN_RETIRED", dns.ttl, domain)
    if dns.addresses & addresses:
        # IP가 바뀌어도 같은 도메인이 새 IP로 정상 연결되면 DNS 인증서는 유지한다.
        return (None, 0, "")
    if not direct_dns:
        raise certbot.SafetyError("DNS mismatch requires review when direct_dns is disabled")
    return ("DNS_NO_ADDRESS" if not dns.addresses else "DNS_POINTS_ELSEWHERE",
            dns.ttl, ",".join(sorted(dns.addresses)))


def inspect_use(certificate, domain, addresses, resolver, cache, direct_dns):
    if certificate.address is not None:
        return decision(certificate, domain, addresses, None, direct_dns)

    def lookup(name):
        if name not in cache:
            try:
                cache[name] = resolver.lookup(name)
            except certbot.SafetyError as error:
                cache[name] = error
        value = cache[name]
        if isinstance(value, certbot.SafetyError):
            raise value
        return value

    # 보유 DNS 인증서마다 실제 SAN 이름을 조회한다. 현재 도메인과 같으면 캐시를 공유한다.
    issued_dns = lookup(certificate.domain)
    if issued_dns.has_ipv6:
        raise certbot.SafetyError("Certificate domain has unverified IPv6 DNS")
    reason, ttl, detail = decision(certificate, domain, addresses, lookup(domain), direct_dns)
    if certificate.domain != domain:
        detail += ";previous_dns=" + ",".join(sorted(issued_dns.addresses))
        ttl = max(ttl, issued_dns.ttl)
    return reason, ttl, detail


def confirmed_observation(state, certificate, reason, detail, domain, addresses, ttl, policy, now):
    fingerprint = hashlib.sha256(json.dumps(
        [certificate.digest, reason, detail, domain, sorted(addresses)], sort_keys=True).encode()).hexdigest()
    previous = state["pending"].get(certificate.name, {})
    valid = (isinstance(previous, dict) and previous.get("fingerprint") == fingerprint and
             type(previous.get("last")) in (int, float) and
             type(previous.get("first")) in (int, float) and
             type(previous.get("count")) is int and
             type(previous.get("wait")) is int and
             0 <= now - previous["last"] <= policy.max_sample_gap_seconds and
             previous["first"] <= previous["last"] <= now)
    if not valid:
        previous = {"fingerprint": fingerprint, "first": now, "count": 0, "wait": policy.grace_seconds}
    previous.update(last=now, count=previous["count"] + 1,
                    wait=max(previous["wait"], policy.grace_seconds, ttl))
    state["pending"][certificate.name] = previous
    return previous["count"] >= policy.confirmations and now - previous["first"] >= previous["wait"]


def frontend_supports_markers(container):
    result = certbot.run(["docker", "exec", container, "sh", "-c",
                          'grep -Fq ".travel-ip-disabled.sha256" /docker-entrypoint.sh && '
                          'grep -Fq "LEAF_HASH" /docker-entrypoint.sh'])
    if result.returncode:
        raise certbot.SafetyError("Frontend must use the entrypoint that excludes disabled certificate leaves")


def sync_frontend(policy, certificates, state):
    blocked = [cert for cert in certificates
               if certbot.marker_matches(cert.lineage / certbot.DISABLED_MARKER, cert.digest)]
    changed = [cert for cert in blocked if state["synced"].get(cert.name) != cert.digest]
    if not changed:
        return
    frontend_supports_markers(policy.frontend_container)
    result = certbot.run(["docker", "restart", "--time", "10", policy.frontend_container], timeout=60)
    if result.returncode:
        raise certbot.SafetyError("Frontend restart failed; disabled markers retained for retry")
    result = certbot.run(["docker", "exec", policy.frontend_container, "nginx", "-t"], timeout=15)
    if result.returncode:
        raise certbot.SafetyError("Frontend did not start with a valid Nginx configuration")
    for cert in blocked:
        state["synced"][cert.name] = cert.digest
    save_state(policy.config_dir, state)
    print("FRONTEND refreshed; disabled certificate leaves are excluded")


def monitor(policy, metadata, resolver, apply=False, now=None):
    root = policy.config_dir
    state = load_state(root)
    errors = []
    frontend_failed = False
    try:
        domain = current_domain(policy.identity_env)
        addresses = metadata.public_ipv4s()
        if not addresses:
            raise certbot.SafetyError("No public IPv4 assignments; retirement decisions deferred")
    except (certbot.SafetyError, OSError):
        if apply:
            state["pending"] = {}  # 불확실한 관측은 연속 확인으로 세지 않는다.
            save_state(root, state)
        raise
    certificates, discovered_errors = discover(root)
    errors.extend(discovered_errors)
    timestamp = time.time() if now is None else now
    dns_cache = {}
    print("EC2 IPv4: " + ", ".join(sorted(addresses)) + "; current domain: " + domain)

    active_names = {cert.name for cert in certificates}
    state["pending"] = {key: value for key, value in state["pending"].items() if key in active_names}
    state["synced"] = {key: value for key, value in state["synced"].items() if key in active_names}
    for certificate in certificates:
        name = certificate.name
        disabled = certificate.lineage / certbot.DISABLED_MARKER
        revoked = certificate.lineage / certbot.REVOKED_MARKER
        try:
            if certbot.marker_matches(revoked, certificate.digest):
                if apply:
                    if not certbot.marker_matches(disabled, certificate.digest):
                        # 차단 표시가 외부에서 제거된 동안 Nginx가 재시작됐을 수도 있다.
                        state["synced"].pop(name, None)
                    certbot.write_marker(disabled, certificate.digest)
                state["pending"].pop(name, None)
                print("SKIP " + name + ": revocation already confirmed")
                continue
            if certificate.expires <= timestamp:
                state["pending"].pop(name, None)
                print("SKIP " + name + ": already expired")
                continue
            # 폐기를 시작한 leaf는 DNS가 복구돼도 재사용하지 않고 요청을 재시도한다.
            retry = certbot.marker_matches(disabled, certificate.digest)
            if retry:
                reason, ttl, detail = "RETRY_PENDING_REVOCATION", 0, ""
            else:
                reason, ttl, detail = inspect_use(certificate, domain, addresses, resolver,
                                                   dns_cache, policy.direct_dns)
            if reason is None:
                state["pending"].pop(name, None)
                print("KEEP " + name)
                continue
            ready = retry or confirmed_observation(state, certificate, reason, detail, domain,
                                                   addresses, ttl, policy, timestamp)
            print(("READY " if ready else "PENDING ") + name + ": " + reason)
            if not apply:
                continue  # 기본 점검은 관측 파일도 쓰지 않는다.
            save_state(root, state)
            if not ready:
                continue

            # CA 요청 직전에 IP·도메인·DNS·leaf·renewal을 다시 읽어 오래된 판단을 거부한다.
            frontend_supports_markers(policy.frontend_container)
            if current_domain(policy.identity_env) != domain:
                raise certbot.SafetyError("Service domain changed during inspection")
            if metadata.public_ipv4s() != addresses:
                raise certbot.SafetyError("EC2 IP assignments changed during inspection")
            if not retry and certificate.domain is not None:
                fresh_reason, _, fresh_detail = inspect_use(certificate, domain, addresses, resolver,
                                                            {}, policy.direct_dns)
                if (fresh_reason, fresh_detail) != (reason, detail):
                    raise certbot.SafetyError("DNS mapping changed before revocation")
            # 느린 외부 조회가 모두 끝난 뒤 실제 leaf와 갱신 설정을 마지막으로 다시 비교한다.
            fresh = certbot.inspect_certificate(root, name)
            if (fresh != certificate or
                    hashlib.sha256((fresh.lineage / "cert.pem").read_bytes()).hexdigest() != fresh.digest):
                raise certbot.SafetyError("Certificate changed during inspection")
            certbot.write_marker(disabled, certificate.digest)
            try:
                certbot.disable_autorenew(certificate)
            finally:
                # 갱신 설정 변경이나 CA 요청이 실패해도 실행 중인 Nginx의 재사용을 막는다.
                try:
                    if not frontend_failed:
                        sync_frontend(policy, certificates, state)
                except (certbot.SafetyError, OSError, subprocess.SubprocessError) as error:
                    frontend_failed = True
                    errors.append("FRONTEND: " + str(error))
            certbot.revoke(root, certificate)
            certbot.write_marker(revoked, certificate.digest)
            state["pending"].pop(name, None)
            save_state(root, state)
            print("REVOKED " + name + ": confirmed by Lets Encrypt")
        except (certbot.SafetyError, OSError, ValueError, configparser.Error, subprocess.SubprocessError) as error:
            # DNS 실패·관측 변경은 연속 확인을 끊는다. 이미 만든 차단 표시는 유지한다.
            state["pending"].pop(name, None)
            errors.append("DEFER " + name + ": " + str(error))
    if apply:
        save_state(root, state)
        if not frontend_failed:
            try:
                sync_frontend(policy, certificates, state)
            except (certbot.SafetyError, OSError, subprocess.SubprocessError) as error:
                errors.append("FRONTEND: " + str(error))
    for error in errors:
        print(error, file=sys.stderr)
    return 1 if errors else 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, default=Path("/etc/travel-certificates/monitor.json"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args(argv)
    try:
        policy = Policy.load(args.config)
        if args.apply:
            if sys.platform != "linux" or os.geteuid() != 0:
                raise certbot.SafetyError("--apply requires root on the EC2 Linux host")
            # 수동 IP 폐기 도구와 같은 잠금을 사용해 중복 CA 요청을 방지한다.
            with certbot.apply_lock(policy.config_dir):
                return monitor(policy, certbot.InstanceMetadata(), DNSResolver(), True)
        return monitor(policy, certbot.InstanceMetadata(), DNSResolver())
    except (certbot.SafetyError, OSError, ValueError, TypeError, configparser.Error, subprocess.SubprocessError) as error:
        print("ERROR: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

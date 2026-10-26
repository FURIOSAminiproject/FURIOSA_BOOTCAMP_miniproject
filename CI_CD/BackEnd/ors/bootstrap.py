"""새 서버의 ORS 원본과 배포 설정을 최초 한 번 자동 준비한다.

deploy.sh는 먼저 --field로 저장소 경로만 조회하고, 해당 저장소의 flock을 잡은 뒤
실제 초기화를 호출한다. 이 모듈 자체는 배포 잠금을 획득하거나 컨테이너를 실행하지 않는다.
기존 설정은 그대로 재사용하며, 설정이 없을 때만 다운로드 → 검증 → 원본 보관 → JSON 생성 순서로
진행한다. 실패한 다운로드는 임시 파일만 정리하고 기존 원본·설정은 덮어쓰지 않는다.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.parse import urlsplit
import urllib.request

from prepare import ROOT, digest, external_path, load_config

# 지역·검증 좌표·포트는 저장소에서 관리하고 서버별 절대 경로는 실행 시 결정한다.
# 따라서 새 EC2에서도 예시 JSON의 경로나 체크섬을 사람이 치환할 필요가 없다.
SETTINGS = ROOT / "Docker/ors/bootstrap.json"
# 잘못된 URL/응답이 디스크를 계속 채우거나 배포를 장시간 점유하지 않도록 상한을 둔다.
MAX_BYTES = 2 * 1024 * 1024 * 1024
DOWNLOAD_SECONDS = 900


def select_root(config_path: Path, fallback: Path) -> Path:
    """기존 설정의 저장소를 우선하고 다운로드 없이 잠금 위치를 결정한다."""
    config_path = external_path(str(config_path), "config")
    if config_path.exists():
        # 설정이 존재하면 환경변수의 새 기본값보다 기존 저장소를 우선한다.
        # 잘못된 기존 JSON도 여기서 실패시키며 새 기본 설정으로 대체하지 않는다.
        return load_config(config_path)["data_root"]
    return external_path(str(fallback), "data_root")


def fetch(url: str):
    """검증 가능한 TLS로 요청하고 최종 응답도 공식 HTTPS 원본인지 확인한다."""
    request = urllib.request.Request(url, headers={"User-Agent": "Roadfriend-ORS-bootstrap/1.0"})
    response = urllib.request.urlopen(request, timeout=30)
    # Geofabrik의 latest URL은 날짜가 붙은 파일로 리다이렉트될 수 있다.
    # urllib이 리다이렉트를 처리한 뒤 최종 URL의 호스트와 프로토콜을 검사한다.
    final = urlsplit(response.geturl())
    if final.scheme != "https" or final.hostname != "download.geofabrik.de":
        response.close()
        raise ValueError("OSM download redirected outside the HTTPS source")
    return response


def checksum(url: str) -> str:
    """배포처의 작은 MD5 sidecar를 읽고 해시 문자열만 추출한다."""
    with fetch(url + ".md5") as response:
        text = response.read(4097).decode("ascii").strip()
    # sidecar의 파일명은 셸 명령이나 로컬 경로로 사용하지 않는다.
    # 크기/형식이 다른 HTML 오류 페이지 등을 체크섬으로 받아들이지 않는다.
    if len(text) > 4096 or not re.fullmatch(r"[0-9a-fA-F]{32}(?:\s+\*?[^\r\n]+)?", text):
        raise ValueError("invalid source checksum metadata")
    return text.split()[0].lower()


def download(url: str, target: Path) -> tuple[str, str]:
    """HTTPS·배포처 MD5로 전송을 검사하고 저장본의 SHA-256도 계산한다."""
    expected = checksum(url)
    # MD5는 배포처가 제공하는 전송 손상 검사용 값이다. 별도 전자서명 인증이 아니다.
    # SHA-256은 다운로드 후의 원본 식별 및 이후 배포 시 무결성 재검사에 사용한다.
    md5 = hashlib.md5(usedforsecurity=False)
    sha = hashlib.sha256()
    size = 0
    # 시스템 시각 보정과 무관하게 경과 시간을 계산한다. 개별 네트워크 읽기는
    # fetch의 30초 타임아웃을 따르며, 루프는 각 읽기 전에 전체 기한을 검사한다.
    deadline = time.monotonic() + DOWNLOAD_SECONDS
    with fetch(url) as response, target.open("xb") as stream:
        content_length = response.headers.get("Content-Length")
        if content_length and not 0 < int(content_length) <= MAX_BYTES:
            raise ValueError("OSM source exceeds the bootstrap size limit")
        # HTTP 파일 수정 시각이며 OSM 내부의 데이터 기준 시각을 파싱한 값은 아니다.
        modified = response.headers.get("Last-Modified", "")
        while True:
            if time.monotonic() >= deadline:
                raise ValueError("OSM download deadline exceeded")
            # read(n)이 느린 연결에서 n바이트를 모으느라 기한 검사를 지연하지 않도록 한다.
            chunk = response.read1(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            # Content-Length가 없는 응답에도 실제 수신량 상한을 적용한다.
            if size > MAX_BYTES:
                raise ValueError("OSM source exceeds the bootstrap size limit")
            stream.write(chunk)
            md5.update(chunk)
            sha.update(chunk)
    if not size or (content_length and size != int(content_length)):
        raise ValueError("OSM download is empty or incomplete")
    # latest가 다운로드 도중 갱신되면 앞서 받은 sidecar와 본문이 달라질 수 있다.
    # 전송 후 sidecar도 다시 확인하고, 달라졌으면 잘못된 버전을 게시하지 않고 실패시킨다.
    if md5.hexdigest() != expected or checksum(url) != expected:
        raise ValueError("OSM source checksum changed or download is damaged; retry deployment")
    return sha.hexdigest(), modified


def create_config(path: Path, data: dict) -> None:
    """완성된 파일을 배타적으로 공개한다. 동시 생성된 기존 설정은 덮어쓰지 않는다."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            json.dump(data, stream, indent=2)
            stream.write("\n")
        # 같은 파일시스템에서 완성된 파일의 이름만 추가한다. os.replace와 달리
        # 대상이 이미 있으면 FileExistsError가 나므로 동시 생성된 설정을 보존한다.
        os.link(temporary, path)
    finally:
        os.unlink(temporary)


def bootstrap(config_path: Path, data_root: Path, settings_path: Path = SETTINGS) -> None:
    config_path = external_path(str(config_path), "config")
    data_root = external_path(str(data_root), "data_root")
    if config_path.exists():
        # --field 조회와 flock 획득 사이에 JSON이 바뀌었을 수 있다.
        # 잠그지 않은 다른 저장소로 넘어가지 않도록 같은 data_root인지 재확인한다.
        if load_config(config_path)["data_root"] != data_root:
            raise ValueError("deployment data_root changed after locking; retry deployment")
        print("ORS bootstrap: existing deployment config reused; no download")
        return
    settings = json.loads(settings_path.read_text(encoding="utf-8"))
    url = settings["dataset_url"]
    parsed = urlsplit(url)
    # 저장소에서 수정한 정책도 공식 HTTPS PBF 원본으로 제한한다.
    # 임의 호스트·인증 정보·쿼리를 다운로드 입력으로 사용하지 않는다.
    if (parsed.scheme != "https" or parsed.netloc != "download.geofabrik.de"
            or not parsed.path.endswith(".osm.pbf") or parsed.query or parsed.fragment):
        raise ValueError("bootstrap source must be an HTTPS Geofabrik .osm.pbf URL")
    data_root.mkdir(parents=True, exist_ok=True)
    # TemporaryDirectory는 검증된 전용 저장소 안에서 이 호출이 만든 파일만 정리한다.
    with tempfile.TemporaryDirectory(prefix="bootstrap-", dir=data_root) as temporary:
        working = Path(temporary)
        # 좌표/포트 오류를 큰 파일 다운로드 전에 공통 load_config로 검사한다.
        # 0으로 채운 SHA-256은 형식 검사에만 쓰는 임시 값이며 최종 설정에는 저장하지 않는다.
        config = {
            "data_root": data_root.as_posix(),
            "dataset_path": (working / "input.osm.pbf").as_posix(),
            "dataset_sha256": "0" * 64,
            "probe_coordinates": settings["probe_coordinates"],
            "http_port": settings["http_port"],
        }
        candidate = working / "deployment.json"
        candidate.write_text(json.dumps(config), encoding="utf-8")
        load_config(candidate)
        print("ORS bootstrap: downloading the initial OSM snapshot", flush=True)
        sha, modified = download(url, working / "input.osm.pbf")
        source = data_root / "sources" / f"{sha}.osm.pbf"
        source.parent.mkdir(parents=True, exist_ok=True)
        try:
            # 원본 파일명에 latest 대신 내용 해시를 사용해 어떤 바이트를 받았는지 고정한다.
            # 같은 저장소 안의 hard link이므로 추가 대용량 복사 없이 완성본만 공개한다.
            os.link(working / "input.osm.pbf", source)
        except FileExistsError:
            if digest(source) != sha:
                raise ValueError("stored bootstrap source is damaged; refusing to overwrite it")
        # downloaded_at은 우리 서버의 수신 완료 시각이다. 원본 지도 갱신 시각과 구분한다.
        # 출처와 시각은 추적용 메타데이터이며 이후 무결성 판정은 SHA-256을 사용한다.
        config.update(
            dataset_path=source.as_posix(), dataset_sha256=sha,
            dataset_source_url=url, source_last_modified=modified,
            downloaded_at=datetime.now(timezone.utc).isoformat(),
        )
        create_config(config_path, config)
    print("ORS bootstrap: verified OSM source and deployment config created")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--field", choices=["data_root"])
    args = parser.parse_args()
    if args.field:
        # deploy.sh가 명령 치환으로 받으므로 경로 한 줄만 출력하고 파일을 만들지 않는다.
        print(select_root(args.config, args.data_root).as_posix())
    else:
        bootstrap(args.config, args.data_root)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"ORS bootstrap failed: {error}", file=sys.stderr)
        sys.exit(1)

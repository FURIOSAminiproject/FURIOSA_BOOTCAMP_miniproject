"""검증된 OSM 파일과 이미지·설정별 경로망 폴더를 체크아웃 밖에 준비한다."""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
IMAGE = "openrouteservice/openrouteservice:v10.0.1@sha256:b2f66b5e33949e86a279f3de654ef99e2964eb9112d16fb52788c6bb63ff941c"


def digest(path: Path) -> str:
    """파일을 메모리에 전부 올리지 않고 SHA-256을 계산한다."""
    result = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            result.update(chunk)
    return result.hexdigest()


def load_config(path: Path) -> dict:
    """배포 JSON의 경로·체크섬·자동차/도보 공통 검증 좌표를 검사한다."""
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("deployment config must be an object")
    for key in ("data_root", "dataset_path"):
        value = data.get(key)
        if not isinstance(value, str) or not Path(value).is_absolute():
            raise ValueError(f"{key} must be an absolute path")
        if any(char in value for char in "\r\n$#\"'"):
            raise ValueError(f"{key} contains unsupported characters")
        data[key] = Path(value).resolve()
    for key in ("data_root", "dataset_path"):
        if data[key] == ROOT or ROOT in data[key].parents:
            raise ValueError(f"{key} must be outside the repository checkout")
    if not re.fullmatch(r"[0-9a-f]{64}", str(data.get("dataset_sha256", ""))):
        raise ValueError("dataset_sha256 must be 64 lowercase hexadecimal characters")
    port = data.setdefault("http_port", 8082)
    if type(port) is not int or not 1024 <= port <= 65535:
        raise ValueError("http_port must be an integer from 1024 to 65535")
    points = data.get("probe_coordinates")
    if not isinstance(points, list) or len(points) != 2:
        raise ValueError("probe_coordinates must contain two [longitude,latitude] pairs")
    for point in points:
        if not isinstance(point, list) or len(point) != 2:
            raise ValueError("invalid probe coordinate pair")
        if any(type(n) not in (int, float) or not math.isfinite(n) for n in point):
            raise ValueError("probe coordinates must be finite numbers")
        if not -180 <= point[0] <= 180 or not -90 <= point[1] <= 90:
            raise ValueError("probe coordinate out of range")
    if points[0] == points[1]:
        raise ValueError("probe coordinates must be different")
    return data


def atomic_write(path: Path, text: str) -> None:
    """같은 디렉토리의 임시 파일에서 완성한 뒤 원자적으로 바꾼다."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(text)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def prepare(config: dict, env_out: Path) -> dict:
    """입력 파일 복사본도 검증하며 다른 원본·이미지·설정의 경로망을 분리한다."""
    source = config["dataset_path"]
    expected = config["dataset_sha256"]
    if not source.is_file() or not source.stat().st_size or digest(source) != expected:
        raise ValueError("OSM file missing, empty or SHA-256 mismatch; service was not changed")
    config_text = (ROOT / "Docker/ors/ors-config.yml").read_bytes()
    config_sha = hashlib.sha256(config_text).hexdigest()
    release = hashlib.sha256(f"{expected}:{IMAGE}:{config_sha}".encode()).hexdigest()[:24]
    root = config["data_root"]
    snapshot = root / "datasets" / expected / "input.osm.pbf"
    snapshot.parent.mkdir(parents=True, exist_ok=True)
    if snapshot.exists():
        if digest(snapshot) != expected:
            raise ValueError("stored OSM snapshot is damaged; refusing to overwrite it")
    else:
        fd, temporary = tempfile.mkstemp(dir=snapshot.parent)
        os.close(fd)
        try:
            shutil.copyfile(source, temporary)
            if digest(Path(temporary)) != expected:
                raise ValueError("OSM file changed during copying")
            os.replace(temporary, snapshot)
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
    graphs = root / "releases" / release / "graphs"
    graphs.mkdir(parents=True, exist_ok=True)
    ors_config = graphs.parent / "ors-config.yml"
    if ors_config.exists() and digest(ors_config) != config_sha:
        raise ValueError("stored ORS configuration is damaged; refusing to overwrite it")
    if not ors_config.exists():
        atomic_write(ors_config, config_text.decode("utf-8"))
    manifest = {
        "release_id": release, "dataset_sha256": expected,
        "config_sha256": config_sha, "image": IMAGE,
        "profiles": ["driving-car", "foot-walking"],
    }
    atomic_write(graphs.parent / "manifest.json", json.dumps(manifest, indent=2) + "\n")
    atomic_write(env_out, f"ORS_CONFIG_FILE={ors_config.as_posix()}\nORS_OSM_FILE={snapshot.as_posix()}\nORS_GRAPHS_DIR={graphs.as_posix()}\nORS_HTTP_PORT={config['http_port']}\n")
    return manifest


def activate(config: dict, env_out: Path) -> dict:
    """새 준비 작업 없이 실제 검증했던 릴리스의 성공 기록만 남긴다."""
    fields = dict(line.split("=", 1) for line in env_out.read_text(encoding="utf-8").splitlines())
    graphs = Path(fields["ORS_GRAPHS_DIR"]).resolve()
    root = config["data_root"]
    if graphs.parent.parent != root / "releases" or not re.fullmatch(r"[0-9a-f]{24}", graphs.parent.name):
        raise ValueError("prepared release path does not match deployment storage")
    manifest = json.loads((graphs.parent / "manifest.json").read_text(encoding="utf-8"))
    if (manifest["release_id"] != graphs.parent.name or manifest["image"] != IMAGE
            or manifest["dataset_sha256"] != config["dataset_sha256"]
            or digest(graphs.parent / "ors-config.yml") != manifest["config_sha256"]
            or digest(Path(fields["ORS_OSM_FILE"])) != config["dataset_sha256"]):
        raise ValueError("prepared release changed during deployment")
    atomic_write(root / "last-successful.json", json.dumps(manifest, indent=2) + "\n")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--field", choices=["data_root", "http_port"])
    parser.add_argument("--env-out", type=Path)
    parser.add_argument("--config-out", type=Path)
    parser.add_argument("--activate", action="store_true")
    args = parser.parse_args()
    config = load_config(args.config)
    if args.field:
        value = config[args.field]
        print(value.as_posix() if isinstance(value, Path) else value)
        return
    if not args.env_out:
        parser.error("--env-out is required")
    manifest = activate(config, args.env_out) if args.activate else prepare(config, args.env_out)
    if args.config_out:
        frozen = {key: value.as_posix() if isinstance(value, Path) else value for key, value in config.items()}
        fields = dict(line.split("=", 1) for line in args.env_out.read_text(encoding="utf-8").splitlines())
        frozen["dataset_path"] = fields["ORS_OSM_FILE"]
        atomic_write(args.config_out, json.dumps(frozen, indent=2) + "\n")
    print(f"ORS {'activated' if args.activate else 'prepared'}: {manifest['release_id']}")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, TypeError) as error:
        print(f"ORS preparation failed: {error}", file=sys.stderr)
        sys.exit(1)

#!/usr/bin/env bash
# 고정된 작은 OSM 자료로 공식 ORS 이미지의 네 가지 경로 요청을 검증한다.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$PROJECT_ROOT"
WORK_DIR="$(mktemp -d "${RUNNER_TEMP:-${TMPDIR:-/tmp}}/roadfriend-ors-ci.XXXXXX")"
COMPOSE_ENV="$WORK_DIR/compose.env"
CONFIG="$WORK_DIR/deployment.json"
export ORS_CI_WORK_DIR="$WORK_DIR"

for script in build.sh deploy.sh; do
    bash -n "$PROJECT_ROOT/CI_CD/BackEnd/ors/$script"
done
python3 -B -m unittest discover -s "$PROJECT_ROOT/CI_CD/BackEnd/ors/tests" -v
python3 - <<'PY'
import hashlib, json, os
from pathlib import Path
import urllib.request
root = Path(os.environ['ORS_CI_WORK_DIR'])
url = 'https://raw.githubusercontent.com/GIScience/openrouteservice/v10.0.1/ors-api/src/test/files/heidelberg.test.pbf'
expected = 'b328c70c6b40b1b252eea28e9ad0321a97b75b3dbee0c78f3ddcc0bb80ea63df'
with urllib.request.urlopen(url, timeout=30) as response:
    data = response.read(10 * 1024 * 1024)
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit('CI OSM fixture SHA-256 mismatch')
source = root / 'input.osm.pbf'
source.write_bytes(data)
(root / 'deployment.json').write_text(json.dumps({
    'data_root': str(root / 'data'), 'dataset_path': str(source),
    'dataset_sha256': expected, 'http_port': 18082,
    'probe_coordinates': [[8.681495, 49.41461], [8.687872, 49.420318]],
}), encoding='utf-8')
PY
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$CONFIG" --env-out "$COMPOSE_ENV"
# 환경변수가 검증된 파일 경로를 덮어쓰지 못하게 한다.
unset ORS_CONFIG_FILE ORS_OSM_FILE ORS_GRAPHS_DIR ORS_HTTP_PORT
compose() {
    docker compose --profile ors --project-name "ors-ci-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}" \
        --project-directory "$PROJECT_ROOT" --env-file "$COMPOSE_ENV" \
        -f "$PROJECT_ROOT/docker-compose.yml" -f "$PROJECT_ROOT/docker-compose.ors.yml" "$@"
}
cleanup() {
    # CI 전용 프로젝트의 ORS 컨테이너만 정리한다. 운영 볼륨이나 다른 서비스는 건드리지 않는다.
    compose rm --stop --force ors >/dev/null 2>&1 || true
}
trap cleanup EXIT
if ! compose config --no-env-resolution --format json >/dev/null 2>&1; then
    echo 'ORS Compose configuration is invalid.' >&2
    exit 1
fi
compose pull ors
compose up --detach --no-deps ors
if ! python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/smoke.py" --config "$CONFIG" --wait-seconds 600; then
    compose logs --tail 80 ors || true
    exit 1
fi
echo 'ORS CI passed: pinned image, verified OSM fixture, driving/walking recommended/shortest.'

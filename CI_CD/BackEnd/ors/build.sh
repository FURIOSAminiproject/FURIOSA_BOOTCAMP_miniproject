#!/usr/bin/env bash
# 고정된 작은 OSM 자료로 공식 ORS 이미지의 네 가지 경로 요청을 검증한다.
set -euo pipefail
# GitHub-hosted 러너의 전용 임시 경로만 사용한다. 운영 JSON·한국 데이터·DB는 읽지 않는다.
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
# 오프라인 단위/모의 배포 검사를 통과한 뒤 실제 ORS 기동 검사에 사용할 작은 원본을 받는다.
# 파일 URL과 SHA-256을 함께 고정해 upstream 테스트 자료 변경을 묵시적으로 받아들이지 않는다.
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
    # 실행/재시도별 프로젝트명으로 CI 컨테이너가 운영 또는 다른 CI와 섞이지 않게 한다.
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
# 이 단계의 smoke.py는 모킹하지 않는다. 고정 이미지가 실제로 네 가지 경로를 계산해야 통과한다.
if ! python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/smoke.py" --config "$CONFIG" --wait-seconds 600; then
    compose logs --tail 80 ors || true
    exit 1
fi
echo 'ORS CI passed: pinned image, verified OSM fixture, driving/walking recommended/shortest.'

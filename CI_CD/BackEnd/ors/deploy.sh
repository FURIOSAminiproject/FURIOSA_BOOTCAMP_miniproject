#!/usr/bin/env bash
# 체크아웃 밖의 지정 OSM 스냅샷을 사용해 ORS 서비스만 교체한다.
set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEPLOY_CONFIG="${ORS_DEPLOY_CONFIG:-$HOME/.config/roadfriend/ors.json}"
APP_ENV="${APP_ENV:-production}"
test -f "$DEPLOY_CONFIG" || { echo 'Prepare ORS_DEPLOY_CONFIG outside the checkout before deployment.' >&2; exit 1; }
DATA_ROOT="$(python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$DEPLOY_CONFIG" --field data_root)"
mkdir -p "$DATA_ROOT"
# 같은 데이터 저장소를 사용하는 수동/자동 배포가 겹치면 교체 전에 중단한다.
exec 9>"$DATA_ROOT/deploy.lock"
flock --nonblock 9 || { echo 'Another ORS deployment is running.' >&2; exit 1; }
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/roadfriend-ors-deploy.XXXXXX")"
COMPOSE_ENV="$RUN_DIR/compose.env"
FROZEN_CONFIG="$RUN_DIR/deployment.json"
trap 'rm -f "$COMPOSE_ENV" "$FROZEN_CONFIG"; rmdir "$RUN_DIR" 2>/dev/null || true' EXIT
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$DEPLOY_CONFIG" --env-out "$COMPOSE_ENV" --config-out "$FROZEN_CONFIG"
unset ORS_CONFIG_FILE ORS_OSM_FILE ORS_GRAPHS_DIR ORS_HTTP_PORT
compose() {
    APP_ENV="$APP_ENV" docker compose --profile ors --project-directory "$PROJECT_ROOT" --env-file "$COMPOSE_ENV" \
        -f "$PROJECT_ROOT/docker-compose.yml" -f "$PROJECT_ROOT/docker-compose.ors.yml" "$@"
}
if ! compose config --no-env-resolution --format json >/dev/null 2>&1; then
    echo 'ORS Compose configuration is invalid; service was not changed.' >&2
    exit 1
fi
# 이미지 받기가 실패하면 기존 컨테이너는 그대로 유지한다.
compose pull ors
compose up --detach --no-deps ors
if ! python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/smoke.py" --config "$FROZEN_CONFIG" --wait-seconds "${ORS_WAIT_SECONDS:-1800}"; then
    compose logs --tail 80 ors || true
    echo 'ORS deployment failed. Previous snapshots/graphs remain; automatic rollback was not performed.' >&2
    exit 1
fi
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$FROZEN_CONFIG" --env-out "$COMPOSE_ENV" --activate
compose ps ors
echo 'ORS deployment passed. Last successful release is recorded outside the checkout.'

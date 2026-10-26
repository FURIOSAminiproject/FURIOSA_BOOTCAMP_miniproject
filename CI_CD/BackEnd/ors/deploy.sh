#!/usr/bin/env bash
# 처음에는 OSM·설정을 준비하고 이후에는 저장된 스냅샷으로 ORS 서비스만 교체한다.
set -euo pipefail
# 1. 호출 위치와 무관하게 저장소를 찾는다. 빈 Actions 변수도 HOME 기본값을 사용한다.
#    서버별 경로는 생성된 JSON에 보관하고 다운로드 정책은 저장소 bootstrap.json을 따른다.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DEPLOY_CONFIG="${ORS_DEPLOY_CONFIG:-$HOME/.config/roadfriend/ors.json}"
APP_ENV="${APP_ENV:-production}"
# 2. 큰 OSM 파일을 받기 전에 러너의 필수 명령과 Docker 데몬 접근을 검사한다.
#    이 스크립트는 패키지 설치나 권한 상승을 수행하지 않는다.
for executable in python3 docker flock; do
    command -v "$executable" >/dev/null || { echo "Missing runner prerequisite: $executable" >&2; exit 1; }
done
DOCKER_MEMORY_BYTES="$(docker info --format '{{.MemTotal}}')"
docker compose version >/dev/null
# t4g.small 같은 작은 공유 서버에서는 다운로드/이미지 pull/컨테이너 기동 전에 중단한다.
# 실패해도 기존 컨테이너를 임의로 중지하지 않으므로, 이미 과부하 중인 ORS는 먼저 운영자가 중지한다.
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/preflight.py" --docker-memory-bytes "$DOCKER_MEMORY_BYTES"
# 3. 기존 JSON의 data_root를 우선한다. JSON이 없을 때만 ORS_DATA_ROOT/HOME을 사용한다.
#    --field는 다운로드/설정 생성 없이 경로만 반환하므로 잠금 전에 안전하게 조회할 수 있다.
DATA_ROOT="$(python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/bootstrap.py" --config "$DEPLOY_CONFIG" \
    --data-root "${ORS_DATA_ROOT:-$HOME/.local/share/roadfriend/ors}" --field data_root)"
mkdir -p "$DATA_ROOT"
# 같은 데이터 저장소를 사용하는 수동/자동 배포가 겹치면 교체 전에 중단한다.
# fd 9를 스크립트 종료까지 유지하므로 최초 다운로드부터 성공 기록까지 잠금이 적용된다.
exec 9>"$DATA_ROOT/deploy.lock"
flock --nonblock 9 || { echo 'Another ORS deployment is running.' >&2; exit 1; }
# 4. 최초 배포는 검증한 OSM과 실제 값의 JSON을 생성한다. 기존 JSON이 있으면 재사용하며
#    잘못된 기존 설정이나 손상된 원본을 새 기본값으로 덮어쓰지 않고 중단한다.
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/bootstrap.py" --config "$DEPLOY_CONFIG" --data-root "$DATA_ROOT"
# 5. 이번 실행의 Compose 경로와 검사 설정을 고정한다. EXIT 정리는 이 임시 파일만
#    지우며, 원본·릴리스·그래프·마지막 성공 기록 등 영구 저장소는 남긴다.
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/roadfriend-ors-deploy.XXXXXX")"
COMPOSE_ENV="$RUN_DIR/compose.env"
FROZEN_CONFIG="$RUN_DIR/deployment.json"
trap 'rm -f "$COMPOSE_ENV" "$FROZEN_CONFIG"; rmdir "$RUN_DIR" 2>/dev/null || true' EXIT
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$DEPLOY_CONFIG" --env-out "$COMPOSE_ENV" --config-out "$FROZEN_CONFIG"
# Compose는 셸 환경변수를 --env-file보다 우선하므로 검증된 네 경로/포트 값의 덮어쓰기를 막는다.
unset ORS_CONFIG_FILE ORS_OSM_FILE ORS_GRAPHS_DIR ORS_HTTP_PORT
compose() {
    APP_ENV="$APP_ENV" docker compose --profile ors --project-directory "$PROJECT_ROOT" --env-file "$COMPOSE_ENV" \
        -f "$PROJECT_ROOT/docker-compose.yml" -f "$PROJECT_ROOT/docker-compose.ors.yml" "$@"
}
if ! compose config --no-env-resolution --format json >/dev/null 2>&1; then
    echo 'ORS Compose configuration is invalid; service was not changed.' >&2
    exit 1
fi
# 6. Compose 해석과 이미지 pull은 교체 전에 끝낸다. 전체 config는 다른 서비스의
#    환경값을 포함할 수 있으므로 로그에 출력하지 않는다. pull 실패 시 기존 ORS를 유지한다.
compose pull ors
# 원본/이미지 다운로드 중 DB 등 다른 프로세스의 메모리 사용이 늘었을 수 있으므로
# 실제 교체 직전에 다시 검사한다. 메모리 예약은 아니며 검사 통과 후의 변동도 가능하다.
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/preflight.py" --docker-memory-bytes "$DOCKER_MEMORY_BYTES"
# --no-deps와 서비스명을 함께 지정해 기존 NestJS/FastAPI/frontend를 재생성하지 않는다.
# 이 명령부터 ORS 교체가 발생하며 단일 컨테이너 방식이므로 일시 중단될 수 있다.
compose up --detach --no-deps ors
# 7. 포트가 열리는 것뿐 아니라 준비 상태와 네 가지 실제 경로 응답을 확인한다.
#    교체 후 실패는 workflow 실패로 전달한다. 로그 조회 실패만 무시하며 자동 롤백하지 않는다.
if ! python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/smoke.py" --config "$FROZEN_CONFIG" --wait-seconds "${ORS_WAIT_SECONDS:-1800}"; then
    compose logs --tail 80 ors || true
    echo 'ORS deployment failed. Previous snapshots/graphs remain; automatic rollback was not performed.' >&2
    exit 1
fi
# 검사했던 배포 사본과 원본 해시가 유지되는지 재확인한 후 마지막 성공 이력을 기록한다.
python3 "$PROJECT_ROOT/CI_CD/BackEnd/ors/prepare.py" --config "$FROZEN_CONFIG" --env-out "$COMPOSE_ENV" --activate
compose ps ors
echo 'ORS deployment passed. Last successful release is recorded outside the checkout.'

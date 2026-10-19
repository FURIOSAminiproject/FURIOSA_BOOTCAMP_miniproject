#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy.sh
# 위    치: CI_CD/BackEnd/deploy.sh
# 목    적: Nest.js 백엔드 Docker Compose 컨테이너 무중단 빌드/배포 및 헬스체크
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# ==============================================================================

set -euo pipefail

# 1. 경로 설정 (CI_CD/BackEnd -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/BackEnd"
APP_ENV="${APP_ENV:-production}"

echo "===== [1/4] 배포 환경 및 저장소 확인 ====="
echo "프로젝트 루트: $PROJECT_ROOT"
echo "배포 환경: $APP_ENV"

# 2. 빌드 산출물 무결성 검증
echo "===== [2/4] 빌드 산출물 검증 ====="
test -s "$SOURCE_DIR/dist/main.js"
test -s "$SOURCE_DIR/package.json"

# 3. Docker Compose 백엔드 컨테이너 빌드 및 재기동
echo "===== [3/4] Docker Compose 백엔드 컨테이너 기동 ====="
cd "$PROJECT_ROOT"

# 백엔드 컨테이너 빌드 및 백그라운드 무중단 실행
APP_ENV="$APP_ENV" docker compose up -d --build backend

# 4. 백엔드 헬스체크 검증 (Health Check)
echo "===== [4/4] 백엔드 헬스체크 검증 (GET /api/health) ====="
echo ">> 컨테이너 초기화 대기 (3초)..."
sleep 3

MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://127.0.0.1:3001/api/health > /dev/null; then
        SUCCESS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo ">> 헬스체크 재시도 ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ "$SUCCESS" = true ]; then
    echo ">> [성공] 백엔드 컨테이너가 http://127.0.0.1:3001/api/health 에서 정상 응답 중입니다!"
    docker compose ps backend
else
    echo "!! [실패] 백엔드 헬스체크 응답 실패. 백엔드 컨테이너 로그를 출력합니다:"
    docker compose logs --tail=50 backend || true
    exit 1
fi

echo ">> Nest.js 백엔드 컨테이너 배포가 성공적으로 완료되었습니다!"

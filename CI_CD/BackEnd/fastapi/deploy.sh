#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy.sh
# 위    치: CI_CD/BackEnd/fastapi/deploy.sh
# 목    적: FastAPI AI 추론 엔진 Docker Compose 컨테이너 무중단 빌드/배포 및 헬스체크
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# ==============================================================================

set -euo pipefail

# 1. 경로 설정 (CI_CD/BackEnd/fastapi -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/BackEnd/FastAPI"
APP_ENV="${APP_ENV:-production}"

echo "===== [1/5] 배포 환경 및 저장소 확인 ====="
echo "프로젝트 루트: $PROJECT_ROOT"
echo "배포 환경: $APP_ENV"

# 2. 필수 파일 존재 검증
echo "===== [2/5] 필수 소스코드 검증 ====="
test -s "$SOURCE_DIR/main.py"
test -s "$SOURCE_DIR/requirements.txt"
test -s "$SOURCE_DIR/Dockerfile"

# 3. 기존 FastAPI 소스 자동 백업 (Rollback 방어용)
echo "===== [3/5] 기존 FastAPI 소스 백업 (Backup) ====="
BACKUP_DIR="${PROJECT_ROOT}/backups/fastapi"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/fastapi_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -d "$SOURCE_DIR" ]; then
    echo ">> 기존 FastAPI 디렉토리를 백업합니다: $BACKUP_FILE"
    tar --exclude='__pycache__' --exclude='.env*' --exclude='venv' -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" BackEnd/FastAPI
    echo ">> [완료] FastAPI 백업 생성 성공 (크기: $(du -h "$BACKUP_FILE" | cut -f1))"

    # 최신 1개 백업만 유지하고 이전 백업 파일 자동 정리
    echo ">> 이전 백업 정리 (최신 1개만 유지)..."
    ls -dt "$BACKUP_DIR"/fastapi_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
else
    echo ">> FastAPI 디렉토리가 없어 백업 단계를 건너뜁니다."
fi

# 3-1. 디스크 공간 확보 (Docker 빌드 캐시 및 미사용 리소스 정리)
echo ">> [디스크 점검] 현재 디스크 사용량:"
df -h / || true

echo ">> [디스크 정리] 미사용 Docker 빌드 캐시 및 댕글링 이미지 정리..."
docker builder prune -af 2>/dev/null || true
docker image prune -af 2>/dev/null || true
docker container prune -f 2>/dev/null || true

if command -v journalctl >/dev/null 2>&1; then
    sudo journalctl --vacuum-time=1d 2>/dev/null || true
fi

echo ">> [디스크 정리 후] 여유 디스크 공간:"
df -h / || true

# 4. Docker Compose FastAPI 컨테이너 빌드 및 재기동
echo "===== [4/5] Docker Compose FastAPI 컨테이너 기동 ====="
cd "$PROJECT_ROOT"

APP_ENV="$APP_ENV" docker compose up -d --build --no-deps fastapi

# 5. FastAPI 헬스체크 검증 (Health Check)
echo "===== [5/5] FastAPI 헬스체크 검증 (GET /health) ====="
echo ">> 컨테이너 초기화 대기 (3초)..."
sleep 3

MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://127.0.0.1:8000/health > /dev/null 2>&1 || \
       docker exec travel-fastapi python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" > /dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo ">> 헬스체크 재시도 ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ "$SUCCESS" = true ]; then
    echo ">> [성공] FastAPI 컨테이너가 http://127.0.0.1:8000/health 에서 정상 응답 중입니다!"
    docker compose ps fastapi
else
    echo "!! [실패] FastAPI 헬스체크 응답 실패. 컨테이너 로그를 출력합니다:"
    docker compose logs --tail=50 fastapi || true
    exit 1
fi

echo ">> FastAPI AI 엔진 컨테이너 배포가 성공적으로 완료되었습니다!"

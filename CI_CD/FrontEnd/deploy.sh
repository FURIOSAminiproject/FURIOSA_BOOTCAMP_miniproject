#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy.sh
# 위    치: CI_CD/FrontEnd/deploy.sh
# 목    적: React(Vite) + Nginx Docker Compose 컨테이너 무중단 빌드/배포 및 헬스체크
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# ==============================================================================

set -euo pipefail

# 1. 경로 설정 (CI_CD/FrontEnd -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENV="${APP_ENV:-production}"

echo "===== [1/5] 프론트엔드 배포 환경 및 저장소 확인 ====="
echo "프로젝트 루트: $PROJECT_ROOT"
echo "배포 환경: $APP_ENV"

# 2. 호스트 Nginx 서비스 점검 (Docker 컨테이너가 80/443 포트를 배타적으로 점유하도록 보장)
echo "===== [2/5] 호스트 Nginx 점검 및 포트 충돌 방지 ====="
if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo ">> [안내] 호스트 OS에서 실행 중인 Nginx를 중단하고 비활성화합니다 (Docker Nginx 전환)..."
        sudo systemctl stop nginx || true
        sudo systemctl disable nginx || true
    else
        echo ">> 호스트 OS의 Nginx가 이미 비활성화되어 있습니다."
    fi
fi

# 3. 기존 프론트엔드 소스 백업 (Rollback 방어용)
echo "===== [3/5] 기존 프론트엔드 코드 백업 (Backup) ====="
BACKUP_DIR="${PROJECT_ROOT}/backups/frontend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/frontend_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -d "$PROJECT_ROOT/FrontEnd" ]; then
    echo ">> 기존 프론트엔드 소스를 백업합니다: $BACKUP_FILE"
    tar --exclude='node_modules' --exclude='.env*' -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" FrontEnd
    echo ">> [완료] 프론트엔드 백업 생성 성공 (크기: $(du -h "$BACKUP_FILE" | cut -f1))"

    # 최신 1개 백업만 유지하고 이전 백업 파일 자동 삭제
    echo ">> 이전 백업 정리 (최신 1개만 유지)..."
    ls -dt "$BACKUP_DIR"/frontend_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
fi

# 4. Docker Compose 프론트엔드 컨테이너 빌드 및 재기동
echo "===== [4/5] Docker Compose 프론트엔드 컨테이너 기동 ====="
cd "$PROJECT_ROOT"

APP_ENV="$APP_ENV" docker compose up -d --build frontend

# 5. 프론트엔드 헬스체크 검증 (Health Check)
echo "===== [5/5] 프론트엔드 헬스체크 검증 ====="
echo ">> 컨테이너 초기화 대기 (3초)..."
sleep 3

MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -k -f http://127.0.0.1/ > /dev/null 2>&1 || \
       curl -s -k -f https://127.0.0.1/ > /dev/null 2>&1 || \
       docker exec travel-frontend wget -q -O - http://127.0.0.1/ > /dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo ">> 헬스체크 재시도 ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

if [ "$SUCCESS" = true ]; then
    echo ">> [성공] 프론트엔드 컨테이너가 정상 응답 중입니다!"
    docker compose ps frontend
else
    echo "!! [실패] 프론트엔드 헬스체크 응답 실패. 컨테이너 로그를 출력합니다:"
    docker compose logs --tail=50 frontend || true
    exit 1
fi

echo ">> React 프론트엔드 컨테이너 배포가 성공적으로 완료되었습니다!"

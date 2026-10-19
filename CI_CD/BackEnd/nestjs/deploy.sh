#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy.sh
# 위    치: CI_CD/BackEnd/nestjs/deploy.sh
# 목    적: Nest.js 백엔드 Docker Compose 컨테이너 무중단 빌드/배포 및 헬스체크
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# ==============================================================================

set -euo pipefail

# 1. 경로 설정 (CI_CD/BackEnd/nestjs -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/BackEnd/nestjs"
APP_ENV="${APP_ENV:-production}"

echo "===== [1/5] 배포 환경 및 저장소 확인 ====="
echo "프로젝트 루트: $PROJECT_ROOT"
echo "배포 환경: $APP_ENV"

# 2. 환경 설정 파일(.env) 존재 확인 및 자동 복사
TARGET_ENV_FILE="$SOURCE_DIR/.env.$APP_ENV"
if [ ! -f "$TARGET_ENV_FILE" ]; then
    echo ">> [안내] 워크스페이스에 $TARGET_ENV_FILE 파일이 없어 EC2 공용 경로에서 검색합니다..."
    for CANDIDATE in \
        "/home/ec2-user/.env.$APP_ENV" \
        "/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/nestjs/.env.$APP_ENV" \
        "/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/.env.$APP_ENV" \
        "$HOME/.env.$APP_ENV"; do
        if [ -f "$CANDIDATE" ]; then
            echo ">> $CANDIDATE 에서 환경 설정 파일을 발견하여 복사했습니다!"
            cp "$CANDIDATE" "$TARGET_ENV_FILE"
            break
        fi
    done
fi

if [ ! -f "$TARGET_ENV_FILE" ]; then
    echo "======================================================================"
    echo "!! [치명적 에러] 환경 설정 파일이 없습니다: $TARGET_ENV_FILE"
    echo "!! Docker 컨테이너에 주입할 DB_HOST, DB_USER, DB_PASSWORD 등이 누락되었습니다."
    echo "!! EC2 터미널에서 /home/ec2-user/.env.$APP_ENV 또는 다음 위치에 파일을 생성해주세요:"
    echo "   $TARGET_ENV_FILE"
    echo "======================================================================"
    exit 1
fi
echo ">> 환경 설정 파일 정상 확인 완료: $TARGET_ENV_FILE"

# 3. 빌드 산출물 무결성 검증
echo "===== [2/5] 빌드 산출물 검증 ====="
test -s "$SOURCE_DIR/dist/main.js"
test -s "$SOURCE_DIR/package.json"

# 3. 기존 백엔드 코드 및 빌드 산출물 백업 (Rollback 방어용)
#    - 새 컨테이너를 빌드/배포하기 전, 현재 백엔드 소스 및 빌드 파일을 tar.gz로 압축 보관
#    - node_modules 및 .env는 용량 및 보안상 제외
#    - 최신 1개 백업만 유지하여 EC2 디스크 공간을 최소화
echo "===== [3/5] 기존 백엔드 코드 백업 (Backup) ====="
BACKUP_DIR="${PROJECT_ROOT}/backups/backend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backend_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -d "$SOURCE_DIR" ]; then
    echo ">> 기존 백엔드 디렉토리를 백업합니다: $BACKUP_FILE"
    tar --exclude='node_modules' --exclude='.env*' -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" BackEnd
    echo ">> [완료] 백엔드 백업 생성 성공 (크기: $(du -h "$BACKUP_FILE" | cut -f1))"

    # 최신 1개 백업만 유지하고 이전 백업 파일 자동 삭제
    echo ">> 이전 백업 정리 (최신 1개만 유지)..."
    ls -dt "$BACKUP_DIR"/backend_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
else
    echo ">> 백엔드 디렉토리가 없어 백업 단계를 건너뜁니다."
fi

# 4. Docker Compose 백엔드 컨테이너 빌드 및 재기동
echo "===== [4/5] Docker Compose 백엔드 컨테이너 기동 ====="
cd "$PROJECT_ROOT"

# 백엔드 컨테이너 빌드 및 백그라운드 무중단 실행
APP_ENV="$APP_ENV" docker compose up -d --build backend

# 5. 백엔드 헬스체크 검증 (Health Check)
echo "===== [5/5] 백엔드 헬스체크 검증 (GET /api/health) ====="
echo ">> 컨테이너 초기화 대기 (3초)..."
sleep 3

MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -f http://127.0.0.1:3001/api/health > /dev/null 2>&1 || \
       docker exec travel-backend node -e "fetch('http://127.0.0.1:3001/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))" > /dev/null 2>&1; then
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

#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy_backend.sh
# 목    적: Nest.js 백엔드 산출물 EC2 배포, 의존성 설치, PM2 무중단 재기동 및 헬스체크
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# 전제 조건: 러너 사용자에게 sudo NOPASSWD 및 pm2 전역 설치 필요
# ==============================================================================

set -euo pipefail

# 1. 경로 설정
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/BackEnd"
DEPLOY_DIR="${BACKEND_DEPLOY_DIR:-/var/www/backend}"
CURRENT_USER="$(id -un)"

echo "===== [1/5] 배포 경로 및 디렉토리 권한 준비 ====="
echo "소스 경로: $SOURCE_DIR"
echo "배포 경로: $DEPLOY_DIR"

# 배포 대상 디렉토리가 없으면 sudo로 생성하고 현재 러너 사용자에게 소유권 부여
if [ ! -d "$DEPLOY_DIR" ]; then
    echo ">> 배포 대상 디렉토리($DEPLOY_DIR) 생성 및 소유권 설정"
    sudo -n mkdir -p "$DEPLOY_DIR"
    sudo -n chown -R "$CURRENT_USER:$CURRENT_USER" "$DEPLOY_DIR"
fi

# 2. 빌드 산출물 무결성 검증
echo "===== [2/5] 빌드 결과물 검사 ====="
test -s "$SOURCE_DIR/dist/main.js"
test -s "$SOURCE_DIR/package.json"

# 3. 소스코드 및 산출물 동기화 (rsync)
#    - .env 파일과 logs 폴더는 EC2 서버에 존재하는 원본을 유지하기 위해 rsync 제외
echo "===== [3/5] 파일 동기화 (/var/www/backend) ====="
rsync -av --delete \
    --exclude='.env*' \
    --exclude='node_modules' \
    --exclude='*.log' \
    --exclude='.git' \
    "$SOURCE_DIR/dist" \
    "$SOURCE_DIR/package.json" \
    "$SOURCE_DIR/package-lock.json" \
    "$SOURCE_DIR/ecosystem.config.cjs" \
    "$DEPLOY_DIR/"

# EC2의 배포 경로에 .env.production이 없고 소스에 있으면 초기 복사
if [ ! -f "$DEPLOY_DIR/.env.production" ] && [ -f "$SOURCE_DIR/.env.production" ]; then
    echo ">> 초기 .env.production 설정 파일 복사"
    cp "$SOURCE_DIR/.env.production" "$DEPLOY_DIR/.env.production"
fi

# 4. 배포 디렉토리에서 프로덕션 패키지 설치 및 PM2 재기동
echo "===== [4/5] 프로덕션 의존성 설치 및 PM2 프로세스 기동 ====="
cd "$DEPLOY_DIR"

# 프로덕션 전용 패키지만 클린 설치 (devDependencies 제외로 가볍고 빠르게 설치)
npm ci --omit=dev

# PM2 설치 여부 확인
if ! command -v pm2 >/dev/null 2>&1; then
    echo ">> [경고] PM2가 설치되어 있지 않습니다. 자동 설치를 시도합니다."
    sudo -n npm install -g pm2
fi

# PM2로 무중단 재기동(reload) 또는 신규 기동(start)
if pm2 describe travel-backend > /dev/null 2>&1; then
    echo ">> 기존 travel-backend 프로세스 무중단 리로드 (pm2 reload)"
    pm2 reload ecosystem.config.cjs --update-env
else
    echo ">> travel-backend 프로세스 신규 기동 (pm2 start)"
    pm2 start ecosystem.config.cjs
fi

# EC2 재부팅 시에도 PM2 프로세스 자동 복구되도록 상태 저장
pm2 save

# 5. 백엔드 헬스체크 검증 (Sanity & Health Check)
echo "===== [5/5] 백엔드 헬스체크 검증 (GET /api/health) ====="
echo ">> 서버 초기화 대기 (3초)..."
sleep 3

if curl -s -f http://127.0.0.1:3001/api/health > /dev/null; then
    echo ">> [성공] 백엔드 서버가 http://127.0.0.1:3001/api/health 에서 정상 응답 중입니다!"
else
    echo "!! [실패] 백엔드 헬스체크 응답 실패. PM2 최근 로그를 출력합니다:"
    pm2 logs travel-backend --lines 30 --nostream || true
    exit 1
fi

echo ">> Nest.js 백엔드 배포가 성공적으로 완료되었습니다!"

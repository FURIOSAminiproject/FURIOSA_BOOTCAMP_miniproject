#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: deploy.sh
# 위    치: CI_CD/FrontEnd/deploy.sh
# 목    적: 다운로드된 React 번들(dist)을 EC2의 Nginx 웹 서버 디렉토리로 동기화 배포
# 실    행: GitHub Actions deploy 잡 러너(EC2 Self-hosted Runner)에서 호출됨
# 전제 조건: 러너 실행 사용자에게 sudo NOPASSWD 권한 부여 필요 (nginx, rsync)
# ==============================================================================

# 엄격 모드(Strict Mode) 설정: 에러 발생 또는 정의되지 않은 변수 사용 시 즉시 중단
set -euo pipefail

# 1. 경로 설정 (CI_CD/FrontEnd -> 루트)
#    - PROJECT_ROOT: EC2 워크스페이스 상의 저장소 최상위 경로
#    - DIST_DIR: build 잡에서 다운로드받은 React 정적 파일 경로
#    - NGINX_DIR: Nginx가 정적 웹 사이트를 서빙하는 루트 디렉토리 (기본값: /usr/share/nginx/html)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$PROJECT_ROOT/FrontEnd/dist"
NGINX_DIR="/usr/share/nginx/html"

# 2. 배포 사전 무결성 검증 (Pre-deployment Check)
#    - test -s: 다운로드된 번들에 index.html이 정상적으로 존재하는지 확인 (빈 파일 방지)
#    - test -d: Nginx 웹 루트 디렉토리가 EC2에 실제로 존재하는지 확인
echo "===== [1/4] 배포 전 파일 및 디렉토리 검사 ====="
test -s "$DIST_DIR/index.html"
test -d "$NGINX_DIR"

# 3. Nginx 설정 구문 사전 검사
#    - sudo -n: 비밀번호 입력 프롬프트 없이 실행 (암호 요구 시 에러를 내며 즉시 중단)
#    - nginx -t: Nginx 설정 파일(/etc/nginx/nginx.conf 등)에 문법 오류가 없는지 사전 점검
echo "===== [2/5] Nginx 설정 구문 검사 (nginx -t) ====="
sudo -n nginx -t

# 4. 기존 운영 버전 자동 백업 (Rollback 방어용)
#    - 새 번들을 배포하기 전, 현재 운영 중인 Nginx 웹 루트 파일들을 타임스탬프 기반 tar.gz로 압축 보관
#    - 최신 1개 백업만 유지하여 EC2 디스크 공간을 최소화
echo "===== [3/5] 기존 운영 프론트엔드 코드 백업 (Backup) ====="
BACKUP_DIR="${PROJECT_ROOT}/backups/frontend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/frontend_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -f "$NGINX_DIR/index.html" ]; then
    echo ">> 기존 Nginx 웹 루트 파일들을 백업합니다: $BACKUP_FILE"
    sudo -n tar --exclude='.well-known' -czf "$BACKUP_FILE" -C "$NGINX_DIR" .
    sudo -n chown "$(id -u):$(id -g)" "$BACKUP_FILE" 2>/dev/null || true
    echo ">> [완료] 백업 파일 생성 성공 (크기: $(du -h "$BACKUP_FILE" | cut -f1))"
    
    # 최신 1개 백업만 유지하고 이전 백업 파일 자동 삭제
    echo ">> 이전 백업 정리 (최신 1개만 유지)..."
    ls -dt "$BACKUP_DIR"/frontend_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
else
    echo ">> 기존 배포 내역이 없어 백업 단계를 건너뜁니다."
fi

# 5. React 정적 파일 동기화 배포 (rsync 사용)
#    - -a (archive): 파일 속성(권한, 타임스탬프, 심볼릭 링크 등) 유지 및 재귀 복사
#    - -v (verbose): 전송되는 파일 목록 상세 출력 (Actions 로그 확인용)
#    - --delete: 원본($DIST_DIR)에 없는 대상($NGINX_DIR)의 이전 해시 파일들을 자동 삭제 (오래된 캐시 파일 청소)
#    - --exclude='/.well-known/': Let's Encrypt SSL/TLS 인증서 자동 갱신용 폴더 보존
#    - "$DIST_DIR/": 뒤에 슬래시(/)를 붙여 폴더 자체가 아닌 폴더 '내부 내용물'을 복사하도록 지정
echo "===== [4/5] React 정적 파일 배포 (rsync) ====="
sudo -n rsync -av --delete \
  --exclude='/.well-known/' \
  "$DIST_DIR/" "$NGINX_DIR/"

# 6. 배포 사후 검증 (Post-deployment Check)
#    - Nginx 서빙 디렉토리에 index.html이 정상적으로 복사/배포되었는지 최종 확인
echo "===== [5/5] 배포 결과 확인 ====="
test -s "$NGINX_DIR/index.html"

echo ">> React 프론트엔드 Nginx 배포 완료!"

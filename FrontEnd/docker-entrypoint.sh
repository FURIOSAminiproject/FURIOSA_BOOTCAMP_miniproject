#!/bin/sh
set -e

# ==============================================================================
# travel-frontend Nginx 진입점 스크립트
# - EC2 호스트에서 볼륨 마운트된 Let's Encrypt SSL 인증서 존재 여부 자동 감지
# - 인증서 발견 시: HTTPS (포트 443 + 포트 80 리다이렉트) 설정 자동 적용
# - 미발견 시(로컬 개발): HTTP 단독 (포트 80) 설정 적용
# ==============================================================================

CERT_DIR="/etc/letsencrypt/live"
CERT_FILE=""
KEY_FILE=""

echo "===== [FrontEnd Container] Nginx 가동 준비 ====="

# 1. /etc/letsencrypt/live 하위의 첫 번째 인증서 디렉토리 탐색
if [ -d "$CERT_DIR" ]; then
    # 심볼릭 링크 타겟 검증 (-L 옵션으로 symlink 추적)
    FOUND_CERT=$(find -L "$CERT_DIR" -name "fullchain.pem" 2>/dev/null | head -n 1 || true)
    FOUND_KEY=$(find -L "$CERT_DIR" -name "privkey.pem" 2>/dev/null | head -n 1 || true)

    if [ -n "$FOUND_CERT" ] && [ -n "$FOUND_KEY" ] && [ -f "$FOUND_CERT" ] && [ -f "$FOUND_KEY" ]; then
        CERT_FILE="$FOUND_CERT"
        KEY_FILE="$FOUND_KEY"
    fi
fi

# 2. SSL 인증서 유무에 따른 Nginx 활성 설정 분기
if [ -n "$CERT_FILE" ] && [ -n "$KEY_FILE" ]; then
    echo ">> [SSL 감지 성공] 호스트의 Let's Encrypt 인증서를 적용합니다:"
    echo "   - Certificate: $CERT_FILE"
    echo "   - Private Key: $KEY_FILE"
    echo ">> [설정] HTTPS 모드 활성화 (포트 80 -> 443 리다이렉트 및 443 SSL 가동)"

    sed -e "s|__SSL_CERT_PATH__|$CERT_FILE|g" \
        -e "s|__SSL_KEY_PATH__|$KEY_FILE|g" \
        /etc/nginx/templates/nginx_ssl.conf > /etc/nginx/conf.d/default.conf
else
    echo ">> [SSL 미감지] 유효한 SSL 인증서가 없습니다 (로컬 환경 또는 인증서 발급 전)."
    echo ">> [설정] HTTP 단독 모드 활성화 (포트 80 직접 서빙)"

    cp /etc/nginx/templates/nginx_http.conf /etc/nginx/conf.d/default.conf
fi

# 3. Nginx 설정 구문 사전 점검 (오류 발생 시 상세 로그와 함께 중단)
echo ">> [Nginx 검증] 설정 구문 검사 (nginx -t)..."
nginx -t

echo ">> [Nginx 시작] 컨테이너 웹 서버 프로세스를 가동합니다."
exec "$@"

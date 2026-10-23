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

# 1. 같은 lineage 안의 인증서/키를 함께 선택한다.
# 도메인 인증서(문자 포함)가 있으면 숫자 IP 인증서보다 우선 선택한다.
# 폐기 요청(실패·진행 중 포함)으로 차단한 동일 leaf는 다시 선택하지 않는다.
check_lineage() {
    DIR="$1"
    [ -d "$DIR" ] || return 1
    [ -f "$DIR/fullchain.pem" ] && [ -f "$DIR/privkey.pem" ] || return 1
    MARKER="$DIR/.travel-ip-disabled.sha256"
    if [ -e "$MARKER" ] || [ -L "$MARKER" ]; then
        if [ -L "$MARKER" ] || [ ! -r "$MARKER" ] || [ ! -f "$DIR/cert.pem" ]; then
            echo ">> [인증서 제외] 폐기 상태를 확인할 수 없습니다: $DIR"
            return 1
        fi
        REVOKED_HASH=$(cat "$MARKER")
        case "$REVOKED_HASH" in
            ''|*[!0-9a-f]*) echo ">> [인증서 제외] 잘못된 폐기 상태: $DIR"; return 1 ;;
        esac
        if [ "${#REVOKED_HASH}" -ne 64 ]; then
            echo ">> [인증서 제외] 잘못된 폐기 해시: $DIR"
            return 1
        fi
        LEAF_HASH=$(sha256sum "$DIR/cert.pem" 2>/dev/null | awk '{print $1}')
        if [ "$LEAF_HASH" = "$REVOKED_HASH" ]; then
            echo ">> [인증서 제외] 폐기 요청한 인증서: $DIR"
            return 1
        fi
    fi
    return 0
}

if [ -d "$CERT_DIR" ]; then
    # 1순위: 도메인 인증서 (IP 주소가 아닌 영문 도메인 lineage 우선)
    for LINEAGE in "$CERT_DIR"/*; do
        check_lineage "$LINEAGE" || continue
        NAME=$(basename "$LINEAGE")
        if ! echo "$NAME" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
            CERT_FILE="$LINEAGE/fullchain.pem"
            KEY_FILE="$LINEAGE/privkey.pem"
            echo ">> [인증서 선택] 유효한 도메인 인증서 감지: $NAME"

            # 도메인 인증서가 확인되면 남아있는 이전 IP 인증서 파일들을 영구 삭제하여 충돌 방지
            for IP_LINEAGE in "$CERT_DIR"/*; do
                [ -d "$IP_LINEAGE" ] || continue
                IP_NAME=$(basename "$IP_LINEAGE")
                if echo "$IP_NAME" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
                    echo ">> [IP 인증서 삭제] 도메인 인증서($NAME)가 활성화되어 이전 IP 인증서($IP_NAME)를 삭제합니다."
                    rm -rf "$IP_LINEAGE" 2>/dev/null || true
                    rm -rf "/etc/letsencrypt/archive/$IP_NAME" 2>/dev/null || true
                    rm -f "/etc/letsencrypt/renewal/${IP_NAME}.conf" 2>/dev/null || true
                fi
            done
            break
        fi
    done

    # 2순위: 도메인 인증서가 없을 때 IP 인증서 fallback
    if [ -z "$CERT_FILE" ]; then
        for LINEAGE in "$CERT_DIR"/*; do
            check_lineage "$LINEAGE" || continue
            CERT_FILE="$LINEAGE/fullchain.pem"
            KEY_FILE="$LINEAGE/privkey.pem"
            NAME=$(basename "$LINEAGE")
            echo ">> [인증서 선택] IP 인증서 감지: $NAME"
            break
        done
    fi
fi

# 2. SSL 인증서 유무에 따른 Nginx 활성 설정 분기
# 차단 상태는 컨테이너 시작 시 읽는다. 실행 중인 Nginx를 감시·재시작하는 루프는 없다.
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

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
# 폐기 요청(실패·진행 중 포함)으로 차단한 동일 leaf는 다시 선택하지 않는다.
if [ -d "$CERT_DIR" ]; then
    for LINEAGE in "$CERT_DIR"/*; do
        [ -d "$LINEAGE" ] || continue
        [ -f "$LINEAGE/fullchain.pem" ] && [ -f "$LINEAGE/privkey.pem" ] || continue
        MARKER="$LINEAGE/.travel-ip-disabled.sha256"
        # 이 표시는 CA 폐기 성공뿐 아니라 요청 중·실패 상태도 포함한다.
        # 원격 요청이 실패했다고 이전 인증서를 자동으로 다시 제공하면 안 된다.
        if [ -e "$MARKER" ] || [ -L "$MARKER" ]; then
            # 손상된 상태 파일도 보수적으로 차단한다.
            if [ -L "$MARKER" ] || [ ! -r "$MARKER" ] || [ ! -f "$LINEAGE/cert.pem" ]; then
                echo ">> [인증서 제외] 폐기 상태를 확인할 수 없습니다: $LINEAGE"
                continue
            fi
            REVOKED_HASH=$(cat "$MARKER")
            case "$REVOKED_HASH" in
                ''|*[!0-9a-f]*) echo ">> [인증서 제외] 잘못된 폐기 상태: $LINEAGE"; continue ;;
            esac
            if [ "${#REVOKED_HASH}" -ne 64 ]; then
                echo ">> [인증서 제외] 잘못된 폐기 해시: $LINEAGE"
                continue
            fi
            LEAF_HASH=$(sha256sum "$LINEAGE/cert.pem")
            LEAF_HASH=${LEAF_HASH%% *}
            # lineage 이름만 차단하면 같은 이름으로 재발급한 새 인증서까지 막게 된다.
            # 폐기 요청 때 저장한 leaf 파일 해시와 동일한 인증서만 제외한다.
            if [ "$LEAF_HASH" = "$REVOKED_HASH" ]; then
                echo ">> [인증서 제외] 폐기 요청한 인증서: $LINEAGE"
                continue
            fi
        fi
        CERT_FILE="$LINEAGE/fullchain.pem"
        KEY_FILE="$LINEAGE/privkey.pem"
        break
    done
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

#!/usr/bin/env bash
# checkout이 지운 NestJS 환경 파일을 복원하고 컨테이너 교체 전에 필수 값을 검사한다.
# frontend도 backend를 시작할 수 있으므로 두 배포 경로에서 공통으로 호출한다.
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
APP_ENV="${APP_ENV:-production}"
case "$APP_ENV" in
    local|development|production) ;;
    *) echo "!! APP_ENV는 local/development/production 중 하나여야 합니다." >&2; exit 1 ;;
esac

command -v python3 >/dev/null 2>&1 || {
    echo "!! 환경 설정 사전 검사에 python3가 필요합니다." >&2
    exit 1
}

TARGET_ENV_FILE="$PROJECT_ROOT/BackEnd/NestJS/.env.$APP_ENV"
if [ ! -f "$TARGET_ENV_FILE" ]; then
    # 파일 내용을 shell source로 실행하지 않는다. 비밀값도 출력하지 않는다.
    for CANDIDATE in \
        "/home/ec2-user/.env.$APP_ENV" \
        "/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/NestJS/.env.$APP_ENV" \
        "/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/.env.$APP_ENV" \
        "$HOME/.env.$APP_ENV"; do
        if [ -f "$CANDIDATE" ]; then
            install -m 600 "$CANDIDATE" "$TARGET_ENV_FILE"
            echo ">> NestJS 환경 파일 복원 완료: $TARGET_ENV_FILE"
            break
        fi
    done
else
    # 작업 폴더 내 수정된 최신 설정이 영구 보존되도록 외부 백업 파일에도 자동 동기화
    if [ -w "/home/ec2-user" ]; then
        cp -f "$TARGET_ENV_FILE" "/home/ec2-user/.env.$APP_ENV" 2>/dev/null || true
        chmod 600 "/home/ec2-user/.env.$APP_ENV" 2>/dev/null || true
    fi
fi

if [ ! -f "$TARGET_ENV_FILE" ]; then
    echo "!! NestJS 환경 파일이 없습니다: $TARGET_ENV_FILE" >&2
    echo "!! 작업 폴더 밖의 /home/ec2-user/.env.$APP_ENV 또는 \$HOME/.env.$APP_ENV 에 준비하세요." >&2
    exit 1
fi

# Compose가 실제로 주입할 값을 검사한다. 전체 JSON에는 비밀값이 있으므로
# 로그/임시 파일로 남기지 않고 Python의 표준 입력으로만 전달한다.
APP_ENV="$APP_ENV" docker compose --project-directory "$PROJECT_ROOT" \
    -f "$PROJECT_ROOT/docker-compose.yml" config --format json 2>/dev/null | python3 -c '
import json
import sys

try:
    env = json.load(sys.stdin)["services"]["backend"]["environment"]
except (ValueError, KeyError, TypeError):
    sys.exit("!! Compose의 backend 환경 설정을 읽지 못했습니다.")

required = ("DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD")
missing = [key for key in required if not str(env.get(key) or "").strip()]
if missing:
    sys.exit("!! 필수 DB 설정 누락: " + ", ".join(missing))
if len(str(env.get("JWT_SECRET") or "").strip()) < 32:
    sys.exit("!! JWT_SECRET은 최소 32자 이상이어야 합니다.")
port = str(env.get("DB_PORT", "5432"))
if not port.isascii() or not port.isdigit() or not 1 <= int(port) <= 65535:
    sys.exit("!! DB_PORT는 1~65535 정수여야 합니다.")
if "DB_SSL" in env and env["DB_SSL"] not in ("true", "false"):
    sys.exit("!! DB_SSL은 true 또는 false여야 합니다.")
print(">> NestJS 필수 환경 설정 검사 통과 (DB 접속 검사는 별도)")
'

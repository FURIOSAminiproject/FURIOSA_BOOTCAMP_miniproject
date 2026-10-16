
#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DIST_DIR="$PROJECT_ROOT/FrontEnd/dist"
NGINX_DIR="/usr/share/nginx/html"

echo "===== 배포 파일 검사 ====="
test -s "$DIST_DIR/index.html"
test -d "$NGINX_DIR"

echo "===== Nginx 설정 검사 ====="
sudo -n nginx -t

echo "===== React 배포 ====="
sudo -n rsync -av --delete \
  --exclude='/.well-known/' \
  "$DIST_DIR/" "$NGINX_DIR/"

echo "===== 배포 결과 확인 ====="
test -s "$DIST_DIR/index.html"

echo "React 배포 완료"

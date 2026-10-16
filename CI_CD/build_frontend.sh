
#!/usr/bin/env bash
set -euo pipefail

# 프로젝트 최상위 경로
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$PROJECT_ROOT/FrontEnd"

echo "===== Node.js 버전 ====="
node --version
npm --version

echo "===== 패키지 설치 ====="
npm ci

echo "===== React 빌드 ====="
npm run build

echo "===== 빌드 결과 검사 ====="
test -s dist/index.html

echo "React 빌드 성공"

#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: build.sh
# 위    치: CI_CD/FrontEnd/build.sh
# 목    적: React(Vite) 프론트엔드 프로젝트 클린 빌드 및 산출물 무결성 검증
# 실    행: GitHub Actions build 잡 러너(ubuntu-latest)에서 호출됨
# ==============================================================================

# 엄격 모드(Strict Mode) 설정:
#   -e: 명령어가 0이 아닌 종료 코드를 반환하면 즉시 스크립트 중단 (실패 전파)
#   -u: 선언되지 않은 변수를 참조할 경우 에러 처리하고 중단
#   -o pipefail: 파이프라인(|) 연결 중 어느 하나라도 실패하면 전체 파이프라인 실패로 간주
set -euo pipefail

# 1. 프로젝트 최상위 루트 디렉토리 경로 계산 (CI_CD/FrontEnd -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 2. React 프로젝트 디렉토리로 이동
cd "$PROJECT_ROOT/FrontEnd/v1"

# 3. 환경 디버깅을 위한 Node.js 및 npm 버전 출력
echo "===== [1/4] Node.js 및 npm 버전 확인 ====="
node --version
npm --version

# 4. 의존성 패키지 설치 (npm ci 사용)
#    - 'npm install' 대신 'npm ci'를 사용하는 이유:
#      * package-lock.json과 100% 일치하는 버전만 설치하여 빌드 재현성 보장
#      * node_modules를 새로 구성하므로 CI/CD 환경에 최적화됨
echo "===== [2/4] 패키지 클린 설치 (npm ci) ====="
npm ci

# 5. React(Vite) 프로덕션 번들 빌드
#    - package.json에 정의된 "vite build" 스크립트 실행
#    - 성공 시 'FrontEnd/v1/dist/' 디렉토리에 정적 파일들(html, js, css, assets) 생성
echo "===== [3/4] React 프로덕션 빌드 ====="
npm run build

# 6. 빌드 결과물 검증 (Sanity Check)
#    - test -s: 파일이 존재하고 파일 크기가 0바이트보다 큰지 검사
#    - dist/index.html이 없거나 빈 파일이면 에러로 즉시 실패 처리
echo "===== [4/4] 빌드 결과 검사 (dist/index.html) ====="
test -s dist/index.html

echo ">> React 빌드 및 검증 성공 완료! (dist/ 생성됨)"

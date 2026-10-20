#!/usr/bin/env bash
# ==============================================================================
# 스크립트명: build.sh
# 위    치: CI_CD/BackEnd/nestjs/build.sh
# 목    적: Nest.js 백엔드 프로젝트 패키지 설치, 자동 테스트 및 프로덕션 빌드
# 실    행: GitHub Actions build 잡 러너(ubuntu-latest)에서 호출됨
# ==============================================================================

# 엄격 모드(Strict Mode) 설정:
#   -e: 오류 발생 시 즉시 중단
#   -u: 미정의 변수 참조 시 에러
#   -o pipefail: 파이프라인 중간 오류도 실패로 처리
set -euo pipefail

# 1. 프로젝트 최상위 루트 디렉토리 경로 계산 (CI_CD/BackEnd/nestjs -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

# 2. BackEnd NestJS 프로젝트 디렉토리로 이동
cd "$PROJECT_ROOT/BackEnd/NestJS"

# 3. Node.js 및 npm 버전 확인
echo "===== [1/5] Node.js 및 npm 버전 확인 ====="
node --version
npm --version

# 4. 의존성 패키지 클린 설치
echo "===== [2/5] 패키지 클린 설치 (npm ci) ====="
npm ci

# CI 빌드 환경에서 테스트 통과를 위한 격리 환경 설정 준비 (.example 기반)
if [ ! -f .env.local ] && [ -f .env.local.example ]; then
    cp .env.local.example .env.local
fi
if [ ! -f .env.development ] && [ -f .env.development.example ]; then
    cp .env.development.example .env.development
fi
if [ ! -f .env.production ] && [ -f .env.production.example ]; then
    cp .env.production.example .env.production
fi

# 5. 단위 및 통합 테스트 실행 (API & DB 연결 격리 테스트)
echo "===== [3/5] 백엔드 자동 테스트 실행 (npm test) ====="
npm test

# 6. 프로덕션 TypeScript 컴파일
echo "===== [4/5] 백엔드 프로덕션 빌드 (npm run build:prod) ====="
npm run build:prod

# 7. 빌드 결과물 무결성 검증 (Sanity Check)
echo "===== [5/5] 빌드 결과 검사 (dist/main.js) ====="
test -s dist/main.js
test -s dist/app.module.js

echo ">> Nest.js 백엔드 빌드 및 테스트 검증 성공 완료! (dist/ 생성됨)"

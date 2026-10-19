# 🚀 NestJS BackEnd CI/CD 배포 파이프라인 완벽 가이드

> **초심자도 쉽게 이해하는 백엔드 자동 테스트, Docker Compose 무중단 배포 및 헬스체크**  
> 본 가이드는 CI/CD를 처음 접하는 팀원도 백엔드 API 서버가 어떻게 클라우드에서 사전에 테스트·빌드되고, 실제 AWS EC2 서버에서 Docker 컨테이너로 안전하게 배포되어 정상 작동을 스스로 검증(헬스체크)하는지 모든 원리를 이해할 수 있도록 작성되었습니다.

---

## 📑 목차
1. [초심자를 위한 백엔드 CI/CD 기초 개념](#1-초심자를-위한-백엔드-cicd-기초-개념)
   - [프론트엔드 배포와 백엔드 배포는 무엇이 다를까요?](#프론트엔드-배포와-백엔드-배포는-무엇이-다를까요)
   - [왜 배포하기 전에 `npm test`를 먼저 돌릴까요? (Fail-Fast 원칙)](#왜-배포하기-전에-npm-test를-먼저-돌릴까요-fail-fast-원칙)
   - [왜 Docker Compose로 배포할까요?](#왜-docker-compose로-배포할까요)
   - [헬스체크(Health Check)란 무엇인가요?](#헬스체크health-check란-무엇인가요)
2. [백엔드 배포 아키텍처 및 동작 흐름](#2-백엔드-배포-아키텍처-및-동작-흐름)
3. [빌드 및 테스트 스크립트 상세 해부 (`build.sh`)](#3-빌드-및-테스트-스크립트-상세-해부-buildsh)
4. [배포 및 헬스체크 스크립트 상세 해부 (`deploy.sh`)](#4-배포-및-헬스체크-스크립트-상세-해부-deploysh)
5. [알아두면 유용한 핵심 백엔드 배포 기술](#5-알아두면-유용한-핵심-백엔드-배포-기술)
   - [Docker 컨테이너 무중단 롤링 재기동 원리](#docker-컨테이너-무중단-롤링-재기동-원리)
   - [5회 점진적 HTTP 헬스체크 재시도 루프](#5회-점진적-http-헬스체크-재시도-루프)
   - [실패 시 컨테이너 로그 자동 출력 및 안전 롤백](#실패-시-컨테이너-로그-자동-출력-및-안전-롤백)
6. [GitHub Actions 연동 설정 (`deploy_backend.yml`)](#6-github-actions-연동-설정-deploy_backendyml)
7. [초보 팀원을 위한 자주 묻는 질문(FAQ) 및 트러블슈팅](#7-초보-팀원을-위한-자주-묻는-질문faq-및-트러블슈팅)

---

## 1. 초심자를 위한 백엔드 CI/CD 기초 개념

### 프론트엔드 배포와 백엔드 배포는 무엇이 다를까요?

* **프론트엔드**: HTML, JS, CSS 파일들의 묶음(정적 파일)입니다. 웹 서버 폴더에 파일만 복사해 두면 브라우저가 알아서 다운로드해 갑니다.
* **백엔드**: 24시간 내내 메모리 위에서 살아서 돌아가는 **동적 프로그램(프로세스)**입니다. 데이터베이스(PostgreSQL)와 연결을 맺고 있어야 하며, 프론트엔드의 요청을 받아 AI 연산을 수행해야 합니다.
👉 따라서 백엔드는 단순히 파일을 복사하는 것만으로는 안 되고, **새 버전을 띄우고 이전 버전을 교체하는 "프로세스 재시작"과 "정상 기동 검증"**이 필수적입니다.

---

### 왜 배포하기 전에 `npm test`를 먼저 돌릴까요? (Fail-Fast 원칙)

만약 개발자가 실수로 버그가 있는 코드를 푸시했는데 그 코드가 그대로 운영 서버에 배포된다면 사용자들이 즉시 500 에러를 보게 됩니다.
* **Fail-Fast (빠른 실패)** 원칙: 클라우드 빌드 컴퓨터에서 먼저 자동화 테스트(`npm test`)를 수행합니다.
* 단 하나의 단위 테스트라도 실패하면 **배포 단계로 아예 넘어가지 않고 그 자리에서 즉시 빌드를 중단**하여 서버를 보호합니다.

---

### 왜 Docker Compose로 배포할까요?

서버에 직접 Node.js를 설치하고 실행하면 서버 OS 업데이트나 다른 패키지 버전 충돌로 인해 서버가 꺼질 위험이 있습니다.
* **Docker Compose**를 사용하면, 백엔드를 **완전히 독립된 가상 격리 상자(컨테이너)**에 담아서 실행합니다.
* `restart: always` 정책이 적용되어 예기치 않게 서버가 죽더라도 Docker가 1초 만에 자동으로 살려냅니다.

---

### 헬스체크(Health Check)란 무엇인가요?

배포 명령어가 성공했다고 해서 백엔드가 실제로 잘 돌아가고 있다는 보장은 없습니다. (예: DB 비밀번호 오류, 포트 충돌 등으로 켜지자마자 1초 만에 꺼질 수 있음)
* **헬스체크(Health Check)**는 사람이 의사에게 진찰을 받듯, 스크립트가 백엔드에게 **`GET /api/health`** 요청을 보내어 **"너 지금 진짜 건강하게 응답할 수 있어?"**를 직접 확인하는 과정입니다.

---

## 2. 백엔드 배포 아키텍처 및 동작 흐름

```
[ 개발자가 GitHub main 브랜치로 코드 푸시 ]
                 │ (BackEnd/** 또는 CI_CD/BackEnd/** 변경 감지)
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1단계: GitHub-hosted Runner (클라우드 임시 가상머신 ubuntu-latest)     │
│                                                                        │
│  ① actions/checkout : 최신 백엔드 소스코드 복제                       │
│  ② actions/setup-node : Node.js 22 LTS 환경 준비 및 npm 캐시 설정      │
│  ③ CI_CD/BackEnd/build.sh 실행:                                        │
│     - npm ci (package-lock.json 기반 클린 의존성 설치)                 │
│     - npm test (컨트롤러/서비스 격리 단위 테스트 수행 -> 검증 성공)     │
│     - npm run build:prod (TypeScript 소스 -> JavaScript dist/ 컴파일)  │
│     - test -s dist/main.js (컴파일 산출물 무결성 검증)                 │
│  ④ actions/upload-artifact : 생성된 dist/ 폴더를 아티팩트로 보관       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ 아티팩트(backend-dist) 전달
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2단계: AWS EC2 Self-hosted Runner (실제 우리 운영 서버)                │
│                                                                        │
│  ① actions/download-artifact : 빌드된 dist/ 컴파일 택배 상자 수신      │
│  ② CI_CD/BackEnd/deploy.sh 실행:                                       │
│     - [산출물 검사] dist/main.js, package.json 온전한지 확인           │
│     - [도커 기동] APP_ENV=production docker compose up -d              │
│                   --build backend                                      │
│     - [초기화 대기] 3초간 컨테이너 내부 TypeORM DB 커넥션 연결 대기    │
│     - [자동 헬스체크 루프] GET http://127.0.0.1:3001/api/health        │
│       * 최대 5회 재시도 (2초 간격)                                     │
│       * 200 OK 응답 확인 시 배포 성공 최종 판정!                       │
│       * 실패 시 컨테이너 로그 50줄 즉시 출력하고 Actions 에러 종료    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
          [ 7인 AI 멀티에이전트가 24시간 안정적으로 실시간 응답 서빙! ]
```

---

## 3. 빌드 및 테스트 스크립트 상세 해부 (`build.sh`)

📄 위치: [CI_CD/BackEnd/build.sh](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/CI_CD/BackEnd/build.sh)

```bash
#!/usr/bin/env bash
# 오류 발생 시 즉시 중단하는 엄격 모드 설정
set -euo pipefail

# 1. 스크립트 위치(CI_CD/BackEnd)에서 프로젝트 최상위 루트 디렉토리를 계산합니다.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 2. BackEnd 프로젝트 디렉토리로 이동합니다.
cd "$PROJECT_ROOT/BackEnd"

# 3. 디버깅용 런타임 버전 출력
echo "===== [1/5] Node.js 및 npm 버전 확인 ====="
node --version
npm --version

# 4. 의존성 패키지를 클린 설치합니다. (npm ci)
echo "===== [2/5] 패키지 클린 설치 (npm ci) ====="
npm ci

# 5. [핵심] 자동화 단위 테스트를 먼저 실행합니다!
#    * 만약 테스트가 1개라도 실패하면 아래 6단계(빌드)로 넘어가지 않고 즉시 중단됩니다.
echo "===== [3/5] 백엔드 자동 테스트 실행 (npm test) ====="
npm test

# 6. TypeScript 코드를 Node.js가 실행할 수 있는 프로덕션 JavaScript로 컴파일합니다.
echo "===== [4/5] 백엔드 프로덕션 빌드 (npm run build:prod) ====="
npm run build:prod

# 7. 컴파일 결과물(dist/main.js, dist/app.module.js)이 정상 생성되었는지 검사합니다.
echo "===== [5/5] 빌드 결과 검사 (dist/main.js) ====="
test -s dist/main.js
test -s dist/app.module.js

echo ">> Nest.js 백엔드 빌드 및 테스트 검증 성공 완료! (dist/ 생성됨)"
```

---

## 4. 배포 및 헬스체크 스크립트 상세 해부 (`deploy.sh`)

📄 위치: [CI_CD/BackEnd/deploy.sh](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/CI_CD/BackEnd/deploy.sh)

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. 경로 및 실행 환경 설정
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/BackEnd"
APP_ENV="${APP_ENV:-production}"              # 기본값: 운영(production) 환경

echo "===== [1/4] 배포 환경 및 저장소 확인 ====="
echo "프로젝트 루트: $PROJECT_ROOT"
echo "배포 환경: $APP_ENV"

# 2. 클라우드에서 전달받은 빌드 산출물이 온전한지 검증
echo "===== [2/5] 빌드 산출물 검증 ====="
test -s "$SOURCE_DIR/dist/main.js"
test -s "$SOURCE_DIR/package.json"

# 3. 기존 백엔드 코드 및 빌드 산출물 자동 백업 (최신 1개 보관)
#    * node_modules 및 .env는 용량 및 보안상 제외하고 소스/빌드 파일 압축 보관
echo "===== [3/5] 기존 백엔드 코드 백업 (Backup) ====="
BACKUP_DIR="${PROJECT_ROOT}/backups/backend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/backend_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -d "$SOURCE_DIR" ]; then
    echo ">> 기존 백엔드 디렉토리를 백업합니다: $BACKUP_FILE"
    tar --exclude='node_modules' --exclude='.env*' -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" BackEnd
    # 최신 1개만 유지 (이전 백업 삭제)
    ls -dt "$BACKUP_DIR"/backend_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
fi

# 4. Docker Compose 백엔드 컨테이너 빌드 및 무중단 재기동
echo "===== [4/5] Docker Compose 백엔드 컨테이너 기동 ====="
cd "$PROJECT_ROOT"
APP_ENV="$APP_ENV" docker compose up -d --build backend

# 5. 백엔드 자동 헬스체크 루프 (Health Check)
echo "===== [5/5] 백엔드 헬스체크 검증 (GET /api/health) ====="
echo ">> 컨테이너 초기화 대기 (3초)..."
sleep 3

MAX_RETRIES=5                                 # 최대 5번까지 확인
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # curl 명령어로 백엔드 상태 엔드포인트 호출 (성공 시 200 반환)
    if curl -s -f http://127.0.0.1:3001/api/health > /dev/null; then
        SUCCESS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo ">> 헬스체크 재시도 ($RETRY_COUNT/$MAX_RETRIES)..."
    sleep 2
done

# 최종 성공 여부 판정
if [ "$SUCCESS" = true ]; then
    echo ">> [성공] 백엔드 컨테이너가 http://127.0.0.1:3001/api/health 에서 정상 응답 중입니다!"
    docker compose ps backend
else
    echo "!! [실패] 백엔드 헬스체크 응답 실패. 백엔드 컨테이너 로그를 출력합니다:"
    docker compose logs --tail=50 backend || true
    exit 1                                    # 배포 실패로 처리하여 GitHub에 알림
fi

echo ">> Nest.js 백엔드 컨테이너 배포가 성공적으로 완료되었습니다!"
```

---

## 5. 알아두면 유용한 핵심 백엔드 배포 기술

### Docker 컨테이너 무중단 롤링 재기동 원리
* `docker compose up -d --build backend`는 기존에 돌고 있던 컨테이너를 먼저 무작정 끄지 않습니다.
* 새로운 소스코드로 도커 이미지를 다 구워낸 후, **마지막 순간에 기존 컨테이너를 내리고 새 컨테이너를 올리므로 서비스 중단 시간이 거의 0초**에 가깝습니다.

### 5회 점진적 HTTP 헬스체크 재시도 루프
* 서버가 켜질 때 TypeORM이 PostgreSQL DB에 접속하여 커넥션 풀을 맺는 데 약 1~2초가 소요될 수 있습니다.
* 켜지자마자 0.1초 만에 한 번 확인하고 실패했다고 꺼버리면 안 되기 때문에, **3초간 기다린 후 2초 간격으로 최대 5번까지 끈기 있게 재확인**합니다.

### 실패 시 컨테이너 로그 자동 출력 및 안전 롤백
* 만약 DB 연결에 실패했거나 문법 오류로 컨테이너가 죽었다면, 스크립트가 자동으로 **`docker compose logs --tail=50 backend`를 실행하여 최근 50줄의 에러 로그를 GitHub Actions 콘솔 화면에 뿌려줍니다.**
* 개발자는 번거롭게 EC2 터미널에 SSH 접속을 하지 않고도 GitHub 웹페이지에서 원인을 즉시 파악할 수 있습니다.

---

## 6. GitHub Actions 연동 설정 (`deploy_backend.yml`)

📄 워크플로우 파일: [.github/workflows/deploy_backend.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/.github/workflows/deploy_backend.yml)

### 트리거 조건 (스마트 빌드 감지):
```yaml
on:
  push:
    branches: [main]
    paths:
      - "BackEnd/**"             # 백엔드 서버 코드가 바뀌었을 때
      - "CI_CD/BackEnd/**"      # 백엔드 배포 스크립트가 바뀌었을 때
      - ".github/workflows/deploy_backend.yml"
```
* **프론트엔드 화면 코드가 바뀔 때는 백엔드 배포가 돌지 않습니다.**

---

## 7. 초보 팀원을 위한 자주 묻는 질문(FAQ) 및 트러블슈팅

### Q1. 헬스체크 단계에서 계속 실패하고 `Exit 1`로 배포가 중단돼요!
* **원인**: 백엔드 컨테이너가 켜지는 과정에서 오류를 만나 죽었기 때문입니다.
* **해결법**: GitHub Actions 화면에 출력된 50줄 에러 로그를 읽어보세요:
  1. `connect ECONNREFUSED 32.236.200.229:5432`: EC2의 PostgreSQL 서비스가 켜져 있는지 확인 (`sudo systemctl status postgresql`)
  2. `HOST=127.0.0.1`: 컨테이너 내부에서는 `HOST=0.0.0.0`으로 열려 있어야 헬스체크 및 Nginx 연결을 받을 수 있습니다.

### Q2. 러너 콘솔에서 `docker: permission denied` 오류가 발생해요!
* **원인**: 러너를 구동하는 `ec2-user` 사용자에게 도커를 다룰 수 있는 권한이 없어서 발생합니다.
* **해결법**: EC2 터미널에서 다음 명령어를 입력합니다:
  ```bash
  sudo usermod -aG docker ec2-user
  sudo systemctl restart docker
  # 백그라운드 러너 서비스 재시작
  sudo ~/actions-runner/svc.sh restart
  ```

### Q3. 배포 성공 후 웹에서 API를 호출하면 502 Bad Gateway가 떠요!
* **해결법**:
  1. EC2 터미널에서 백엔드 컨테이너가 살아있는지 점검합니다:
     ```bash
     docker compose ps backend
     ```
  2. Nginx 설정 파일(`/etc/nginx/conf.d/travel.conf`)에서 `proxy_pass http://127.0.0.1:3001` 또는 `http://backend:3001`로 포트 3001에 올바르게 전달하고 있는지 확인합니다.

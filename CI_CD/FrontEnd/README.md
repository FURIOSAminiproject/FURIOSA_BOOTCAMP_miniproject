# 🎨 React FrontEnd CI/CD 배포 파이프라인 완벽 가이드

> **초심자도 쉽게 이해하는 프론트엔드 지속적 통합(CI)과 지속적 배포(CD)의 모든 것**  
> 본 가이드는 CI/CD를 처음 접하는 팀원도 프론트엔드 코드가 클라우드에서 어떻게 자동으로 빌드되고, AWS EC2 Nginx 웹 서버로 어떻게 무중단 배포되는지 원리를 완벽하게 이해할 수 있도록 작성되었습니다.

---

## 📑 목차
1. [초심자를 위한 CI/CD 기초 개념](#1-초심자를-위한-cicd-기초-개념)
   - [CI/CD란 무엇인가요? (자동화 공장 라인 비유)](#cicd란-무엇인가요-자동화-공장-라인-비유)
   - [왜 빌드(Build)와 배포(Deploy)를 나누어 실행할까요?](#왜-빌드build와-배포deploy를-나누어-실행할까요)
   - [아티팩트(Artifact)란 무엇인가요?](#아티팩트artifact란-무엇인가요)
2. [프론트엔드 배포 아키텍처 및 동작 흐름](#2-프론트엔드-배포-아키텍처-및-동작-흐름)
3. [빌드 스크립트 상세 해부 (`build.sh`)](#3-빌드-스크립트-상세-해부-buildsh)
4. [배포 스크립트 상세 해부 (`deploy.sh`)](#4-배포-스크립트-상세-해부-deploysh)
5. [알아두면 유용한 핵심 배포 엔지니어링 기술](#5-알아두면-유용한-핵심-배포-엔지니어링-기술)
   - [`rsync --delete`로 오래된 캐시 파일 자동 청소하기](#rsync---delete로-오래된-캐시-파일-자동-청소하기)
   - [`--exclude='/.well-known/'`로 SSL(HTTPS) 인증서 지켜내기](#--exclude-well-known-로-sslhttps-인증서-지켜내기)
   - [사용자가 새로고침할 때 끊김 없는 무중단 서빙(Zero Downtime)](#사용자가-새로고침할-때-끊김-없는-무중단-서빙zero-downtime)
6. [GitHub Actions 연동 설정 (`deploy.yml`)](#6-github-actions-연동-설정-deployyml)
7. [초보 팀원을 위한 자주 묻는 질문(FAQ) 및 트러블슈팅](#7-초보-팀원을-위한-자주-묻는-질문faq-및-트러블슈팅)

---

## 1. 초심자를 위한 CI/CD 기초 개념

### CI/CD란 무엇인가요? (자동화 공장 라인 비유)

과거에는 개발자가 코드를 수정하면 다음과 같이 수동으로 작업해야 했습니다:
1. 내 컴퓨터에서 일일이 빌드(`npm run build`)를 돌린다.
2. 빌드된 파일(`dist` 폴더)을 파일 전송 프로그램(FileZilla 등)으로 서버에 업로드한다.
3. 원격 서버에 접속해서 웹 서버(Nginx)를 껐다 켠다.
👉 **문제점**: 실수하기 쉽고, 배포하는 동안 사용자 접속이 끊기며, 시간이 오래 걸립니다.

**CI/CD는 이 모든 과정을 코드가 GitHub에 올라가는 순간 로봇이 100% 자동으로 대신해 주는 시스템**입니다:
* **CI (Continuous Integration - 지속적 통합)**: 코드를 `main` 브랜치에 올리면, 클라우드 가상 컴퓨터가 자동으로 코드를 내려받아 라이브러리를 설치하고 오류 없이 빌드되는지 검증합니다.
* **CD (Continuous Deployment - 지속적 배포)**: 검증이 완료된 최신 빌드 산출물을 실제 서비스 중인 AWS EC2 서버로 안전하게 전달하여 사용자에게 즉시 반영합니다.

---

### 왜 빌드(Build)와 배포(Deploy)를 나누어 실행할까요?

우리 배포 파이프라인은 하나의 과정이 아니라 **Build 잡(Job)**과 **Deploy 잡(Job)** 2개로 분리되어 있습니다:

| 구분 | 1. Build 잡 (클라우드 러너) | 2. Deploy 잡 (EC2 러너) |
|---|---|---|
| **실행 장소** | GitHub가 무료로 제공하는 임시 컴퓨터 (`ubuntu-latest`) | 실제 서비스가 돌아가고 있는 우리의 **AWS EC2 서버** |
| **하는 일** | 소스코드 다운로드, `npm ci`, Vite 번들링 컴파일 | 프론트엔드 소스 백업 및 `docker compose up -d --build frontend` 컨테이너 배포 |
| **나눈 이유** | 빌드 과정은 CPU와 메모리를 많이 소모합니다. 서버에서 직접 빌드하면 **실제 사용자가 접속 중인 웹사이트가 버벅거리거나 멈출 수 있기 때문**입니다! |

---

### 아티팩트(Artifact)란 무엇인가요?

* 빌드 컴퓨터(GitHub 러너)와 배포 컴퓨터(AWS EC2)는 완전히 서로 다른 기계입니다.
* GitHub 러너가 빌드를 마친 후 생성된 결과물(`dist/` 폴더)을 압축하여 안전한 클라우드 보관소에 **"택배 상자"**처럼 올려두는데, 이 보관된 결과물을 **아티팩트(Artifact)**라고 부릅니다.
* 배포 컴퓨터(EC2)는 이 택배 상자를 내려받아 온전함을 검증하고 컨테이너를 안전하게 기동합니다.

---

## 2. 프론트엔드 배포 아키텍처 및 동작 흐름

```
[ 개발자가 GitHub main 브랜치로 코드 푸시 ]
                 │ (FrontEnd/** 또는 CI_CD/FrontEnd/** 변경 감지)
                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 1단계: GitHub-hosted Runner (클라우드 임시 가상머신 ubuntu-latest)     │
│                                                                        │
│  ① actions/checkout : 최신 소스코드 복제                              │
│  ② actions/setup-node : Node.js 22 LTS 환경 준비 및 캐시 설정          │
│  ③ CI_CD/FrontEnd/build.sh 실행:                                       │
│     - npm ci (package-lock.json 기반 클린 패키지 설치)                 │
│     - npm run build (React 19 + TypeScript -> 정적 번들 dist/ 생성)    │
│     - test -s dist/index.html (HTML 파일이 비어있지 않은지 검증)       │
│  ④ actions/upload-artifact : 생성된 dist/ 폴더를 아티팩트로 보관       │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ 아티팩트(frontend-dist) 전달
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 2단계: AWS EC2 Self-hosted Runner (실제 우리 운영 서버)                │
│                                                                        │
│  ① actions/download-artifact : 빌드된 dist/ 택배 상자 수신            │
│  ② CI_CD/FrontEnd/deploy.sh 실행:                                      │
│     - [호스트 점검] 호스트 Nginx 중지 및 포트 80/443 충돌 방지        │
│     - [자동 백업] 기존 프론트엔드 소스 백업 (최신 1개 tar.gz 보관)    │
│     - [도커 기동] docker compose up -d --build frontend                │
│     - [자동 헬스체크] 포트 80/443 및 컨테이너 정상 응답 검증 (최대 5회)│
└──────────────────────────────────┬─────────────────────────────────────┘
                                   ▼
          [ 전 세계 사용자가 브라우저로 최신 웹 화면 즉시 이용 가능! ]
```

---

## 3. 빌드 스크립트 상세 해부 (`build.sh`)

📄 위치: [CI_CD/FrontEnd/build.sh](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/CI_CD/FrontEnd/build.sh)

초보자도 이해할 수 있도록 코드 한 줄 한 줄의 의미를 설명합니다:

```bash
#!/usr/bin/env bash
# 엄격 모드: 작은 에러라도 발생하면 즉시 멈추어 고장 난 코드가 배포되는 것을 막습니다.
set -euo pipefail

# 1. 스크립트 위치(CI_CD/FrontEnd)에서 상위로 2번 올라가 프로젝트 루트 경로를 계산합니다.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# 2. React 프로젝트 디렉토리로 이동합니다.
cd "$PROJECT_ROOT/FrontEnd"

# 3. 디버깅을 위해 현재 설치된 Node.js 및 npm 버전을 로그에 남깁니다.
echo "===== [1/4] Node.js 및 npm 버전 확인 ====="
node --version
npm --version

# 4. 의존성 패키지를 설치합니다.
#    * npm install 대신 npm ci를 쓰는 이유: package-lock.json과 100% 동일한 버전만 엄격하게 설치하여
#      "내 컴퓨터에선 됐는데 클라우드 빌드에선 라이브러리 버전이 바뀌어 실패하는 일"을 원천 차단합니다.
echo "===== [2/4] 패키지 클린 설치 (npm ci) ====="
npm ci

# 5. React(Vite) 프로덕션 번들을 생성합니다. (HTML, JS, CSS 압축 및 최적화)
echo "===== [3/4] React 프로덕션 빌드 ====="
npm run build

# 6. 빌드 결과물 검증 (Sanity Check)
#    * test -s: 파일이 실제로 존재하고 크기가 0바이트가 아닌지 확인합니다.
#    * 만약 빌드가 실패하여 index.html이 없으면 즉시 에러를 내며 배포를 중단합니다.
echo "===== [4/4] 빌드 결과 검사 (dist/index.html) ====="
test -s dist/index.html

echo ">> React 빌드 및 검증 성공 완료! (dist/ 생성됨)"
```

---

## 4. 배포 스크립트 상세 해부 (`deploy.sh`)

📄 위치: [CI_CD/FrontEnd/deploy.sh](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/CI_CD/FrontEnd/deploy.sh)

```bash
#!/usr/bin/env bash
set -euo pipefail

# 1. 경로 설정 (CI_CD/FrontEnd -> 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
APP_ENV="${APP_ENV:-production}"

# 2. 호스트 Nginx 서비스 점검 (Docker 컨테이너가 80/443 포트를 배타적으로 점유하도록 보장)
if command -v systemctl >/dev/null 2>&1; then
    if systemctl is-active --quiet nginx 2>/dev/null; then
        echo ">> [안내] 호스트 OS에서 실행 중인 Nginx를 중단하고 비활성화합니다 (Docker Nginx 전환)..."
        sudo systemctl stop nginx || true
        sudo systemctl disable nginx || true
    fi
fi

# 3. 기존 프론트엔드 소스 백업 (Rollback 방어용, 최신 1개 유지)
BACKUP_DIR="${PROJECT_ROOT}/backups/frontend"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/frontend_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
if [ -d "$PROJECT_ROOT/FrontEnd" ]; then
    tar --exclude='node_modules' --exclude='.env*' -czf "$BACKUP_FILE" -C "$PROJECT_ROOT" FrontEnd
    ls -dt "$BACKUP_DIR"/frontend_backup_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f || true
fi

# 4. Docker Compose 프론트엔드 컨테이너 빌드 및 재기동
cd "$PROJECT_ROOT"
APP_ENV="$APP_ENV" docker compose up -d --build frontend

# 5. 프론트엔드 헬스체크 검증 (Health Check - 최대 5회)
sleep 3
MAX_RETRIES=5
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s -k -f http://127.0.0.1/ > /dev/null 2>&1 || \
       curl -s -k -f https://127.0.0.1/ > /dev/null 2>&1 || \
       docker exec travel-frontend wget -q -O - http://127.0.0.1/ > /dev/null 2>&1; then
        SUCCESS=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 2
done

if [ "$SUCCESS" = true ]; then
    echo ">> [성공] 프론트엔드 컨테이너가 정상 응답 중입니다!"
    docker compose ps frontend
else
    echo "!! [실패] 프론트엔드 헬스체크 응답 실패."
    docker compose logs --tail=50 frontend || true
    exit 1
fi
```

---

## 5. 알아두면 유용한 핵심 배포 엔지니어링 기술

### 호스트 Nginx 자동 중지 및 포트 충돌 방지
* EC2 호스트 OS에 `nginx` 서비스가 이미 돌고 있으면 Docker 컨테이너가 포트 `80` 또는 `443`을 바인딩하지 못하고 충돌(`address already in use`)이 발생합니다.
* 배포 스크립트는 배포 직전 `systemctl is-active nginx`를 감지하여 호스트 Nginx를 자동으로 중지하고 비활성화하여 Docker 컨테이너가 포트를 배타적으로 점유할 수 있도록 보장합니다.

### 컨테이너 엔트리포인트 기반 SSL 인증서 자동 감지
* `FrontEnd/Dockerfile`의 `docker-entrypoint.sh`는 컨테이너 시작 시 호스트에서 마운트된 `/etc/letsencrypt/live` 경로를 탐색합니다.
* 유효한 SSL 인증서가 존재하면 HTTPS(`nginx_ssl.conf`)로 즉시 가동하고, 아직 발급 전이면 HTTP 기본 모드(`nginx_http.conf`)로 가동하여 어떤 환경에서도 에러 없이 안전하게 웹을 띄웁니다.

### 사용자가 새로고침할 때 끊김 없는 무중단 서빙(Zero Downtime)
* `docker compose up -d --build frontend`는 새 이미지를 완전히 빌드한 뒤 마지막 순간에 이전 컨테이너를 교체하므로 서비스 중단이 사실상 0초에 수렴합니다.

---

## 6. GitHub Actions 연동 설정 (`deploy.yml`)

📄 워크플로우 파일: [.github/workflows/deploy.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/.github/workflows/deploy.yml)

### 트리거 조건 (스마트 빌드 감지):
```yaml
on:
  push:
    branches: [main]
    paths:
      - "FrontEnd/**"            # 프론트엔드 화면 코드가 바뀌었을 때
      - "CI_CD/FrontEnd/**"     # 프론트엔드 배포 스크립트가 바뀌었을 때
      - ".github/workflows/deploy.yml"
```
* **백엔드 코드가 바뀔 때는 프론트엔드 배포가 돌지 않습니다.** 불필요한 빌드 시간과 리소스를 아껴줍니다.

---

## 7. 초보 팀원을 위한 자주 묻는 질문(FAQ) 및 트러블슈팅

### Q1. 헬스체크 단계에서 계속 실패하고 `Exit 1`로 배포가 중단돼요!
* **원인**: 포트 80 충돌이거나 컨테이너 내부 Nginx 구동 오류일 수 있습니다.
* **해결법**: GitHub Actions 화면에 출력된 컨테이너 로그(`docker compose logs --tail=50 frontend`)를 확인하여 Nginx 설정 문법이나 바인딩 포트 충돌을 점검합니다.

### Q2. 러너 콘솔에서 `docker: permission denied` 오류가 발생해요!
* **원인**: 러너를 구동하는 `ec2-user` 사용자에게 도커를 다룰 수 있는 권한이 없어서 발생합니다.
* **해결법**: EC2 터미널에서 `sudo usermod -aG docker ec2-user` 명령어로 권한을 부여하고 러너 서비스를 재시작합니다.

### Q3. 페이지 이동 후 브라우저 새로고침을 누르면 `404 Not Found`가 떠요!
* **원인**: React는 SPA(Single Page Application)이므로 Nginx 설정에 `try_files $uri $uri/ /index.html;` 규칙이 필요합니다.
* **해결법**: 본 프로젝트의 `FrontEnd/nginx.conf` 및 템플릿에 해당 규칙이 기본 내장되어 있어 문제없이 작동합니다.

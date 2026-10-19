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
| **하는 일** | 소스코드 다운로드, `npm ci`, Vite 번들링 컴파일 | 빌드된 정적 파일만 받아서 Nginx 웹 폴더로 복사 |
| **나눈 이유** | 빌드 과정은 CPU와 메모리를 많이 소모합니다. 서버에서 직접 빌드하면 **실제 사용자가 접속 중인 웹사이트가 버벅거리거나 멈출 수 있기 때문**입니다! |

---

### 아티팩트(Artifact)란 무엇인가요?

* 빌드 컴퓨터(GitHub 러너)와 배포 컴퓨터(AWS EC2)는 완전히 서로 다른 기계입니다.
* GitHub 러너가 빌드를 마친 후 생성된 결과물(`dist/` 폴더)을 압축하여 안전한 클라우드 보관소에 **"택배 상자"**처럼 올려두는데, 이 보관된 결과물을 **아티팩트(Artifact)**라고 부릅니다.
* 배포 컴퓨터(EC2)는 이 택배 상자를 내려받아 웹 서버 디렉토리에 풀기만 하면 됩니다.

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
│     - [사전 검사] index.html 무결성 & /usr/share/nginx/html 확인       │
│     - [설정 검사] sudo nginx -t (웹 서버 문법에 이상이 없는지 확인)   │
│     - [무중단 동기화] sudo rsync -av --delete ...                      │
│       * 오래된 캐시 파일 자동 삭제                                     │
│       * SSL 인증서 폴더(/.well-known/) 안전 보존                       │
│     - [사후 검증] 웹 디렉토리에 정상 반영되었는지 확인                 │
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

# 1. 경로 정의
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DIST_DIR="$PROJECT_ROOT/FrontEnd/dist"        # 빌드 아티팩트가 다운로드된 위치
NGINX_DIR="/usr/share/nginx/html"             # Nginx가 실제로 인터넷에 보여주는 웹 서빙 폴더

# 2. 배포 전 사전 점검
echo "===== [1/4] 배포 전 파일 및 디렉토리 검사 ====="
test -s "$DIST_DIR/index.html"                # 배포할 파일이 온전한가?
test -d "$NGINX_DIR"                         # 웹 서버 서빙 폴더가 존재하는가?

# 3. Nginx 설정 문법 오류 사전 검사
#    * 배포 직전에 웹 서버 설정에 오타나 오류가 없는지 미리 점검합니다.
echo "===== [2/4] Nginx 설정 구문 검사 (nginx -t) ====="
sudo -n nginx -t

# 4. rsync를 통한 스마트 동기화 배포
echo "===== [3/4] React 정적 파일 배포 (rsync) ====="
sudo -n rsync -av --delete \
  --exclude='/.well-known/' \
  "$DIST_DIR/" "$NGINX_DIR/"

# 5. 최종 사후 검증
echo "===== [4/4] 배포 결과 확인 ====="
test -s "$NGINX_DIR/index.html"

echo ">> React 프론트엔드 Nginx 배포 완료!"
```

---

## 5. 알아두면 유용한 핵심 배포 엔지니어링 기술

### `rsync --delete`로 오래된 캐시 파일 자동 청소하기
* Vite는 소스코드를 빌드할 때마다 캐시 무효화를 위해 파일명 뒤에 고유 해시값(예: `main-A1b2C3.js`, `main-D4e5F6.js`)을 붙입니다.
* 일반적인 복사 명령어(`cp`)를 쓰면 예전 버전의 파일들이 서버에 계속 쌓여 디스크를 낭비하고 브라우저가 옛날 파일을 불러오는 오류가 발생합니다.
* **`--delete`** 옵션을 주면, 이번 새 빌드에 없는 **과거의 낡은 파일들만 골라서 자동으로 지워줍니다.**

### `--exclude='/.well-known/'`로 SSL(HTTPS) 인증서 지켜내기
* 우리 웹사이트의 초록색 자물쇠(HTTPS)는 무료 인증서 기관인 Let's Encrypt를 통해 3개월마다 자동 갱신됩니다.
* 인증서 기관은 갱신할 때 웹 서버의 `/.well-known/acme-challenge/`라는 숨김 폴더에 임시 키를 넣어 인증을 시도합니다.
* 만약 배포할 때 이 폴더까지 다 지워버리면 **SSL 인증서 자동 갱신이 실패하여 웹사이트 접속이 차단**되는 대형 사고가 납니다.
* 따라서 `--exclude='/.well-known/'` 옵션으로 이 경로를 보호합니다.

### 사용자가 새로고침할 때 끊김 없는 무중단 서빙(Zero Downtime)
* 파일을 복사하는 1~2초 동안에도 Nginx는 기존 메모리에 적재된 파일과 리눅스 Inode 시스템 덕분에 접속 중인 사용자에게 오류 화면을 보여주지 않고 매끄럽게 최신 파일로 전환합니다.

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

### Q1. `sudo: a password is required` 에러가 나면서 배포가 중단돼요!
* **원인**: GitHub 러너를 실행하는 리눅스 계정(`ec2-user`)이 비밀번호 없이 `sudo nginx`, `sudo rsync`를 실행할 권한이 없어서 발생합니다.
* **해결법**: EC2 터미널에서 다음 설정을 한 번만 등록해 주면 됩니다:
  ```bash
  sudo visudo -f /etc/sudoers.d/github-runner
  # 아래 한 줄을 넣고 저장(:wq)합니다:
  ec2-user ALL=(ALL) NOPASSWD: /usr/sbin/nginx, /usr/bin/rsync
  ```

### Q2. 배포는 성공했다고 뜨는데 브라우저에서 `403 Forbidden` 에러가 떠요!
* **원인**: Nginx 웹 서버가 파일을 읽을 수 있는 권한이 없기 때문입니다.
* **해결법**: 웹 디렉토리 소유권을 Nginx 실행 계정으로 맞춰줍니다:
  ```bash
  sudo chown -R nginx:nginx /usr/share/nginx/html
  sudo chmod -R 755 /usr/share/nginx/html
  ```

### Q3. 페이지 이동 후 브라우저 새로고침을 누르면 `404 Not Found`가 떠요!
* **원인**: React는 페이지가 1개인 SPA(Single Page Application)입니다. URL 주소가 바뀌어도 실제로는 `index.html`이 열려야 하는데, Nginx가 진짜 그 이름의 물리적 파일이나 폴더를 찾으려다 없어서 404를 내는 것입니다.
* **해결법**: Nginx 설정 파일(`/etc/nginx/conf.d/travel.conf`)의 `location /` 블록에 아래 설정을 넣어줍니다:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

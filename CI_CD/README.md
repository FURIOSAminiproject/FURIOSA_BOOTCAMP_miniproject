# 🚀 CI/CD 및 자동 배포 가이드

> **Docker Compose 및 GitHub Actions 기반 무중단 배포 / Nginx 리버스 프록시 인프라 가이드**  
> 본 프로젝트는 프론트엔드와 백엔드를 **Docker Compose 컨테이너 환경으로 표준화**하여 호스트 OS의 Node.js/런타임 버전 종속성을 배제하고, 일관된 무중단 서비스를 제공합니다.



## 📑 목차
1. [전체 시스템 아키텍처](#1-전체-시스템-아키텍처)
2. [배포 운영: Docker Compose 기반 배포](#2-배포-운영-docker-compose-기반-배포)
3. [GitHub Actions 자동 빌드 및 배포 파이프라인](#3-github-actions-자동-빌드-및-배포-파이프라인)
4. [CI/CD 스크립트 명세](#4-cicd-스크립트-명세)
5. [AWS EC2 Self-Hosted Runner 설정 가이드](#5-aws-ec2-self-hosted-runner-설정-가이드)
6. [Nginx 리버스 프록시 및 SSL(HTTPS) 설정](#6-nginx-리버스-프록시-및-sslhttps-설정)
7. [서버 인프라 보안 그룹(Security Group) 설정](#7-서버-인프라-보안-그룹security-group-설정)
8. [Docker 컨테이너 모니터링 및 트러블슈팅](#8-docker-컨테이너-모니터링-및-트러블슈팅)

---

## 1. 전체 시스템 아키텍처

```
[ 사용자 브라우저 ]
        │
        │ HTTP (포트 80) ──> 301 Redirect ──┐
        │                                  ▼
        └───────────────> HTTPS (포트 443 SSL/TLS)
                               │
                               ▼
        ┌────────────────────────────────────────────────────────┐
        │                AWS EC2 (Amazon Linux 2023)             │
        │                                                        │
        │ [ 호스트 OS / Let's Encrypt Certbot ]                  │
        │   └── /etc/letsencrypt/live/... (호스트 단일 관리)     │
        │   └── certbot renew --deploy-hook "docker exec ..."    │
        │                                                        │
        │ [ travel-frontend 컨테이너 (Nginx Alpine) ]            │
        │   ├── 볼륨 마운트: /etc/letsencrypt:ro                 │
        │   ├── 1) 정적 리소스 요청 ('/') -> React SPA 서빙      │
        │   ├── 2) 백엔드 API 요청 ('/api/*') -> NestJS:3001     │
        │   └── 3) AI 추론 요청 ('/fastapi/*') -> FastAPI:8000   │
        │                                                        │
        │ [ travel-backend 컨테이너 (NestJS Node 22) ]           │
        │   └── 포트 3001 (BFF & 비즈니스 로직)                  │
        │                                                        │
        │ [ travel-fastapi 컨테이너 (Python 3.12 FastAPI) ]      │
        │   └── 포트 8000 (경량 AI 마이크로서비스)               │
        │                                                        │
        │ [ PostgreSQL 16 Database ] (호스트 OS 직접 구동)       │
        │   └── localhost:5432 (travel_test, travel_prod)        │
        └────────────────────────────────────────────────────────┘
```

---

## 2. 배포 운영: Docker Compose 기반 배포

서버 환경의 Node.js 버전이나 전역 프로세스 매니저에 구애받지 않고, 완전 격리된 컨테이너 환경으로 전체 서비스를 1개 명령어로 배포·운영합니다.

### 2-1. 컨테이너 실행 명령어
```bash
# 1. 최신 코드 동기화
git pull origin main

# 2. 운영(PROD) 환경 컨테이너 빌드 및 백그라운드 무중단 실행
APP_ENV=production docker compose up -d --build

# 개발(DEV) 환경 컨테이너로 실행할 경우
APP_ENV=development docker compose up -d --build
```

### 2-2. 컨테이너 구성 및 역할
* **`frontend` (Nginx 1.27 Alpine)**:
  - 포트 `80` 및 `443`을 외부에 노출하여 React 정적 웹 애플리케이션을 초고속 서빙
  - 호스트의 `/etc/letsencrypt`를 볼륨 마운트하여 컨테이너 시작 시 SSL 인증서를 자동 감지
  - `/api/` 요청을 `http://backend:3001`로, `/fastapi/` 요청을 `http://fastapi:8000`으로 리버스 프록시
* **`backend` (Node 22 Alpine)**:
  - 포트 `3001`에서 NestJS 서버 구동
  - Docker Compose의 `restart: always` 정책으로 예기치 못한 장애 시 컨테이너 자동 복구
  - 호스트의 PostgreSQL 16 DB(`travel_prod` / `travel_test`)와 통신
* **`fastapi` (Python 3.12 Slim)**:
  - 포트 `8000`에서 FastAPI AI 마이크로서비스 구동
  - 비동기 고속 데이터 처리 및 여행지 추천 인터페이스 서빙

---

## 3. GitHub Actions 자동 빌드 및 배포 파이프라인

프론트엔드와 백엔드의 변경 사항을 감지하여 GitHub-hosted 러너에서 검증한 뒤 EC2 Self-hosted 러너로 안전하게 전달합니다.

### 3-1. 프론트엔드 파이프라인 (`.github/workflows/deploy.yml`)
* **트리거 경로**: `FrontEnd/**`, `CI_CD/FrontEnd/**`
* **상세 문서**: [프론트엔드 CI/CD 가이드](./FrontEnd/README.md)
1. **GitHub-hosted Runner (ubuntu-latest)**:
   - Node.js 환경 초기화 및 `CI_CD/FrontEnd/build.sh` 실행
   - Vite 기반 프로덕션 번들 빌드 (`FrontEnd/dist/` 생성 및 무결성 검증)
2. **Self-hosted Runner (AWS EC2)**:
   - `CI_CD/FrontEnd/deploy.sh` 실행
   - 호스트 Nginx 충돌 방지 및 `docker compose up -d --build frontend` 무중단 컨테이너 배포

### 3-2. NestJS 백엔드 파이프라인 (`.github/workflows/deploy_backend.yml`)
* **트리거 경로**: `BackEnd/nestjs/**`, `CI_CD/BackEnd/nestjs/**`
* **상세 문서**: [NestJS CI/CD 가이드](./BackEnd/nestjs/README.md)
1. **GitHub-hosted Runner (ubuntu-latest)**:
   - Node.js 22.x 환경 초기화 및 `CI_CD/BackEnd/nestjs/build.sh` 실행
   - 격리 단위 테스트(`npm test`) 통과 검증 후 프로덕션 컴파일 및 `backend-dist` 아티팩트 업로드
2. **Self-hosted Runner (AWS EC2)**:
   - `CI_CD/BackEnd/nestjs/deploy.sh` 실행
   - Docker Compose `backend` 컨테이너 무중단 재기동 후 `/api/health` 헬스체크 검증 (최대 5회)

### 3-3. FastAPI AI 엔진 파이프라인 (`.github/workflows/deploy_fastapi.yml`)
* **트리거 경로**: `BackEnd/fastapi/**`, `CI_CD/BackEnd/fastapi/**`
* **상세 문서**: [FastAPI CI/CD 가이드](./BackEnd/fastapi/README.md)
1. **GitHub-hosted Runner (ubuntu-latest)**:
   - Python 3.12 환경 초기화 및 `CI_CD/BackEnd/fastapi/build.sh` 실행
   - 의존성 설치, 바이트코드 문법 검사(`py_compile`) 및 모듈 임포트 검증
2. **Self-hosted Runner (AWS EC2)**:
   - `CI_CD/BackEnd/fastapi/deploy.sh` 실행
   - Docker Compose `fastapi` 컨테이너 무중단 재기동 후 `/health` 헬스체크 검증 (최대 5회)

---

## 4. 디렉토리 구조 및 CI/CD 스크립트 명세

```
CI_CD/
├── FrontEnd/                         # 🎨 프론트엔드 배포 파이프라인
│   ├── build.sh                      # Vite 번들 빌드 및 index.html 검증
│   ├── deploy.sh                     # Docker Compose 무중단 컨테이너 배포 및 헬스체크
│   └── README.md                     # [프론트엔드 CI/CD 상세 가이드]
├── BackEnd/                          # 🚀 백엔드 멀티 파이프라인 허브
│   ├── nestjs/                       # NestJS 배포 파이프라인 (Node 22, npm test, :3001)
│   │   ├── build.sh
│   │   ├── deploy.sh
│   │   └── README.md
│   ├── fastapi/                      # FastAPI 배포 파이프라인 (Python 3.12, :8000)
│   │   ├── build.sh
│   │   ├── deploy.sh
│   │   └── README.md
│   └── README.md                     # [백엔드 CI/CD 마스터 가이드]
├── nginx_https.conf                  # 🌐 SSL 리버스 프록시 설정 템플릿
└── README.md                         # 🚢 CI/CD 종합 인프라 가이드
```

| 스크립트 파일 | 역할 | 주요 실행 내용 |
|---|---|---|
| **`CI_CD/FrontEnd/build.sh`** | 프론트엔드 빌드 | `npm ci` ➔ `npm run build` ➔ `dist/index.html` 무결성 검증 |
| **`CI_CD/FrontEnd/deploy.sh`** | 프론트엔드 EC2 배포 | 호스트 Nginx 점검 ➔ 소스 tar.gz 자동 백업 ➔ `docker compose up -d --build frontend` ➔ 포트 80/443 헬스체크 |
| **`CI_CD/BackEnd/nestjs/build.sh`** | NestJS 빌드 & 테스트 | `npm ci` ➔ `npm test`(Fail-Fast) ➔ `npm run build:prod` 컴파일 |
| **`CI_CD/BackEnd/nestjs/deploy.sh`** | NestJS EC2 배포 | 산출물 검증 ➔ 소스 tar.gz 자동 백업 ➔ `docker compose up -d --build backend` ➔ `:3001/api/health` 헬스체크 |
| **`CI_CD/BackEnd/fastapi/build.sh`** | FastAPI 빌드 & 문법 검증 | `pip install` ➔ `python3 -m py_compile` 문법 검사 ➔ 앱 인스턴스 검증 |
| **`CI_CD/BackEnd/fastapi/deploy.sh`** | FastAPI EC2 배포 | 사전 검사 ➔ 소스 tar.gz 자동 백업 ➔ `docker compose up -d --build fastapi` ➔ `:8000/health` 헬스체크 |
| **`CI_CD/nginx_https.conf`** | 웹 서버 설정 템플릿 | 80 ➔ 443 리다이렉트, SSL 인증서 바인딩, HSTS, `/api/` 프록시 |

---

## 5. AWS EC2 Self-Hosted Runner 설정 가이드

GitHub Actions 배포 잡을 EC2 서버에서 직접 수신하여 실행하기 위해 Self-Hosted Runner를 등록합니다.

### 5-1. 사전 필수 패키지 설치 (Amazon Linux 2023)
```bash
sudo dnf update -y
sudo dnf install -y git curl tar jq libicu docker
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

### 5-2. 러너 등록 (GitHub Repository Settings > Actions > Runners)
```bash
# actions-runner 디렉토리 생성
mkdir -p ~/actions-runner && cd ~/actions-runner

# 시스템 아키텍처에 맞게 다운로드 (ARM64 예시)
# x86_64일 경우 actions-runner-linux-x64-*.tar.gz 사용
curl -o actions-runner-linux-arm64.tar.gz -L https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-linux-arm64-2.322.0.tar.gz
tar xzf actions-runner-linux-arm64.tar.gz

# 등록 토큰 입력 (GitHub 웹 콘솔에서 발급받은 토큰)
./config.sh --url https://github.com/<USER>/<REPO> --token <RUNNER_TOKEN>

# 시스템 서비스로 등록 및 백그라운드 시작
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

### 5-3. 🚨 EC2 디렉토리 구조 및 운영 환경변수(`.env.production`) 영구 보존 수칙

GitHub Actions Self-hosted Runner는 격리된 전용 워크스페이스에서 빌드와 배포를 수행합니다:

* **러너 실제 작업 경로 (배포 소스 위치)**:
  ```
  /home/ec2-user/actions-runner/_work/FURIOSA_BOOTCAMP_miniproject/FURIOSA_BOOTCAMP_miniproject
  ```
* **운영 환경변수(`.env.production`) 영구 보존 원칙**:
  * Git 저장소에는 보안상 `.env` 파일이 포함되지 않으며, `actions/checkout` 시 워크스페이스가 클린업될 수 있습니다.
  * 따라서 배포 스크립트([deploy.sh](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/CI_CD/BackEnd/nestjs/deploy.sh))는 배포 시마다 아래 우선순위로 `.env` 파일을 자동 탐색하여 워크스페이스로 주입합니다:
    1. `/home/ec2-user/.env.production` (최우선 권장 경로 ⭐)
    2. `$HOME/.env.production`
  * **수칙**: EC2 홈 디렉토리에 반드시 환경변수 파일을 영구 보관해 두어야 워크스페이스가 초기화되어도 안전하게 자동 복사됩니다:
    ```bash
    # 홈 디렉토리 영구 보존 위치에 설정 파일 배치
    cp /path/to/.env.production /home/ec2-user/.env.production
    chmod 600 /home/ec2-user/.env.production
    ```

---

## 6. Nginx 리버스 프록시 및 SSL(HTTPS) 설정

### 6-1. 설정 파일 적용
```bash
# Nginx 설정 디렉토리로 복사
sudo cp CI_CD/nginx_https.conf /etc/nginx/conf.d/travel.conf

# 문법 오류 검사
sudo nginx -t

# Nginx 시작 및 부팅 시 자동 시작 등록
sudo systemctl enable nginx
sudo systemctl restart nginx
```

### 6-2. Let's Encrypt 무료 SSL 인증서 발급 (Certbot)
```bash
# Certbot 설치
sudo dnf install -y certbot python3-certbot-nginx

# 인증서 발급 및 Nginx 자동 반영
sudo certbot --nginx -d your-service-domain.com

# 90일 만료 전 자동 갱신 테스트
sudo certbot renew --dry-run
```

---

## 7. 서버 인프라 보안 그룹(Security Group) 설정

AWS EC2 인스턴스의 보안 그룹 인바운드 규칙 권장 설정:

| 포트 범위 | 프로토콜 | 소스 | 목적 |
|---|---|---|---|
| **22** | TCP | 관리자 개인 IP (`/32`) | SSH 원격 터미널 접속 |
| **80** | TCP | `0.0.0.0/0` (Anywhere) | HTTP 웹 접속 (HTTPS 리다이렉트용) |
| **443** | TCP | `0.0.0.0/0` (Anywhere) | HTTPS 보안 웹 접속 (사용자 서비스) |
| **5432** | TCP | 팀원 IP (`/32`) 또는 `32.236.200.229/32` | PostgreSQL 데이터베이스 외부 접속 |

> [!CAUTION]
> 백엔드 포트 `3001`은 외부로 직접 열지 마세요. 외부 접근은 오직 Nginx(포트 80/443)를 통해서만 인입되도록 차단하는 것이 보안 표준입니다.

---

## 8. Docker 컨테이너 모니터링 및 트러블슈팅

### 8-1. Docker 컨테이너 관리 명령어
```bash
# 현재 실행 중인 컨테이너 상태 점검
docker compose ps

# 전체 실시간 통합 로그 확인 (프론트엔드 + 백엔드)
docker compose logs -f

# 백엔드 로그만 실시간 스트리밍
docker compose logs -f backend

# 백엔드 컨테이너만 수동 재기동
docker compose restart backend

# 컨테이너 전체 정상 종료
docker compose down
```

### 8-2. 502 Bad Gateway 발생 시 점검 체크리스트
1. **백엔드 컨테이너 실행 여부**: `docker compose ps`에서 `backend` 상태가 `Up`인지 확인
2. **백엔드 로그 점검**: `docker compose logs --tail=100 backend`로 에러 메시지 확인
3. **HOST 바인딩 확인**: `.env.production` 또는 `.env.development`에서 `HOST=0.0.0.0`으로 설정되었는지 확인 (`127.0.0.1`인 경우 컨테이너 간 통신 차단됨)
4. **DB 연결 확인**: 컨테이너 내부에서 PostgreSQL 5432 포트로 연결 가능한지 점검

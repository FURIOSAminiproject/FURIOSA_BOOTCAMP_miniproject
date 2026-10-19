# 🐳 Docker & Docker Compose 완벽 가이드

> **초심자도 쉽게 이해하는 컨테이너 가상화 기본 개념부터 프로젝트 아키텍처, 환경 분리, 멀티스테이지 빌드 및 실전 운영까지**  
> 본 가이드는 Docker를 처음 접하는 팀원도 도커의 핵심 원리를 완벽하게 이해하고, 단 1개의 명령어로 길벗 AI 여행사 시스템을 손쉽게 실행·디버깅할 수 있도록 작성되었습니다.



## 📑 목차
1. [초심자를 위한 Docker 핵심 개념 총정리](#1-초심자를-위한-docker-핵심-개념-총정리)
   - [왜 Docker를 사용할까요? (내 컴퓨터에선 되는데 서버에선 안 돼요!)](#왜-docker를-사용할까요-내-컴퓨터에선-되는데-서버에선-안-돼요)
   - [이미지(Image) vs 컨테이너(Container) 개념 완벽 정리](#이미지image-vs-컨테이너container-개념-완벽-정리)
   - [Dockerfile이란 무엇인가?](#dockerfile이란-무엇인가)
   - [Docker Compose란 무엇인가?](#docker-compose란-무엇인가)
2. [길벗 AI 여행사 Docker 시스템 아키텍처](#2-길벗-ai-여행사-docker-시스템-아키텍처)
   - [컨테이너 간 통신 및 포트 포워딩 원리](#컨테이너-간-통신-및-포트-포워딩-원리)
   - [Port 80 단일 창구와 CORS 문제의 원천 차단](#port-80-단일-창구와-cors-문제의-원천-차단)
3. [멀티스테이지 빌드 (Multi-stage Build) 전략](#3-멀티스테이지-빌드-multi-stage-build-전략)
   - [FrontEnd Dockerfile 상세 해부](#frontend-dockerfile-상세-해부)
   - [BackEnd Dockerfile 상세 해부](#backend-dockerfile-상세-해부)
   - [.dockerignore의 역할과 중요성](#dockerignore의-역할과-중요성)
4. [환경 분리 (APP_ENV) 연동 메커니즘](#4-환경-분리-app_env-연동-메커니즘)
5. [데이터베이스(PostgreSQL 16) 연결 가이드](#5-데이터베이스postgresql-16-연결-가이드)
6. [실전 명령어 가이드 (사용 방법)](#6-실전-명령어-가이드-사용-방법)
   - [사전 준비](#사전-준비)
   - [원클릭 실행 명령어 (OS별)](#원클릭-실행-명령어-os별)
   - [컨테이너 상태 점검 및 실시간 로그 확인](#컨테이너-상태-점검-및-실시간-로그-확인)
   - [컨테이너 내부 셸 접속 및 디버깅](#컨테이너-내부-셸-접속-및-디버깅)
   - [컨테이너 종료 및 재기동](#컨테이너-종료-및-재기동)
7. [자주 묻는 질문(FAQ) 및 트러블슈팅](#7-자주-묻는-질문faq-및-트러블슈팅)

---

## 1. 초심자를 위한 Docker 핵심 개념 총정리

### 왜 Docker를 사용할까요? (내 컴퓨터에선 되는데 서버에선 안 돼요!)

소프트웨어 개발에서 가장 흔히 발생하는 문제는 **"개발 환경의 불일치"**입니다:
* "내 Windows PC에서는 Node.js 22로 잘 실행되는데, 동료 Mac이나 배포 서버(Linux)에서는 버전이 달라서 에러가 나요."
* "프론트엔드와 백엔드를 켜려면 터미널을 여러 개 띄우고 라이브러리를 일일이 설치해야 해서 복잡해요."

Docker는 **애플리케이션 실행에 필요한 모든 것(소스코드, 런타임 언어, 라이브러리, 환경설정, OS 패키지)**을 하나로 꽁꽁 싸매어, **어떤 컴퓨터(Windows, Mac, Linux EC2)에서든 100% 동일하게 실행되도록 보장**해 주는 컨테이너 가상화 플랫폼입니다.

---

### 이미지(Image) vs 컨테이너(Container) 개념 완벽 정리

Docker를 배울 때 가장 기본이 되는 두 가지 개념입니다:

```
[ 설계도 / 레시피 ]                    [ 실제 살아 숨쉬는 인스턴스 ]
┌────────────────────┐                 ┌───────────────────────────┐
│ Docker Image (이미지)│  ── docker run ─> │ Docker Container (컨테이너)│
│ (불변의 읽기 전용 템플릿)│                 │ (독립된 격리 프로세스 공간) │
└────────────────────┘                 └───────────────────────────┘
   (예: 붕어빵 틀 / 클래스)                (예: 구워진 따끈한 붕어빵 / 객체)
```

| 구분 | 이미지 (Docker Image) | 컨테이너 (Docker Container) |
|---|---|---|
| **비유** | 붕어빵 틀, 게임 설치 파일(ISO), 객체지향의 `Class` | 구워진 붕어빵, 실행 중인 게임 프로세스, `Object` |
| **상태** | 정적(Static), 불변(Read-Only) 파일들의 집합 | 동적(Dynamic), 실행 중(Running)인 격리 프로세스 |
| **역할** | 실행 환경을 그대로 스냅샷으로 보관 | 이미지를 기반으로 메모리 위에서 실제로 동작 |
| **특징** | 한 번 빌드되면 내용이 변경되지 않음 | 컨테이너 안에서 파일을 생성/수정/삭제 가능 (독립적 격리) |

> [!NOTE]
> 하나의 이미지로 수십, 수백 개의 동일한 컨테이너를 몇 초 만에 찍어내어 가동할 수 있습니다.

---

### Dockerfile이란 무엇인가?

* **`Dockerfile`**은 **"이미지를 어떻게 만들지 적어놓은 레시피(설계도) 텍스트 파일"**입니다.
* 사람이 요리책을 보며 순서대로 재료를 넣듯, Docker 엔진은 `Dockerfile`에 적힌 명령어를 위에서부터 한 줄씩 실행하여 최종 실행 이미지를 구워냅니다.
* 주요 키워드:
  - `FROM`: 기본 베이스 이미지 지정 (예: `FROM node:22-alpine`, `FROM nginx:alpine`)
  - `WORKDIR`: 컨테이너 내부의 작업 디렉토리 지정 (예: `WORKDIR /app`)
  - `COPY`: 내 컴퓨터의 파일을 컨테이너 내부로 복사 (예: `COPY package.json ./`)
  - `RUN`: 이미지 빌드 중에 실행할 셸 명령어 (예: `RUN npm ci`, `RUN npm run build`)
  - `EXPOSE`: 외부에 노출할 대표 포트 번호 명시 (예: `EXPOSE 80`, `EXPOSE 3001`)
  - `CMD`: 컨테이너가 시작될 때 최종 실행할 메인 프로세스 명령어 (예: `CMD ["node", "dist/main.js"]`)

---

### Docker Compose란 무엇인가?

우리 프로젝트는 **프론트엔드(React + Nginx)**와 **백엔드(NestJS)**라는 2개 이상의 독립된 서비스로 구성되어 있습니다.
* `docker run` 명령어로 각각 실행하려면 네트워크 생성, 포트 연결, 환경변수 주입, 실행 순서 제어 등을 터미널에 길게 입력해야 합니다.
* **`docker-compose.yml`**은 이러한 **다중 컨테이너를 하나의 파일에 정의하고, 오케스트라 지휘자처럼 단 1개의 명령어(`docker compose up`)로 일괄 실행·관리**해 주는 도구입니다.

---

## 2. 길벗 AI 여행사 Docker 시스템 아키텍처

본 프로젝트는 Docker Compose를 통해 프론트엔드와 백엔드가 하나의 전용 브리지 네트워크 안에서 상호작용하도록 설계되어 있습니다.

### 전체 네트워크 및 컨테이너 아키텍처 다이어그램

```
                                [ 외부 브라우저 / 클라이언트 ]
                                              │
                                              │ HTTP 요청 (포트 80)
                                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 호스트 머신 (로컬 PC 또는 AWS EC2)                                                       │
│                                                                                        │
│ [ travel-network (Docker Bridge Network) ]                                             │
│                                                                                        │
│  ┌───────────────────────────┐      ┌───────────────────────────┐      ┌─────────────┐ │
│  │ travel-frontend 컨테이너  │      │ travel-backend 컨테이너   │      │travel-      │ │
│  │ (Nginx 1.27 Alpine)       │      │ (Node.js 22 LTS Alpine)   │      │fastapi      │ │
│  │                           │      │                           │      │(Python 3.12)│ │
│  │ 1) '/' ──> React 서빙      │      │ NestJS API 서버           │      │             │ │
│  │ 2) '/api/*' ─> 리버스 프록시┼─────>│ 포트 3001 (HOST=0.0.0.0)  │      │FastAPI 서버 │ │
│  │ 3) '/fastapi/*' ─> 프록시  ┼──────┼───────────────────────────┼─────>│포트 8000    │ │
│  └───────────────────────────┘      └─────────────┬─────────────┘      └─────────────┘ │
│                                                   │                                    │
└───────────────────────────────────────────────────┼────────────────────────────────────┘
                                                    │ DB 쿼리 (포트 5432)
                                                    ▼
                                              [ PostgreSQL 16.15 Database ]
                                              - EC2 호스트: host.docker.internal / 32.236.200.229
                                              - DEV: travel_test / PROD: travel_prod
```

### 컨테이너 간 통신 및 포트 포워딩 원리

1. **포트 바인딩 (`ports: ["80:80"]`, `ports: ["127.0.0.1:3001:3001"]`, `ports: ["127.0.0.1:8000:8000"]`)**:
   - 프론트엔드 컨테이너는 외부 웹 표준 포트 `80` 및 `443`을 호스트에 연결합니다.
   - 백엔드는 외부 공인 인터넷(0.0.0.0)에는 직접 노출하지 않고, 오직 호스트 로컬 루프백(`127.0.0.1`)과 도커 내부망(`travel-network`)에만 오픈하여 보안을 유지하면서도 서버 내부 헬스체크 및 디버깅이 가능하도록 구성되어 있습니다.
2. **서비스 이름 기반 DNS 통신**:
   - `travel-network` 브리지 네트워크 안에서는 IP 주소를 몰라도 [docker-compose.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/docker-compose.yml)에 지정된 서비스 이름인 **`backend`** 및 **`fastapi`** 도메인으로 서로 통신할 수 있습니다 (`http://backend:3001`, `http://fastapi:8000`).

### Port 80 단일 창구와 CORS 문제의 원천 차단

웹 개발에서 프론트엔드(포트 3000)와 백엔드(포트 3001, 8000)의 포트가 다르면 브라우저의 보안 정책상 **CORS(Cross-Origin Resource Sharing) 에러**가 빈번히 발생합니다.
* 본 프로젝트는 프론트엔드 컨테이너의 [FrontEnd/nginx.conf](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/FrontEnd/nginx.conf)가 **리버스 프록시(Reverse Proxy)** 역할을 수행합니다.
* 사용자의 모든 요청은 오직 `http://localhost/` (포트 80) 단일 창구로 인입됩니다.
* `/api/` 및 `/fastapi/`로 시작하는 요청만 Nginx가 내부 백엔드로 전달하므로, 브라우저는 동일 출처(Same-Origin)로 인식하여 **CORS 오류가 물리적으로 일어날 수 없습니다.**

---

## 3. 멀티스테이지 빌드 (Multi-stage Build) 전략

도커 이미지가 무거우면(수 GB) 다운로드와 배포 속도가 느려지고 서버 자원을 낭비하게 됩니다.  
본 프로젝트는 **멀티스테이지 빌드** 기법을 적용하여 이미지 크기를 **최대 90% 이상 압축**했습니다.

> [!TIP]
> **멀티스테이지 빌드란?**  
> 요리할 때 껍질을 벗기고 도마 위에서 손질(빌드 단계)한 뒤, 손질된 맛있는 음식만 최종 접시(실행 단계)에 담아 손님에게 내어놓는 원리입니다. 무거운 빌드 도구는 버리고 결과물만 취합니다.

---

### FrontEnd Dockerfile 상세 해부

📄 [FrontEnd/Dockerfile](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/FrontEnd/Dockerfile)

```dockerfile
# ==============================================================================
# 1단계: 빌더 (Builder Stage) - React 번들링
# ==============================================================================
FROM node:22-alpine AS builder

ARG APP_ENV=production
WORKDIR /app

# 캐시 효율을 위해 종속성 파일 먼저 복사 후 설치
COPY package*.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci

# 소스코드 복사 후 지정된 환경에 맞춰 Vite 정적 번들 빌드 (dist/ 생성)
COPY src ./src
RUN if [ "$APP_ENV" = "development" ] || [ "$APP_ENV" = "dev" ]; then \
        npm run build:dev; \
    elif [ "$APP_ENV" = "local" ] || [ "$APP_ENV" = "localdev" ]; then \
        npm run build:local; \
    else \
        npm run build:prod; \
    fi

# ==============================================================================
# 2단계: 실행 (Runner Stage) - 초경량 Nginx 서버 (SSL 자동 감지)
# ==============================================================================
FROM nginx:alpine AS runner

RUN mkdir -p /var/www/certbot /etc/nginx/templates
COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx_http.conf /etc/nginx/templates/nginx_http.conf
COPY nginx_ssl.conf /etc/nginx/templates/nginx_ssl.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80 443
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
```

---

### NestJS BackEnd Dockerfile 상세 해부

📄 [BackEnd/nestjs/Dockerfile](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/nestjs/Dockerfile)

```dockerfile
# 1단계: 빌더 (Builder Stage) - TypeScript 컴파일
FROM node:22-alpine AS builder

ARG APP_ENV=production
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
COPY scripts ./scripts
RUN node scripts/build.cjs ${APP_ENV}

# 2단계: 실행 (Runner Stage) - 프로덕션 전용 이미지
FROM node:22-alpine AS runner

ARG APP_ENV=production
WORKDIR /app

ENV NODE_ENV=${APP_ENV}
ENV APP_ENV=${APP_ENV}
ENV HOST=0.0.0.0
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY scripts ./scripts

EXPOSE 3001
CMD ["node", "dist/main.js"]
```

---

### FastAPI AI 추론 엔진 Dockerfile 상세 해부

📄 [BackEnd/fastapi/Dockerfile](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/fastapi/Dockerfile)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### .dockerignore의 역할과 중요성

📄 [FrontEnd/.dockerignore](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/FrontEnd/.dockerignore), [BackEnd/nestjs/.dockerignore](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/nestjs/.dockerignore) & [BackEnd/fastapi/.dockerignore](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/fastapi/.dockerignore)

```
node_modules
dist
venv
__pycache__
.env*
*.log
.git
```

* `.gitignore`가 Git에 올리지 않을 파일을 정하듯, `.dockerignore`는 **도커 빌드 시 컨테이너 안으로 복사하지 않을 대용량/민감 파일 목록**입니다.
* 로컬의 `node_modules`, `venv`나 `.git`이 복사되는 것을 막아 빌드 속도를 획기적으로 높이고, 로컬 OS와 컨테이너 OS 간 바이너리 충돌을 예방합니다.

---

## 4. 환경 분리 (APP_ENV) 연동 메커니즘

본 프로젝트는 단 1개의 환경 변수 `APP_ENV`를 설정하여 3대 환경을 자유자재로 스위칭합니다.

```
                          ┌── APP_ENV=local ───────> .env.local       (로컬 DB travel_local 연동)
                          │
docker compose up ────────┼── APP_ENV=development ─> .env.development (공유 개발 DB travel_test 연동)
                          │
                          └── APP_ENV=production ──> .env.production  (AWS 운영 DB travel_prod 연동 - 기본값)
```

### [docker-compose.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/docker-compose.yml) 내부 동작:
1. **빌드 시점**: `args: - APP_ENV=${APP_ENV:-production}`을 통해 프론트엔드와 NestJS 백엔드의 `Dockerfile`에 환경변수가 전달됩니다.
2. **런타임 시점**: `env_file: - path: ./BackEnd/nestjs/.env.${APP_ENV:-production}` 구문을 통해 선택된 환경의 설정 파일이 자동으로 NestJS 컨테이너 내부에 주입됩니다.
3. **FastAPI 연동**: `env_file: - path: ./BackEnd/fastapi/.env` 구문을 통해 AI 모델 및 CORS 설정이 주입됩니다.

---

## 5. 데이터베이스(PostgreSQL 16) 연결 가이드

백엔드가 Docker 컨테이너 격리망 내부에서 동작할 때 데이터베이스 호스트(`DB_HOST`) 설정 요령입니다:

| 실행 환경 | 대상 DB 위치 | 백엔드 `.env` 내 `DB_HOST` 설정값 | 설명 |
|---|---|---|---|
| **개발(DEV)** | AWS EC2 인스턴스 | `<DB_HOST_IP>` | 팀원 공유 테스트 DB (`travel_test`) |
| **운영(PROD)** | AWS EC2 인스턴스 | `<DB_HOST_IP>` | 실서비스 운영 DB (`travel_prod`) |
| **로컬(LOCAL)** | 내 컴퓨터 로컬 DB | `host.docker.internal` | 컨테이너 안에서 내 PC 호스트를 가리키는 특수 주소 |

> [!NOTE]
> [docker-compose.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/docker-compose.yml)의 백엔드 서비스에는 `extra_hosts: - "host.docker.internal:host-gateway"` 옵션이 사전 적용되어 있어, Linux 환경에서도 `host.docker.internal`을 통해 호스트 머신에 원활히 접속할 수 있습니다.

---

## 6. 실전 명령어 가이드 (사용 방법)

### 사전 준비
1. **Docker Desktop**이 설치되어 실행 중인지 확인합니다:
   ```bash
   docker --version
   docker compose version
   ```

---

### 원클릭 실행 명령어 (OS별)

프로젝트 루트 디렉토리(`c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject`)에서 실행합니다:

#### 🪟 Windows PowerShell 환경
```powershell
# 1. 운영(PROD) 환경 실행 (기본 권장)
$env:APP_ENV="production"; docker compose up -d --build

# 2. 개발(DEV) 환경 실행 (공유 TEST DB 연결)
$env:APP_ENV="development"; docker compose up -d --build

# 3. 로컬(LOCAL) 환경 실행
$env:APP_ENV="local"; docker compose up -d --build
```

#### 🐧 Linux / macOS / Git Bash / EC2 환경
```bash
# 1. 운영(PROD) 환경 실행
APP_ENV=production docker compose up -d --build
# 또는 매개변수 없이 실행 (기본값이 production으로 지정됨)
docker compose up -d --build

# 2. 개발(DEV) 환경 실행
APP_ENV=development docker compose up -d --build

# 3. 로컬(LOCAL) 환경 실행
APP_ENV=local docker compose up -d --build
```

> **옵션 설명**:
> * `-d` (Detached): 터미널을 차지하지 않고 백그라운드에서 실행합니다.
> * `--build`: 코드가 수정되었을 때 최신 코드를 반영하여 이미지를 새로 빌드합니다.

실행 후 브라우저에서 **`http://localhost`** (포트 80)로 접속합니다!

---

### 컨테이너 상태 점검 및 실시간 로그 확인

```bash
# 1. 컨테이너가 정상적으로 떠 있는지 확인 (Up 상태 확인)
docker compose ps

# 2. 전체 서비스 실시간 통합 로그 모니터링 (Ctrl + C로 탈출)
docker compose logs -f

# 3. 백엔드 NestJS 로그만 집중 모니터링
docker compose logs -f backend

# 4. 프론트엔드 Nginx 웹 서버 로그만 확인
docker compose logs -f frontend
```

---

### 컨테이너 내부 셸 접속 및 디버깅

컨테이너 안으로 직접 들어가서 파일이나 네트워크 상태를 확인하고 싶을 때:

```bash
# 백엔드 컨테이너 내부 셸(sh) 진입
docker exec -it travel-backend sh

# 컨테이너 안에서 DB 핑 테스트 및 환경변수 확인 예시:
#   env
#   exit
```

---

### 컨테이너 종료 및 재기동

```bash
# 컨테이너 일괄 중지 및 삭제 (데이터 볼륨 유지)
docker compose down

# 특정 컨테이너만 재시작 (예: 백엔드만 재시작)
docker compose restart backend
```

---

## 7. 자주 묻는 질문(FAQ) 및 트러블슈팅

### Q1. 소스코드를 수정했는데 브라우저 화면이나 API 응답이 바뀌지 않아요!
* **원인**: 컨테이너는 이전에 빌드된 정적 이미지를 바탕으로 실행되고 있기 때문입니다.
* **해결법**: 반드시 `--build` 플래그를 붙여 다시 실행하세요:
  ```powershell
  # PowerShell
  $env:APP_ENV="development"; docker compose up -d --build
  ```

---

### Q2. 웹 페이지에서 502 Bad Gateway 에러가 나타납니다.
* **원인**: 프론트엔드 Nginx는 정상 작동 중이나, 백엔드 NestJS 컨테이너가 꺼져 있거나 기동 중 오류가 발생한 경우입니다.
* **해결법**:
  1. `docker compose ps`로 `travel-backend` 상태가 `Up`인지 확인합니다.
  2. 만약 `Exit 1` 상태라면 로그를 확인합니다:
     ```bash
     docker compose logs --tail=100 backend
     ```
  3. 백엔드의 `.env` 파일에 `HOST=0.0.0.0`으로 설정되어 있는지 확인하세요 (`HOST=127.0.0.1`로 되어 있으면 컨테이너 외부 접속이 차단됩니다).

---

### Q3. `Bind for 0.0.0.0:80 failed: port is already allocated` 오류가 떠요!
* **원인**: 로컬 PC의 다른 웹 서버(IIS, Apache, 다른 Nginx 등)가 이미 포트 80을 사용 중입니다.
* **해결법**:
  - Windows 관리자 권한 PowerShell에서 80 포트를 점유한 프로세스를 찾아 종료하거나:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 80).OwningProcess
    ```
  - 또는 [docker-compose.yml](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/docker-compose.yml)에서 `ports: - "8080:80"`처럼 외부 포트를 임시 변경하여 실행할 수 있습니다.

---

### Q4. 이전 빌드 캐시 때문에 오류가 지속되거나 디스크 공간을 정리하고 싶어요.
* **해결법**: 캐시 없이 완전히 깨끗하게 다시 빌드합니다:
  ```bash
  docker compose build --no-cache
  docker compose up -d
  
  # 불필요한 빌드 캐시 정리
  docker builder prune -f
  ```

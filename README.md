# 🧭 길벗 AI 여행사 (Furiosa Mini Project)

> **7인의 AI 멀티에이전트가 자율적으로 맞춤 국내 여행 일정을 설계하고 관리자 최종 인가를 거치는 스마트 여행사 플랫폼**

* **프로젝트 기간**: 2026.10.16 ~ 2026.10.30
* **과정**: 퓨리오사 AI 부트캠프 미니 프로젝트
* **팀원**: 이동욱, 이지석, 장동율, 조정우

---

## 📑 프로젝트 문서 바로가기

각 서브시스템별 상세 가이드 및 아키텍처 문서는 아래 링크에서 확인하실 수 있습니다:

| 분류 | 문서 링크 | 핵심 내용 |
|---|---|---|
| 🎨 **FrontEnd** | [FrontEnd 가이드](./FrontEnd/README.md) | React 19, Tailwind v4, Leaflet 지도, 컴포넌트 구조, Nginx 리버스 프록시 |
| 🚀 **BackEnd** | [BackEnd 가이드](./BackEnd/README.md) | NestJS 11, TypeORM, 7인 멀티에이전트, Fail-Safe 폴백 엔진, Docker 컨테이너 운영 |
| 🗄️ **DataBase** | [DataBase 가이드](./DataBase/README.md) | AWS EC2 PostgreSQL 16, DEV(`travel_test`) & PROD(`travel_prod`), 계정 및 권한 SQL |
| 🚢 **CI/CD** | [CI/CD 가이드](./CI_CD/README.md) | GitHub Actions, Self-hosted 러너, Nginx HTTPS 및 HSTS, Docker Compose 배포 |
| 📁 **ETC** | [ETC 가이드](./ETC/README.md) | 팀 회의록 템플릿, 패키지 버전 스냅샷, 협업 컨벤션 |

---

## 🏗️ 시스템 아키텍처 & 기술 스택

### 운영 및 도커 배포 아키텍처 (Port 80 / 443)
```
[ 브라우저 (사용자 UI) ]
         │ (HTTP 포트 80 / HTTPS 포트 443)
         ▼
[ Nginx 웹 서버 (리버스 프록시) ]
   ├── 1) '/' 정적 파일 요청    ──> React(Vite) 빌드 산출물 서빙
   └── 2) '/api/' API 요청      ──> 백엔드 NestJS (내부 포트 3001) 로 포워딩
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
     [ Google Gemini AI (GenAI SDK) ]                      [ AWS EC2 PostgreSQL 16.15 ]
     - 7인 멀티에이전트 여행 일정 설계                      - 32.236.200.229:5432
     - 장소별 감성 수필 및 시 생성                         - TEST(travel_test) / PROD(travel_prod)
     - Graceful Degradation 내장 절차적 폴백 엔진
```

### Tech Stack
| 분류 | 기술 |
|---|---|
| **FrontEnd** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Leaflet (지도), Lucide React, Motion |
| **BackEnd** | NestJS 11, TypeScript, TypeORM, Express, Node.js 22 LTS, Google GenAI SDK |
| **Database** | PostgreSQL 16.15 (AWS EC2), DBeaver |
| **CI/CD & Infra** | GitHub Actions, AWS EC2 (Amazon Linux 2023), Nginx, Docker & Docker Compose |

---

## 📁 전체 디렉토리 구조

```
FURIOSA_BOOTCAMP_miniproject/
├── FrontEnd/                         # React 19 + TypeScript + Vite 8
│   ├── src/
│   │   ├── components/               # 여행신청폼, 일정표, Leaflet 지도, 감성시 섹션, 관리자 대시보드
│   │   ├── services/api.ts           # 백엔드 REST API 연동 클라이언트
│   │   └── types/travel.ts           # 프론트엔드 공통 타입 정의
│   ├── Dockerfile                    # Nginx Alpine 기반 경량 컨테이너
│   ├── nginx.conf                    # SPA 라우팅 및 /api/ 프록시 Nginx 설정
│   └── README.md                     # [프론트엔드 상세 가이드]
├── BackEnd/                          # NestJS 11 + TypeORM + Gemini Multi-Agent
│   ├── src/
│   │   ├── database/                 # TypeORM 연결 모듈 & DB 진단(check) CLI
│   │   ├── travel/                   # 7인 AI 멀티에이전트, 감성 문학 리뷰, 절차적 폴백 엔진
│   │   └── main.ts                   # 부트스트랩 (포트 바인딩, CORS, HSTS)
│   ├── scripts/                      # 환경별 start, build, check-db 유틸
│   ├── Dockerfile                    # Node 22 Alpine 멀티스테이지 컨테이너
│   └── README.md                     # [백엔드 상세 가이드]
├── DataBase/                         # AWS EC2 PostgreSQL 16 접속 정보 & 계정/권한 안내
│   └── README.md                     # [데이터베이스 상세 가이드]
├── CI_CD/                            # GitHub Actions 자동 배포 & Nginx HTTPS 설정
│   ├── build_frontend.sh             # 프론트엔드 빌드 스크립트
│   ├── deploy_frontend.sh            # 프론트엔드 EC2 배포 스크립트
│   ├── build_backend.sh              # 백엔드 빌드 & 테스트 스크립트
│   ├── deploy_backend.sh             # 백엔드 EC2 무중단 배포 스크립트
│   ├── nginx_https.conf              # SSL 리버스 프록시 설정 템플릿
│   └── README.md                     # [CI/CD 상세 가이드]
├── ETC/                              # 프로젝트 회의록 및 운영 자료
│   ├── 회의록/                        # 회의록 템플릿 및 날짜별 회의 기록
│   ├── Package_list.txt              # 프로젝트 설치 패키지 목록
│   └── README.md                     # [ETC 상세 가이드]
├── .github/workflows/                # GitHub Actions 워크플로우 정의
│   ├── deploy.yml                    # 프론트엔드 CI/CD
│   └── deploy_backend.yml            # 백엔드 CI/CD
├── docker-compose.yml                # 프론트엔드 + 백엔드 통합 오케스트레이션
└── README.md                         # [프로젝트 종합 가이드]
```

---

## ⚡ 빠른 시작 (Quick Start)

### 1. BackEnd 실행
```powershell
cd BackEnd

# 의존성 설치
npm install

# 환경 파일 준비 (.example 복사)
cp .env.development.example .env.development

# 개발 서버 실행 (포트 3001)
npm run start:dev
```

### 2. FrontEnd 실행
새 터미널을 열고 실행합니다:
```powershell
cd FrontEnd

# 의존성 설치
npm install

# 개발 서버 실행 (포트 80 통일)
npm run dev
# 또는 npm run start:dev
```

브라우저에서 `http://localhost` (포트 80)로 접속합니다. 프론트엔드가 `/api` 요청을 자동으로 백엔드(`http://127.0.0.1:3001`)로 전달합니다.

---

## 🌐 환경 분리 및 명령어 일람

본 프로젝트는 **로컬(local)**, **개발(dev)**, **운영(op/prod)** 세 환경으로 분리되어 있습니다.

| 환경 | 환경 파일 | 백엔드 빌드 | 백엔드 실행 | 프론트엔드 빌드 | 프론트엔드 실행 | DB 대상 |
|---|---|---|---|---|---|---|
| **로컬 (local)** | `.env.local` | `npm run build:local` | `npm run start:local` | `npm run build:local` | `npm run start:local` | 로컬 PostgreSQL (`travel_local`) |
| **개발 (dev)** | `.env.development` | `npm run build:dev` | `npm run start:dev` | `npm run build:dev` | `npm run start:dev` | AWS 공유 DB (`travel_test`) |
| **운영 (op)** | `.env.production` | `npm run build:op` | `npm run start:op` | `npm run build:op` | `npm run start:op` | AWS 운영 DB (`travel_prod`) |

---

## 🔍 DB 연결 사전 진단 (TypeORM)

사전 빌드(`npm run build`) 없이 TypeScript 스크립트를 즉시 실행하여 각 환경의 DB 접속 상태를 1초 만에 진단할 수 있습니다:

```powershell
cd BackEnd
npm run db:check -- dev     # 개발(TEST) DB 연결 확인
npm run db:check -- local   # 로컬 DB 연결 확인
npm run db:check -- prod    # 운영(PROD) DB 연결 확인
```

---

## 📡 주요 API 엔드포인트

| Method | Endpoint | 설명 |
|---|---|---|
| `GET` | `/api/health` | 백엔드 서버 상태 점검 |
| `GET` | `/api/health/db` | DB 연결 상태 점검 (`SELECT 1`) |
| `POST` | `/api/travel/plans` | Gemini 7인 멀티에이전트 여행 일정 및 코스 생성 (Fail-Safe 폴백 지원) |
| `POST` | `/api/travel/poetic-reviews` | 추천 명소/맛집 감성 수필 및 시 문학 리뷰 생성 |

---

## 🐳 Docker 컨테이너 실행 가이드 (환경 분리 지원)

Docker Compose를 통해 프론트엔드(React + Nginx)와 백엔드(NestJS)를 컨테이너화하여 일관된 환경에서 실행할 수 있습니다. `APP_ENV` 환경변수를 통해 환경을 스위칭합니다.

### 환경별 실행 명령어

#### 🐧 Linux / EC2 / macOS / Git Bash
```bash
# 운영(OP) 환경 실행 (기본값: .env.production / travel_prod DB 연결)
APP_ENV=production docker compose up -d --build
# 또는 기본 실행 (기본값이 production으로 설정됨)
docker compose up -d --build

# 개발(DEV) 환경 실행 (.env.development / travel_test DB 연결)
APP_ENV=development docker compose up -d --build

# 로컬(LOCAL) 환경 실행 (.env.local / travel_local DB 연결)
APP_ENV=local docker compose up -d --build
```

#### 🪟 Windows PowerShell
```powershell
# 운영(OP) 환경 실행
$env:APP_ENV="production"; docker compose up -d --build

# 개발(DEV) 환경 실행
$env:APP_ENV="development"; docker compose up -d --build

# 로컬(LOCAL) 환경 실행
$env:APP_ENV="local"; docker compose up -d --build
```

### 컨테이너 관리 명령어
```bash
# 실행 중인 컨테이너 상태 확인
docker compose ps

# 전체 실시간 로그 확인
docker compose logs -f

# 전체 컨테이너 종료
docker compose down
```

---

## 🛡️ 시스템 안정성 (Graceful Degradation)
- **API Key 독립 동작**: `GEMINI_API_KEY`가 없거나 Quota 초과 시에도 백엔드가 중단되지 않고 내장된 절차적 엔진(`generateProceduralKoreanPlan`)으로 실감나는 한국어 맞춤 일정과 시/수필을 즉시 생성하여 제공합니다.
- **Port 80 단일 창구**: 외부 클라이언트는 복잡한 포트 구분 없이 포트 80(또는 HTTPS 443) 단일 창구로 웹과 API 서비스를 모두 원활하게 이용할 수 있습니다.

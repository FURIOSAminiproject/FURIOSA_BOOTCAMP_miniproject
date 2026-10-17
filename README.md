# 🧭 길벗 AI 여행사 (Furiosa Mini Project)

> **7인의 AI 멀티에이전트가 자율적으로 맞춤 국내 여행 일정을 설계하고 관리자 최종 인가를 거치는 스마트 여행사 플랫폼**

* **프로젝트 기간**: 2026.10.16 ~ 2026.10.30
* **과정**: 퓨리오사 AI 부트캠프 미니 프로젝트
* **팀원**: 이동욱, 이지석, 장동율, 조정우

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
```
*(참고: 로컬에서 개발 서버를 직접 띄울 때(`npm run dev`)만 프론트엔드가 3000번 포트로 열립니다.)*


### Tech Stack
| 분류 | 기술 |
|---|---|
| **FrontEnd** | React 19, TypeScript, Vite 8, TailwindCSS 4, Leaflet (지도), Lucide React, Motion |
| **BackEnd** | NestJS 11, TypeScript, TypeORM, Express, Node.js 22, Google GenAI SDK |
| **Database** | PostgreSQL 16.15 (AWS EC2), DBeaver |
| **CI/CD & Infra** | GitHub Actions, AWS EC2, Nginx |

---

## 📁 디렉토리 구조

```
FURIOSA_BOOTCAMP_miniproject/
├── BackEnd/              # NestJS 백엔드 서버
│   ├── src/
│   │   ├── database/     # TypeORM 연결 모듈 & DB 진단(check)
│   │   ├── travel/       # Gemini AI 멀티에이전트 여행 설계 & 수필/시 생성
│   │   └── main.ts       # NestJS 부트스트랩 & 환경별 TLS 제어
│   ├── scripts/          # 환경별 빌드/실행/DB검사 유틸 (start, build, check-db)
│   └── test/             # 단위 & 통합 테스트
├── FrontEnd/             # React 프론트엔드
│   ├── src/
│   │   ├── components/   # UI 컴포넌트, 여행 일정표, Leaflet 지도
│   │   └── services/     # 백엔드 API 연동 클라이언트 (api.ts)
│   └── vite.config.ts    # 환경별 프록시 설정
├── DataBase/             # AWS EC2 PostgreSQL 접속 안내 및 DBeaver 설정 가이드
├── CI_CD/                # GitHub Actions 워크플로우 & Nginx 설정 가이드
└── README.md             # 프로젝트 종합 가이드
```

---

## ⚡ 빠른 시작 (Quick Start)

### 1. BackEnd 실행

```powershell
cd BackEnd

# 패키지 설치
npm install

# 환경 파일 준비 (.example 복사)
cp .env.development.example .env.development
# .env.development 파일에 GEMINI_API_KEY 및 DB 정보 확인

# 개발 서버 실행 (포트 3001)
npm run start:dev
```

### 2. FrontEnd 실행

새 터미널을 열고 실행합니다:

```powershell
cd FrontEnd

# 패키지 설치
npm install

# 개발 서버 실행 (포트 80)
npm run dev
# 또는 npm run start:dev
```

브라우저에서 `http://localhost` (포트 80)로 접속합니다. 프론트엔드가 `/api` 요청을 자동으로 백엔드(`http://127.0.0.1:3001`)로 전달합니다.

---

## 🌐 환경 분리 및 명령어 일람

본 프로젝트는 **로컬(local)**, **개발(dev)**, **운영(op/prod)** 세 환경으로 분리되어 있습니다.

| 환경 | 환경 파일 | 백엔드 빌드 | 백엔드 실행 | 프론트엔드 빌드 | 프론트엔드 실행 | DB 대상 |
|---|---|---|---|---|---|---|
| **로컬 (local)** | `.env.local` | `npm run build:local` | `npm run start:local` | `npm run build:local` | `npm run start:local` (또는 `dev:local`) | 로컬 PostgreSQL (`travel_local`) |
| **개발 (dev)** | `.env.development` | `npm run build:dev` | `npm run start:dev` | `npm run build:dev` | `npm run start:dev` (또는 `dev`) | AWS 공유 DB (`travel_test`) |
| **운영 (op)** | `.env.production` | `npm run build:op` | `npm run start:op` | `npm run build:op` | `npm run start:op` | AWS 운영 DB (`travel_prod`) |

---

## 🔍 DB 연결 진단 (TypeORM)

사전 빌드(`npm run build`) 없이 TypeScript 스크립트를 즉시 실행하여 각 환경의 DB 접속 상태를 진단할 수 있습니다:

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
| `POST` | `/api/travel/plans` | Gemini 기반 7인 멀티에이전트 여행 일정 및 코스 생성 |
| `POST` | `/api/travel/poetic-reviews` | 추천 맛집/명소 감성 수필 및 시 문학 리뷰 생성 |

---

## 🔒 보안 및 환경변수 원칙

1. **실제 `.env.*` 파일은 Git에 절대 커밋되지 않습니다.** (`.gitignore` 적용)
2. 저장소에는 `.env.*.example` 템플릿만 공유됩니다.
3. EC2 서버 배포 시 운영 환경 파일(`.env.production`)은 서버 내부에서 직접 생성/관리합니다.
4. 웹 통신 TLS 및 DB SSL 적용 여부는 각 환경 파일의 `ENABLE_TLS` 및 `DB_SSL` 플래그로 선택 제어됩니다.

---

## 🐳 Docker 컨테이너 실행 가이드 (환경 분리 지원)

본 프로젝트는 Docker 및 Docker Compose를 통해 프론트엔드(React + Nginx)와 백엔드(NestJS)를 컨테이너화하여 일관된 환경에서 실행할 수 있습니다. `APP_ENV` 환경변수를 통해 **운영(op/production)**, **개발(dev/development)**, **로컬(local)** 환경을 자유롭게 스위칭하여 구동할 수 있습니다.

### 1. 환경별 실행 명령어

#### 🐧 Linux / EC2 / macOS / Git Bash
```bash
# 1) 운영(OP) 환경 실행 (기본값: .env.production / travel_prod DB 연결)
APP_ENV=production docker compose up -d --build
# 또는 그냥 실행 (기본값이 production으로 설정됨)
docker compose up -d --build

# 2) 개발(DEV) 환경 실행 (.env.development / travel_test DB 연결)
APP_ENV=development docker compose up -d --build

# 3) 로컬(LOCAL) 환경 실행 (.env.local / travel_local DB 연결)
APP_ENV=local docker compose up -d --build
```

#### 🪟 Windows PowerShell
```powershell
# 1) 운영(OP) 환경 실행
$env:APP_ENV="production"; docker compose up -d --build

# 2) 개발(DEV) 환경 실행
$env:APP_ENV="development"; docker compose up -d --build

# 3) 로컬(LOCAL) 환경 실행
$env:APP_ENV="local"; docker compose up -d --build
```

### 2. 컨테이너 상태 점검 및 관리

```bash
# 실행 중인 컨테이너 상태 확인
docker compose ps

# 프론트엔드 및 백엔드 실시간 통합 로그 확인
docker compose logs -f

# 백엔드 로그만 확인
docker compose logs -f backend

# 전체 컨테이너 정상 종료
docker compose down
```

### 3. Docker 네트워크 및 DB 통신
* **프론트엔드 (Nginx)**: 포트 `80`을 외부에 노출하며, `/api/` 요청을 내부 도커 네트워크를 통해 `http://backend:3001`로 리버스 프록시합니다.
* **백엔드 (NestJS)**: 포트 `3001`에서 구동되며, 호스트 머신에서 실행 중인 PostgreSQL DB와 `host.docker.internal:5432` 또는 EC2 퍼블릭 IP(`32.236.200.229:5432`)를 통해 안전하게 통신합니다.


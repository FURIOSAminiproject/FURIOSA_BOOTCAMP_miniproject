# 🚀 길벗 AI 백엔드 (NestJS + TypeORM + Gemini Multi-Agent)

> **Google Gemini AI 7인 멀티에이전트 기반 자율 여행 일정 설계 및 맞춤 시·수필 생성 API 서버**  
> 본 백엔드는 NestJS 11과 TypeORM을 기반으로 구축되었으며, 엄격한 3단계 환경 분리(로컬, 개발, 운영)와 Docker 컨테이너 가상화(Docker Compose)를 통해 배포 및 운영됩니다.

---

## 📑 목차
1. [아키텍처 및 핵심 기술](#1-아키텍처-및-핵심-기술)
2. [주요 기능 및 시스템 특징](#2-주요-기능-및-시스템-특징)
3. [디렉토리 구조](#3-디렉토리-구조)
4. [환경 분리 및 .env 설정](#4-환경-분리-및-env-설정)
5. [실행 및 빌드 명령어](#5-실행-및-빌드-명령어)
6. [PostgreSQL DB 연결 및 진단](#6-postgresql-db-연결-및-진단)
7. [Docker 컨테이너 가이드](#7-docker-컨테이너-가이드)
8. [API 엔드포인트 명세](#8-api-엔드포인트-명세)
9. [단위 및 격리 테스트](#9-단위-및-격리-테스트)

---

## 1. 아키텍처 및 핵심 기술

```
[ 클라이언트 (FrontEnd React / Port 80) ]
                   │
                   │ HTTP 요청 (리버스 프록시 /api/*)
                   ▼
[ NestJS Core (Port 3001) ]
  ├── 1. DatabaseModule (TypeORM / PostgreSQL Pool)
  │      └── AWS EC2 PostgreSQL 16.15 (travel_test / travel_prod)
  │
  ├── 2. TravelModule (Gemini Multi-Agent Orchestrator)
  │      ├── Gemini 2.5 Flash API (Google GenAI SDK)
  │      └── Procedural Fallback Engine (API Key 부재 시 무중단 자동 전환)
  │
  └── 3. PoetryService (문학적 감성 수필 & 시 창작 엔진)
```

| 분류 | 기술 스택 | 설명 |
|---|---|---|
| **Framework** | NestJS 11.x, Express | 견고한 모듈형 백엔드 프레임워크 |
| **Language** | TypeScript 5.7+ | 정적 타입 안정성 및 엄격한 DTO 유효성 검사 |
| **Runtime** | Node.js 22.x LTS | 고성능 비동기 I/O 런타임 |
| **ORM / DB** | TypeORM 0.3+, PostgreSQL 16 | 엔터프라이즈 객체 관계 매핑 및 AWS DB 연동 |
| **AI Integration** | `@google/genai` (Gemini 2.5 Flash) | 7인 멀티에이전트 페르소나 프롬프트 오케스트레이션 |
| **Container & Supervision** | Docker & Docker Compose | 멀티스테이지 경량 이미지 및 `restart: unless-stopped` 자동 복구 |

---

## 2. 주요 기능 및 시스템 특징

### 🤖 1) 7인의 AI 멀티에이전트 오케스트레이션
사용자의 여행 희망사항(동행자, 예산, 여행 스타일, 특별 요청)을 입력받아 7인의 전문 에이전트가 협업하여 최적의 2박 3일 또는 N박 N일 코스를 도출합니다:
- **총괄 플래너 (Leader)**: 전체 여행 테마 및 동선 조율
- **지리/동선 분석가**: 이동 시간 최소화 및 일자별 권역 분할
- **미식 큐레이터**: 현지 특산물 및 노포/감성 카페 엄선
- **숙소 큐레이터**: 예산 및 분위기 최적화 숙소 선정
- **예산/비용 관리자**: 항목별 세부 비용 산정 및 한도 준수
- **힐링/액티비티 큐레이터**: 숨은 명소와 감성 체험 발굴
- **일정 검증관**: 영업시간, 휴무일, 이동 현실성 최종 검증

### ✍️ 2) 장소별 감성 문학 리뷰 생성 (Poetry Service)
추천된 각 여행지(맛집, 카페, 명소)에 대해 단순 정보 나열이 아닌, 감각적인 한국어 감성 수필과 시조/현대시를 즉석에서 창작하여 여행자에게 문학적 깊이를 제공합니다.

### 🛡️ 3) Graceful Degradation (절차적 폴백 엔진 탑재)
- `GEMINI_API_KEY`가 설정되지 않았거나, 구글 API 할당량(Quota) 초과, 네트워크 장애가 발생하더라도 **서버가 500 에러를 뿜거나 중단되지 않습니다.**
- 내장된 **`generateProceduralKoreanPlan`** 및 **`generateProceduralKoreanReview`** 엔진이 요청 파라미터(목적지, 동행자, 스타일)를 정밀 분석하여, 실제 여행 일정과 구체적인 장소/시간/예산/문학 리뷰를 완벽한 DTO 규격으로 즉시 생성합니다.

---

## 3. 디렉토리 구조

```
BackEnd/
├── src/
│   ├── database/                    # TypeORM 데이터베이스 모듈
│   │   ├── database.module.ts       # 환경별 DB 접속 모듈
│   │   └── check-connection.ts      # 빌드 없이 즉시 실행 가능한 DB 진단 CLI
│   ├── travel/                      # 여행 기획 및 AI 비즈니스 로직
│   │   ├── travel.controller.ts     # /api/travel 엔드포인트 라우팅
│   │   ├── travel.service.ts        # 비즈니스 오케스트레이션
│   │   ├── travel-engine.ts         # Gemini AI 연동 및 Fail-Safe 폴백 엔진
│   │   ├── poetry.service.ts        # 감성 시/수필 창작 엔진
│   │   └── travel.dto.ts            # DTO 및 인터페이스 정의
│   ├── app.module.ts                # 루트 애플리케이션 모듈
│   └── main.ts                      # 진입점 (포트 바인딩, CORS, HSTS)
├── scripts/                         # 환경별 부트스트랩 스크립트
│   ├── start.cjs                    # 환경별 env 로드 및 앱 기동 러너
│   ├── build.cjs                    # 환경별 빌드 파이프라인
│   └── check-db.cjs                 # 환경별 DB 즉시 진단 스크립트
├── test/                            # 테스트 스위트
│   ├── app.e2e-spec.ts              # 통합 E2E 테스트
│   └── test-database.module.ts      # 테스트용 격리 DataSource 모듈
├── Dockerfile                       # 백엔드 경량 멀티스테이지 도커파일
├── package.json                     # 의존성 및 실행 스크립트 정의
├── tsconfig.json                    # TypeScript 컴파일러 설정
├── .env.local.example               # 로컬 환경 템플릿
├── .env.development.example         # 개발(TEST DB) 환경 템플릿
└── .env.production.example          # 운영(PROD DB) 환경 템플릿
```

---

## 4. 환경 분리 및 .env 설정

본 백엔드는 **로컬(local)**, **개발(dev)**, **운영(op/prod)** 세 환경으로 완전 격리 운영됩니다.  
환경 파일은 우선순위에 따라 단 1개만 로드되며, 시스템 환경변수가 파일 내 값보다 우선합니다.

### 환경 매핑 요약

| 환경 | 파일명 | 실행 모드 | 대상 DB | 특징 |
|---|---|---|---|---|
| **로컬** | `.env.local` | `local` | `travel_local` | 개발자 로컬 PC 단독 개발 |
| **개발** | `.env.development` | `development` | `travel_test` | AWS EC2 공유 개발 DB, 콘솔 디버깅 |
| **운영** | `.env.production` | `production` | `travel_prod` | AWS EC2 실서버 운영, HSTS 및 보안 강화 |

### 환경 변수 명세

```env
# 서버 네트워크 설정
HOST=0.0.0.0            # Docker 컨테이너 및 Nginx 프록시 인입을 위해 반드시 0.0.0.0 바인딩
PORT=3001               # 백엔드 내부 포트

# 애플리케이션 환경
APP_ENV=development     # local | development | production
NODE_ENV=development    # development | production

# PostgreSQL Database 설정
DB_HOST=32.236.200.229  # DB 호스트 (Docker 내부에서는 host.docker.internal 또는 공인 IP)
DB_PORT=5432
DB_NAME=travel_test     # 개발: travel_test, 운영: travel_prod
DB_USER=travel_app      # 개발: travel_app, 운영: traverl_app
DB_PASSWORD=********
DB_SSL=false            # TLS/SSL 사용 여부 (AWS EC2 내부 통신 시 false)

# Google Gemini AI API 설정
GEMINI_API_KEY=AIzaSy...# Google AI Studio API 키 (미입력 시 폴백 모드 가동)
GEMINI_MODEL=gemini-2.5-flash
```

> [!IMPORTANT]
> **컨테이너 환경 바인딩 주의**: `HOST=127.0.0.1`로 설정할 경우 Docker 컨테이너 외부나 프론트엔드 Nginx 컨테이너에서 백엔드로의 통신이 차단(Connection Refused)됩니다. 반드시 `HOST=0.0.0.0`을 유지하세요.

---

## 5. 실행 및 빌드 명령어

### 1) 의존성 설치
```bash
cd BackEnd
npm install
```

### 2) 개발 모드 실행 (Hot Reload)
```bash
# 개발(dev) 환경 구동 (기본 포트 3001, travel_test DB 연결)
npm run start:dev

# 로컬(local) 환경 구동 (travel_local DB 연결)
npm run start:local

# 운영(prod) 설정으로 기동
npm run start:op
```

### 3) 프로덕션 빌드
```bash
# 개발 환경 빌드
npm run build:dev

# 운영 환경 빌드 (dist/ 생성)
npm run build:op
```

### 4) 백그라운드 프로덕션 실행
프로덕션 환경에서는 Docker Compose 컨테이너로 백그라운드 무중단 실행(`restart: unless-stopped`)을 권장합니다:
```bash
# 최상위 루트 디렉토리에서 실행
APP_ENV=production docker compose up -d --build backend
```

---

## 6. PostgreSQL DB 연결 및 진단

NestJS 백엔드는 서버 기동 시 TypeORM 커넥션 풀을 초기화합니다. (`synchronize: false`로 테이블을 임의 수정하지 않음)  
서버를 띄우지 않고도 **사전 DB 연결성을 즉시 진단**할 수 있습니다:

```bash
# 개발(TEST) DB 연결 진단 (travel_test)
npm run db:check -- dev

# 운영(PROD) DB 연결 진단 (travel_prod)
npm run db:check -- prod

# 로컬(LOCAL) DB 연결 진단 (travel_local)
npm run db:check -- local
```

진단 성공 시 출력 예시:
```
[Database Check] Loaded env from: .env.development
[Database Check] Connecting to 32.236.200.229:5432/travel_test as travel_app ...
[Database Check] SUCCESS! Connected to PostgreSQL 16.15
[Database Check] SELECT 1 result: 1
```

---

## 7. Docker 컨테이너 가이드

백엔드는 독립적인 경량 Alpine Node 이미지로 컨테이너화될 수 있습니다.

### 단독 빌드 및 실행
```bash
# 이미지 빌드
docker build -t travel-backend:latest .

# 컨테이너 실행 (포트 3001 바인딩)
docker run -d --name travel-backend \
  -p 3001:3001 \
  -e APP_ENV=development \
  -e HOST=0.0.0.0 \
  travel-backend:latest
```

### 루트 Docker Compose 연동
루트 디렉토리의 `docker-compose.yml`을 통해 프론트엔드와 백엔드를 동시에 오케스트레이션할 수 있습니다:
```bash
# 운영 모드로 통합 기동
APP_ENV=production docker compose up -d --build

# 개발 모드로 통합 기동
APP_ENV=development docker compose up -d --build
```

---

## 8. API 엔드포인트 명세

모든 API는 기본 프리픽스 `/api`를 사용합니다.

### 1) 시스템 헬스체크
* **`GET /api/health`**
  - **응답 (200 OK)**:
    ```json
    {
      "status": "ok",
      "timestamp": "2026-10-18T01:30:00.000Z",
      "environment": "development"
    }
    ```

* **`GET /api/health/db`**
  - **응답 (200 OK)**:
    ```json
    {
      "status": "ok",
      "database": "connected",
      "dbName": "travel_test"
    }
    ```

---

### 2) 여행 일정 생성 (`POST /api/travel/plans`)
* **Request Body (`application/json`)**:
```json
{
  "clientName": "김서연",
  "clientContact": "010-8254-9123",
  "departureCity": "서울(김포공항)",
  "destination": "제주도 (애월 & 서귀포)",
  "startDate": "2026-10-25",
  "endDate": "2026-10-27",
  "adultCount": 2,
  "childCount": 0,
  "budget": 1300000,
  "style": ["힐링/휴양", "미식/카페", "인스타감성"],
  "transportType": "RENTAL_CAR",
  "accommodationType": "HOTEL",
  "specialRequests": "바다가 보이는 오션뷰 숙소와 신선한 흑돼지, 딱새우 맛집을 꼭 포함해주세요."
}
```

* **Response Body (`200 OK`)**:
```json
{
  "id": "plan-1792253920268",
  "title": "제주도 애월 & 서귀포 푸른 쉼표 여행 (2박 3일)",
  "summary": "바다를 품은 프라이빗 오션뷰 호텔과 7인의 전문가가 엄선한 미식 로드...",
  "theme": "오션뷰 힐링 & 제주 미식 기행",
  "estimatedBudget": 1280000,
  "days": [
    {
      "day": 1,
      "date": "2026-10-25",
      "theme": "애월 해안도로와 에메랄드빛 첫 만남",
      "places": [
        {
          "name": "애월 한담해변 산책로",
          "category": "명소/자연",
          "address": "제주특별자치도 제주시 애월읍 애월로 11",
          "lat": 33.4619,
          "lng": 126.3113,
          "duration": "1시간 30분",
          "cost": 0,
          "description": "파도 소리를 따라 걷는 에메랄드빛 해안길"
        }
      ]
    }
  ],
  "createdAt": "2026-10-18T01:35:00.000Z"
}
```

---

### 3) 감성 시·수필 생성 (`POST /api/travel/poetic-reviews`)
* **Request Body (`application/json`)**:
```json
{
  "placeName": "애월 한담해변 카페 쉼표",
  "category": "카페/베이커리",
  "location": "제주 애월읍",
  "keywords": ["바다", "노을", "한라봉차", "파도소리"]
}
```

* **Response Body (`200 OK`)**:
```json
{
  "placeName": "애월 한담해변 카페 쉼표",
  "essay": "유리창 너머로 부서지는 은빛 윤슬을 바라보며 따스한 차 한 잔을 기울인다...",
  "poem": "바람이 머물다 간 자리\n파도는 쪽빛 시를 쓰고\n한라봉 향 그윽한 찻잔 위로\n노을이 붉게 물든다.",
  "generatedBy": "Gemini-2.5-flash / Procedural Fallback"
}
```

---

## 9. 단위 및 격리 테스트

백엔드 테스트는 실제 외부 DB 연결 없이 독립된 메모리/Mock DataSource 모듈을 주입하여 신속하게 수행됩니다:

```bash
# 전체 테스트 실행
npm test

# 감시 모드 테스트
npm run test:watch
```

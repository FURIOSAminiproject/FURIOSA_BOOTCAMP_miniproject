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
  │      ├── Gemini AI API (Google GenAI SDK - 환경별 GEMINI_MODEL 동적 주입)
  │      └── Procedural Fallback Engine (API Key 부재 시 무중단 자동 전환)
  │
  └── 3. PoetryService (문학적 감성 수필 & 시 창작 엔진)
```

| 분류 | 기술 스택 | 설명 |
|---|---|---|
| **Framework** | NestJS 11.x, Express | 견고한 모듈형 백엔드 프레임워크 |
| **Language** | TypeScript 5.9+ | 정적 타입 안정성 및 엄격한 DTO 유효성 검사 |
| **Runtime** | Node.js 22.x LTS | 고성능 비동기 I/O 런타임 |
| **ORM / DB** | TypeORM 0.3+, PostgreSQL 16 | 엔터프라이즈 객체 관계 매핑 및 AWS DB 연동 |
| **AI Integration** | `@google/genai` (동적 모델 연동) | `.env`의 `GEMINI_MODEL` 환경변수 기반으로 동적 모델(gemini-2.5-flash, gemini-3.8-flash 등)을 바인딩하여 7인 멀티에이전트 오케스트레이션 수행 |
| **Container & Supervision** | Docker & Docker Compose | 멀티스테이지 경량 이미지 및 `restart: always` 무중단 자동 복구 |

---

## 2. 주요 기능 및 시스템 특징

### 🤖 1) 7인의 AI 멀티에이전트 오케스트레이션
사용자의 여행 희망사항(동행자, 예산, 여행 스타일, 특별 요청)을 입력받아 7인의 전문 에이전트가 협업하여 최적의 2박 3일 또는 N박 N일 코스를 도출합니다:
- **접수 총괄 디렉터 (길라잡이)**: 고객 요구사항 정밀 분석 및 에이전트 작업 오케스트레이션
- **주요 관광지 탐색관 (명소박사)**: 권역별 명소, 숨은 비경, 시즌 뷰포인트 추천
- **미식 & 카페 큐레이터 (미식가)**: 블루리본/향토 맛집 및 감성 뷰 카페 엄선
- **맞춤 숙소 큐레이터 (안식처)**: 예산과 동행자에 부합하는 최적 숙소 추천
- **교통 & 동선 최적화관 (동선지기)**: 일자별 최단 이동 동선 계산 및 피로도 절감
- **일정 & 경비 설계사 (설계사)**: N일차 타임라인 구축 및 실시간 총경비 세부 배분
- **안전 & 품질 감수관 (감수관)**: 안전성, 예산 준수율, 동선 효율성 종합 감사

### ✍️ 2) 장소별 감성 문학 리뷰 생성 (Poetry Service)
'풍류시객' 에이전트가 추천된 각 맛집 및 카페에 대해 단순 정보 나열이 아닌, 감각적인 한국어 감성 수필 3~4문장과 서정시 한 수를 즉석에서 창작하여 여행자에게 문학적 깊이를 제공합니다.

### 🛡️ 3) Graceful Degradation (절차적 폴백 엔진 탑재)
- `GEMINI_API_KEY`가 설정되지 않았거나, 구글 API 할당량(Quota) 초과, 네트워크 장애가 발생하더라도 **서버가 500 에러를 뿜거나 중단되지 않습니다.**
- 내장된 **`generateProceduralKoreanPlan`** 및 **`generatePoeticReview`** 절차적 폴백 엔진이 요청 파라미터(목적지, 동행자, 스타일)를 정밀 분석하여, 실제 권역별(제주, 경주, 강릉, 부산, 전주 등) 지리 정보와 시간/예산/문학 리뷰를 완벽한 DTO 규격으로 즉시 생성합니다.

---

## 3. 디렉토리 구조

```
BackEnd/
├── src/
│   ├── database/                    # TypeORM 데이터베이스 모듈
│   │   ├── database.config.ts       # TypeORM 접속 옵션 및 보안 설정
│   │   ├── database.controller.ts   # /api/health/db 헬스체크 컨트롤러
│   │   ├── database.module.ts       # 데이터베이스 모듈 바인딩
│   │   └── check.ts                 # 빌드 없이 즉시 실행 가능한 DB 진단 CLI
│   ├── travel/                      # 여행 기획 및 AI 비즈니스 로직
│   │   ├── travel.controller.ts     # /api/travel 엔드포인트 라우팅
│   │   ├── travel.service.ts        # 비즈니스 오케스트레이션
│   │   ├── travel-engine.ts         # Gemini AI 연동 및 Fail-Safe 폴백 엔진
│   │   ├── poetry.service.ts        # 감성 시/수필 창작 엔진 (풍류시객)
│   │   ├── travel.types.ts          # 공통 도메인 타입 정의 (FullTravelPlan 등)
│   │   └── validation.ts            # 요청 페이로드 런타임 유효성 검증
│   ├── app.module.ts                # 루트 애플리케이션 모듈 (/api/health)
│   └── main.ts                      # 진입점 (포트 바인딩, CORS, HSTS)
├── scripts/                         # 환경별 부트스트랩 스크립트
│   ├── start.cjs                    # 환경별 env 로드 및 앱 기동 러너
│   ├── build.cjs                    # 환경별 빌드 파이프라인
│   └── check-db.cjs                 # 환경별 DB 즉시 진단 스크립트
├── test/                            # Node.js 내장 테스트 러너 기반 테스트
│   ├── api.test.cjs                 # Travel API 및 폴백 검증
│   ├── database.test.cjs            # TypeORM 스키마 불변성 검증
│   └── environment.test.cjs         # 환경별 env 분리 격리 검증
├── Dockerfile                       # 백엔드 경량 멀티스테이지 도커파일
├── ecosystem.config.cjs             # PM2 프로덕션 프로세스 관리 설정
├── package.json                     # 의존성 및 실행 스크립트 정의
├── tsconfig.json                    # TypeScript 컴파일러 설정
├── .env.local                       # 로컬 환경 설정 (travel_local DB)
├── .env.development                 # 개발(TEST DB) 환경 설정
└── .env.production                  # 운영(PROD DB) 환경 설정
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
HOST=0.0.0.0            # Docker 컨테이너 및 Nginx 프록시 인입을 위해 바인딩 (로컬 단독 실행 시 127.0.0.1)
PORT=3001               # 백엔드 내부 포트

# 애플리케이션 환경
APP_ENV=development     # local | development | production
NODE_ENV=development    # development | production

# PostgreSQL Database 설정
DB_HOST=<DB_HOST_IP>    # DB 호스트 (개발/운영: EC2 호스트 IP, 로컬: 127.0.0.1 또는 host.docker.internal)
DB_PORT=5432
DB_NAME=travel_test     # 로컬: travel_local, 개발: travel_test, 운영: travel_prod
DB_USER=travel_app      # 개발: travel_app, 운영: traverl_app
DB_PASSWORD=********    # 비공개 (환경 파일 참조)
DB_SSL=false            # TLS/SSL 사용 여부 (AWS EC2 내부 통신 시 false)

# Google Gemini AI API 설정 (동적 모델 주입)
GEMINI_API_KEY=AIzaSy...# Google AI Studio API 키 (미입력 시 내장 절차적 폴백 모드 가동)
GEMINI_MODEL=gemini-3.8-flash # 동적 모델 지정 (.env에서 gemini-2.5-flash, gemini-3.8-flash 등 자유롭게 변경 가능)
```

> [!IMPORTANT]
> **컨테이너 환경 바인딩 주의**: Docker 컨테이너 환경에서는 외부나 Nginx 프록시로부터의 인입을 위해 `HOST=0.0.0.0` 바인딩이 필요합니다 (`docker-compose.yml`에서 자동 주입됨). 로컬 PC 단독 개발 시에는 `HOST=127.0.0.1`로 구동할 수 있습니다.

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
프로덕션 환경에서는 Docker Compose 컨테이너로 백그라운드 무중단 실행(`restart: always`)을 권장합니다:
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
Database connection verified (development). No data changed.
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
      "version": "1.1.0",
      "message": "길벗 AI 여행사 백엔드 실시간 배포 성공",
      "timestamp": "2026-10-19T02:00:00.000Z"
    }
    ```

* **`GET /api/health/db`**
  - **응답 (200 OK)**:
    ```json
    {
      "status": "ok",
      "database": "connected"
    }
    ```

---

### 2) 여행 일정 생성 (`POST /api/travel/plans`)
7인의 AI 멀티에이전트가 고객의 요구사항을 분석하여 일자별 장소 타임라인, 세부 경비 내역, 추천 숙소, 이동 가이드, 감수관 종합 보고서 및 추천 맛집/카페별 감성 문학 리뷰를 통합 생성합니다 (외부 AI 장애 시 내장 절차적 엔진 자동 폴백).

* **Request Body (`application/json`)**:
```json
{
  "id": "req-1792253900000",
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
  "specialRequests": "바다가 보이는 오션뷰 숙소와 흑돼지, 딱새우 맛집 추천",
  "createdAt": "2026-10-19 11:00:00",
  "status": "PENDING_APPROVAL"
}
```

* **Response Body (`201 Created` - `FullTravelPlan`)**:
```json
{
  "requestId": "req-1792253900000",
  "title": "제주 애월 & 서귀포 푸른 쉼표 여행 (2박 3일)",
  "summary": "김서연 고객님을 위한 7인의 AI 멀티에이전트 맞춤 여행 일정입니다.",
  "highlightPoints": ["애월 한담해변 산책로", "서귀포 칠십리 오션뷰", "로컬 흑돼지 미식"],
  "days": [
    {
      "dayNumber": 1,
      "date": "2026-10-25",
      "theme": "애월 해안도로와 에메랄드빛 바다와의 첫 만남",
      "daySummary": "제주 서쪽 해안을 따라 낭만적인 풍경과 로컬 미식을 즐기는 일정",
      "places": [
        {
          "id": "p-1",
          "name": "애월 한담해변 산책로",
          "category": "ATTRACTION",
          "categoryLabel": "자연명소",
          "description": "파도 소리를 따라 걷는 에메랄드빛 해안 산책길",
          "timeSlot": "10:30 - 12:00",
          "address": "제주특별자치도 제주시 애월읍 애월로 11",
          "lat": 33.4619,
          "lng": 126.3113,
          "estimatedCost": 0,
          "recommendedBy": "명소박사",
          "specialTip": "일몰 1시간 전 방문 시 황금빛 노을 감상 가능"
        }
      ]
    }
  ],
  "costs": {
    "accommodationTotal": 390000,
    "foodAndCafeTotal": 420000,
    "transportTotal": 260000,
    "attractionTotal": 80000,
    "reserveTotal": 150000,
    "totalCost": 1300000,
    "costPerPerson": 650000,
    "budgetStatus": "OPTIMAL"
  },
  "selectedAccommodation": {
    "name": "제주 오션뷰 부티크 호텔",
    "type": "오션/시티뷰 호텔",
    "address": "제주특별자치도 서귀포시 중문관광로",
    "lat": 33.2485,
    "lng": 126.4128,
    "costPerNight": 195000,
    "recommendedReason": "전 객실 오션뷰 및 주요 행선지 동선 최적 거점"
  },
  "transportGuide": {
    "recommendedMode": "제주공항 렌터카 인수 연계",
    "routesDescription": "공항 ➔ 애월 해안도로 ➔ 서귀포 중문 순환 경로",
    "estimatedFare": 160000
  },
  "agentAuditReport": {
    "auditorName": "감수관",
    "safetyScore": 98,
    "budgetMatchScore": 96,
    "routeEfficiencyScore": 95,
    "finalOpinion": "예산 한도 준수 및 지그재그 이동 없는 최적의 순환 동선",
    "adminActionRecommendation": "승인 적극 권장"
  },
  "literaryReviews": [
    {
      "placeId": "p-2",
      "placeName": "애월 한담 쉼표 카페",
      "category": "CAFE",
      "foodOrDrink": "시그니처 한라봉 비엔나 커피",
      "essay": "통유리 너머로 부서지는 은빛 윤슬을 바라보며 따스한 차 한 잔을 기울인다...",
      "poemTitle": "찻잔에 머무는 쪽빛 바다",
      "poemVerses": [
        "흘러가는 구름 한 점 창가에 걸리고",
        "잔 속에서 피어오르는 달콤한 감귤 향기",
        "시간마저 느린 호흡으로 쉬어가는 자리에서",
        "나는 또 하나의 고요를 마음에 새긴다."
      ],
      "authorAgent": "풍류시객"
    }
  ]
}
```

---

### 3) 감성 시·수필 생성 (`POST /api/travel/poetic-reviews`)
'풍류시객' 에이전트가 단일 맛집/카페 장소 정보를 바탕으로 감성 수필(3~4문장)과 서정시 한 수를 생성합니다.

* **Request Body (`application/json` - `TravelPlace`)**:
```json
{
  "id": "p-cafe-1",
  "name": "애월 한담 쉼표 카페",
  "category": "CAFE",
  "categoryLabel": "감성 카페",
  "description": "통유리 오션뷰와 스페셜티 커피",
  "timeSlot": "14:30 - 15:30",
  "address": "제주특별자치도 제주시 애월읍 애월로 11",
  "lat": 33.4619,
  "lng": 126.3113,
  "estimatedCost": 18000,
  "recommendedBy": "미식가",
  "specialTip": "바다 전망 2층 창가석 추천"
}
```

* **Response Body (`201 Created` - `LiteraryReview`)**:
```json
{
  "placeId": "p-cafe-1",
  "placeName": "애월 한담 쉼표 카페",
  "category": "CAFE",
  "foodOrDrink": "핸드드립 원두 & 시그니처 디저트",
  "essay": "통유리 너머로 쏟아지는 부드러운 햇살 아래, 갓 내린 커피의 은은한 향기가 온 공간을 포근하게 감싸 안습니다. 쌉싸름하면서도 끝 맛이 달콤한 커피 한 모금에 길 위에서 쌓였던 여독이 봄눈처럼 스르륵 녹아내립니다.",
  "poemTitle": "찻잔에 머무는 풍경",
  "poemVerses": [
    "흘러가는 구름 한 점 창가에 걸리고",
    "잔 속에서 피어오르는 짙은 원두의 온기",
    "시간마저 느린 호흡으로 쉬어가는 자리에서",
    "나는 또 하나의 고요를 마음에 새긴다."
  ],
  "authorAgent": "풍류시객"
}
```

---

## 9. 단위 및 격리 테스트

백엔드 테스트는 Node.js 22 내장 테스트 러너(`node:test`)를 사용하여 외부 DB 변경 없이 독립된 Mock DataSource를 주입하여 신속하게 수행됩니다:

```bash
# 전체 TypeScript 컴파일 및 5대 테스트 스위트 실행
npm test
```

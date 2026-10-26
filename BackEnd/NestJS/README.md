# NestJS 여행 일정 API

NestJS 12, TypeScript 6, TypeORM, PostgreSQL 드라이버와 `@google/genai`를 사용합니다. 컨테이너 및 CI 런타임은 Node.js 22입니다.

수정 전에는 [작업 지침](AGENTS.md)과 [백엔드 구현 검토 기록](../REVIEW.md)을 확인합니다. 검토 기록의 개선 항목은 현재 미수정입니다.

장소 수집의 모듈 구성·SOLID 적용·테스트 결과·현재 장소가 2건인 이유는 [장소 모듈 README](src/places/README.md)에 정리했습니다.

## 구현 범위

`src/travel/travel-engine.ts`는 Gemini 통합 프롬프트로 일정 JSON을 생성합니다. 키가 없거나 요청·파싱 과정이 실패하면 `generateProceduralKoreanPlan`을 사용합니다. 독립적인 7개 AI 에이전트의 호출·협업 파이프라인은 없습니다.

`poetry.service.ts`는 음식점/카페의 시·수필을 Gemini로 생성하고 실패 시 내장 문구로 폴백합니다. 일정 생성 중 대상 장소는 Gemini 일정 경로에서 최대 6곳, 절차적 일정 경로에서 최대 5곳입니다. 각 AI 요청 타임아웃은 60초이므로 장애 시 즉시 결과가 반환되는 것은 아닙니다. 장소 실재성·가격·최단 동선·안전 점수는 외부 실시간 데이터로 검증하지 않습니다.

TypeORM은 기동 시 DB에 연결하고 진단 쿼리를 수행합니다. 회원가입·로그인·OAuth 사용자 정보는 `users`에 저장합니다. 일정·승인 저장 엔티티/API와 여행·관리자 API의 권한 검사는 없습니다. 프론트의 승인·반려 상태는 브라우저 메모리에서 관리됩니다.

TourAPI 장소 수집은 [수집 CLI와 서비스](docs/TOUR_INGESTION.md)로 구현했습니다. 분류·지역 코드를 조회하고 장소 목록·설명·운영시간·요금·이미지를 `place_categories`와 `places`에 추가·갱신합니다. 기존 UUID와 상세·후기는 유지하며 공개 수집 HTTP 엔드포인트는 없습니다. [매일 01:00 한국 시간 배치](src/places/batch/README.md)는 서버 시작 시 자동 등록되며 동일한 수집 서비스를 사용합니다. 별도 활성화 설정은 필요하지 않습니다.

## 디렉토리

경로 조회는 [ORS DB 캐시 모듈](src/routing-cache/README.md)을 사용합니다. `POST /api/routes`는 유효한 DB 캐시를 우선 사용하고, 없거나 만료되면 ORS 호출 후 저장합니다. 보관시간은 24시간이며 매분 만료 행을 최대 1,000개 삭제합니다. 기동 검사·정리 대상은 `ors_route_cache` 하나입니다. 신규 환경은 [ORS 전용 DDL v3](../../DataBase/ors_route_cache_schema_v3.sql)를 사용하고 기존 v2의 ORS 테이블은 그대로 재사용합니다.

2026-10-26 결정으로 ITS 제공자·저장소·전용 타입·입력 검증·설정 분기와 API를 삭제했습니다. `GET /api/traffic`는 404이며 ITS 인증키·테이블 없이 ORS를 사용할 수 있습니다. 기존 ITS DB 데이터는 보존하지만 조회·갱신·자동 정리를 수행하지 않습니다. `trafficApplied=false`를 유지하며 클라이언트가 예상시간을 표시할 때는 “실시간 교통상황이 반영되지 않은 예상시간”을 안내해야 합니다. 이번 변경은 경로·일정 화면을 새로 구현한 것은 아닙니다.

캐시 DB 실패 로그의 `dbCode`·`dbOperation`·`dbReason`으로 권한 부족(42501), 테이블/컬럼 누락, 타입 오류, 연결 실패를 구분합니다. 원본 DB 오류·접속 정보는 기록하지 않으며 HTTP 응답은 기존 형식을 유지합니다. [DB 오류 구분](src/routing-cache/README.md#db-오류-구분)에 내부/외부 헬스 확인과 서비스 계정의 읽기 전용 권한 확인 SQL을 정리했습니다.

```text
BackEnd/NestJS/
├── src/
│   ├── auth/           # 회원가입·로그인·OAuth·세션 쿠키
│   ├── users/          # User 엔티티
│   ├── database/       # 접속 옵션, 모듈, 헬스체크, 진단 CLI
│   ├── places/         # TourAPI 클라이언트, 변환, DB 저장, 수집 서비스·CLI 모듈
│   ├── routing-cache/  # ORS API, DB 캐시, 만료 정리·기동 진단
│   ├── travel/         # 컨트롤러, 입력 검증, 일정 엔진, 문학 리뷰, 타입
│   ├── app.module.ts   # 서비스 등록과 /api/health
│   └── main.ts         # 네트워크 바인딩, 선택적 TLS, /api 접두사
├── scripts/            # start.cjs, build.cjs, check-db.cjs, tour-ingest.cjs
├── test/               # api, database, environment 테스트
├── Dockerfile
├── ecosystem.config.cjs
├── package.json
└── tsconfig.json
```

상위 `BackEnd/`에도 별도 NestJS 소스가 있습니다. 현재 Compose와 워크플로우의 대상은 이 폴더입니다.

## 환경 설정

npm과 PM2는 선택한 모드의 `NestJS/.env.*` → 상위 `BackEnd/.env.*` → 시스템 환경변수 순서로 덮어씁니다. 두 파일의 순서는 Compose `env_file`과 같습니다. 파일은 선택 사항이며 실제 값은 별도로 준비합니다. DB 모듈은 `.env.local`을 추가로 읽지 않습니다.

| 모드 | 파일 | DB_NAME 기본값 | 실행 방식 |
|---|---|---|---|
| local | `.env.local` | `travel_local` | tsx + watch |
| development / dev | `.env.development` | `travel_test` | tsx + watch |
| production / prod / op | `.env.production` | `travel_prod` | `dist/main.js` |

```env
HOST=127.0.0.1
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=travel_local
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false
ENABLE_TLS=false
# 선택 설정 (실제 사용 환경에 맞게 설정)
# GEMINI_API_KEY=your_api_key
# GEMINI_MODEL=your_available_model_id
```

`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`은 연결 시 필수입니다. `DB_PORT` 기본값은 5432이고 `DB_SSL`은 `true` 또는 `false`입니다. SSL 사용 시 인증서를 검증합니다. DB 이름·계정·호스트는 설정으로 변경할 수 있습니다.

`GEMINI_MODEL` 미지정 시 코드의 기본값은 `gemini-3.8-flash`입니다. 실제 이용 가능한 모델 ID를 설정합니다. API 키가 없어도 DB 연결 등 기동 조건을 충족하면 폴백 생성을 사용할 수 있습니다.

`ENABLE_TLS=true`이면 HTTPS 리다이렉트와 HSTS 등의 헤더를 설정합니다. 직접 HTTPS로 구동하려면 존재하는 `SSL_KEY_PATH`와 `SSL_CERT_PATH`도 필요합니다. production 모드 자체가 TLS를 켜지는 않습니다. Compose Nginx는 백엔드에 HTTP로 연결하므로 일반적인 Compose 구성에서는 Nginx에서 TLS를 종료합니다. 직접 HTTPS를 켜면 Nginx upstream과 배포 스크립트의 HTTP 헬스체크도 맞춰야 합니다.

## 실행 및 빌드

```bash
cd BackEnd/NestJS
npm install
npm run db:check -- local
npm run start:local
```

```bash
# 개발 DB 환경 + 소스 watch
npm run start:dev
# 운영: 먼저 컴파일한 뒤 실행
npm run build:op
npm run start:op
```

`build:local`, `build:dev`, `build:op` / `build:prod`는 환경 파일 존재를 확인한 뒤 동일한 TypeScript 컴파일을 실행합니다. 빌드 스크립트가 DB 설정을 산출물에 주입하는 것은 아닙니다. 실행 환경은 시작 스크립트 또는 컨테이너 환경변수로 결정합니다.

`start:local`과 `start:dev`는 `tsx`로 소스를 실행하므로 생성자 의존성은 타입 메타데이터 자동 추론에만 기대지 않고 `@Inject()` 등으로 토큰을 명시합니다.

## DB 진단과 테스트

```bash
npm run db:check -- local
npm run db:check -- dev
npm run db:check -- prod
npm test
```

진단 CLI는 `SELECT current_database() AS name`으로 연결된 DB 이름을 확인하며 데이터를 변경하지 않습니다. 연결 타임아웃은 5초이고 실행 시간은 네트워크 상태 등에 따라 달라집니다. `/api/health/db`의 `SELECT 1`과 구분합니다.

`npm test`는 운영 소스를 컴파일한 뒤 기존 Node 내장 테스트 6개와 Jest 단위 테스트 4개를 실행합니다. 장소 수집 검증용 테스트 25개는 로컬에서만 보관하며 배포 커밋에는 포함하지 않습니다. 해당 파일이 있는 로컬 환경에서는 총 35개가 실행됩니다. `npm run test:e2e -- --runInBand`는 모킹한 앱의 `/api` 응답을 검사합니다. API 테스트는 Mock DataSource를 사용하므로 운영 DB 연결 성공을 검증하는 테스트는 아닙니다. `synchronize`, `migrationsRun`, `dropSchema`는 모두 `false`입니다.

## TourAPI 장소 수집

선택한 환경 파일 또는 시스템 환경에 TOUR_API_KEY를 설정한 뒤 실행합니다. 실제 키는 [.env.example](.env.example)을 참고해 별도 준비합니다.

```powershell
# 개발 DB, 부산 사하구 관광지 2건과 상세 정보
npm run tour:ingest -- dev --region 26 --district 380 --content-type 12 --page-size 2 --max-pages 1

# 변경분: 표시·비표시 모두 확인, 상세 호출은 생략
npm run tour:ingest -- dev --mode sync --modified-since 20261021 --region 26 --list-only
```

기본은 한 페이지·상세 포함이며 API 예산은 실행당 200회입니다. nextPages가 있으면 전체 수집이 끝난 것이 아닙니다. 운영 모드는 빌드 후 dist CLI를 사용합니다. 상세 옵션·부분 실패·요금 해석·재수집 정책·실제 개발 DB 검증은 [수집 문서](docs/TOUR_INGESTION.md)를 참고합니다. 회원 인증 모듈이나 JWT_SECRET 없이 실행할 수 있고 후기·회원 테이블은 수정하지 않습니다.

CI·Docker는 Node 22를 사용합니다. NestJS 12의 ESM 패키지를 Jest에서 불러오기 위해 단위·E2E 설정은 `tsconfig.spec.json`과 `useESM: true`를 사용하며 `.ts`를 ESM으로 처리합니다. 운영 컴파일은 기존 `tsconfig.build.json`을 유지합니다. CommonJS로 변환한 테스트가 Node 24.9 이상에서만 우연히 통과할 수 있으므로 CI의 Node 22에서도 확인합니다. [Jest의 require(ESM) 버전 차이](https://jestjs.io/docs/ecmascript-modules#require-of-esm)

## API

모든 경로는 `/api` 접두사를 사용합니다.

| Method | 경로 | 성공 상태 | 동작 |
|---|---|---|---|
| GET | `/api/health` | 200 | status, version, message, timestamp 반환 |
| GET | `/api/health/db` | 200 | `SELECT 1`; 실패 시 503 |
| POST | `/api/travel/plans` | 201 | `FullTravelPlan` 반환 |
| POST | `/api/travel/poetic-reviews` | 201 | `LiteraryReview` 반환 |

`/api/health`는 DB 쿼리를 하지 않습니다. 입력 검증 실패는 400입니다.

일정 요청 예시:

```json
{
  "id": "req-example-1",
  "clientName": "홍길동",
  "departureCity": "서울",
  "destination": "제주",
  "startDate": "2026-10-25",
  "endDate": "2026-10-27",
  "adultCount": 2,
  "childCount": 0,
  "budget": 1300000,
  "style": ["힐링/휴양", "미식/카페"],
  "transportType": "RENTAL_CAR",
  "accommodationType": "HOTEL",
  "status": "PENDING_APPROVAL"
}
```

필수 문자열은 `id`, `clientName`, `departureCity`, `destination`이며 공백만으로 구성할 수 없습니다. 문자열 검증 함수가 처리하는 필드는 최대 5,000자입니다. 여행 날짜는 유효한 `YYYY-MM-DD`, 기간은 양끝 포함 1~10일이어야 합니다. 성인은 1~100명, 아동은 0~100명, 예산은 1~1,000,000,000의 정수입니다. `style`은 최대 20개, 각 최대 100자의 문자열 배열이며 빈 배열도 허용합니다. 선택 필드에는 `clientContact`, `specialRequests`, `createdAt`, `adminNote`, `approvedAt`, `approverName`이 있으며 생략하거나 빈 문자열을 사용할 수 있지만 `null`은 허용하지 않습니다.

- 교통: `KTX_TRAIN`, `RENTAL_CAR`, `OWN_CAR`, `FLIGHT`, `PUBLIC_TRANSIT`
- 숙소: `HOTEL`, `HANOK`, `RESORT`, `PENSION`, `POOL_VILLA`
- 상태: `ANALYZING`, `PENDING_APPROVAL`, `APPROVED`, `REVISING`, `REJECTED`

상태 필드는 요청 값 검증용이며 서버 승인 권한을 의미하지 않습니다.

단일 문학 리뷰 요청은 `id`, `name`, `categoryLabel`, `description`, `address`와 `category`(`CAFE` 또는 `RESTAURANT`)가 필요하며 `specialTip`은 선택입니다. 응답 타입의 전체 필드는 [travel.types.ts](src/travel/travel.types.ts), 런타임 입력 조건은 [validation.ts](src/travel/validation.ts)를 기준으로 확인합니다.

## Docker

저장소 루트에서 환경 파일을 준비한 후 실행합니다.

```bash
APP_ENV=production docker compose up -d --build backend
```

컨테이너는 `node dist/main.js`를 직접 실행하므로 `.env` 파일을 시작 스크립트로 읽지 않습니다. Compose가 `BackEnd/NestJS/.env.${APP_ENV}` 다음 `BackEnd/.env.${APP_ENV}`를 읽어 환경변수로 주입하며 뒤의 파일 값이 우선합니다. `HOST=0.0.0.0`, `PORT=3001`은 Compose에서 지정합니다.

이 폴더에서 단독 실행하는 예시입니다. DB 설정을 전달하도록 `--env-file`을 지정합니다. 같은 값들을 각각 `-e`로 전달하는 방식도 가능합니다.

```bash
docker build -t travel-backend .
docker run -d --name travel-backend --env-file .env.production --add-host host.docker.internal:host-gateway -e HOST=0.0.0.0 -p 127.0.0.1:3001:3001 travel-backend
```

컨테이너의 DB_HOST를 실제 접근 가능한 주소로 설정합니다. 호스트 DB라면 `host.docker.internal` 등을 사용합니다. 배포 중 컨테이너 교체에 따른 중단이 발생할 수 있습니다. [CI/CD 상세](../../CI_CD/BackEnd/nestjs/README.md)를 참고합니다.

## 병합된 인증 API와 배포 설정

인증 API는 상대 브랜치의 `/auth/*` 경로를 유지하며, 여행·진단 API는 기존 `/api/*`를 유지합니다. 공통 설정은 `src/configure-app.ts`입니다.

| 경로 | 동작 |
|---|---|
| POST /auth/register | 이름·이메일·비밀번호 검증, bcrypt 해시를 users에 저장 |
| POST /auth/login | 비밀번호 확인 후 HttpOnly 세션 쿠키 발급 |
| GET /auth/me | 쿠키의 JWT와 DB 사용자를 확인 |
| POST /auth/logout | 브라우저의 세션 쿠키 삭제 |
| GET /auth/{google,kakao,naver} | state 쿠키와 공급자 인증 URL 발급 |
| GET /auth/{google,kakao,naver}/callback | state 검증, 토큰·프로필 조회, 사용자 저장·세션 발급 |

선택한 `.env.local` / `.env.development` / `.env.production`에 다음 값을 준비합니다. npm·PM2·Compose 모두 서비스 파일보다 상위 `BackEnd/.env.<mode>`의 값이 우선합니다. ConfigModule은 별도 `.env`를 추가로 읽지 않습니다. 서비스 폴더만 배포하면 서비스 파일 또는 시스템 환경에 필요한 값을 모두 준비합니다.

- `JWT_SECRET`: 32자 이상의 무작위 비밀값이 필수입니다. 기본 비밀값은 제공하지 않으며 누락 시 앱 기동이 실패합니다. `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`로 생성한 값을 안전하게 보관합니다.
- `FRONTEND_URL`: 로그인 후 돌아갈 실제 프론트 origin. 기본은 Vite 실행 스크립트의 80번 포트에 맞춘 `http://localhost`입니다. CORS credentials도 이 origin에만 허용합니다.
- 공급자별 `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`; `KAKAO_*`, `NAVER_*`도 같은 이름 규칙입니다. 카카오 Client Secret만 선택적입니다.
- 콜백 URL은 로컬에서 Vite `/auth` 프록시를 경유하는 `http://localhost/auth/google/callback`, 운영에서는 `https://roadfriendtrip.freeddns.org/auth/google/callback`을 사용합니다. Google Console의 웹 애플리케이션 OAuth 클라이언트에 두 주소를 각각 승인된 리디렉션 URI로 정확히 등록합니다. 운영 `FRONTEND_URL`도 `https://roadfriendtrip.freeddns.org`로 맞추고 브라우저에서도 해당 도메인으로 접속합니다. 시작 요청과 콜백의 호스트가 다르면 state 쿠키가 전달되지 않습니다.
- Google은 localhost 외 IP 주소 콜백을 허용하지 않습니다. 서버는 공인 IP·원격 HTTP·잘못된 콜백 경로를 인증 요청 전에 거부합니다. HTTPS 인증서만 추가해 공인 IP 주소를 사용하는 것으로 해결되지 않습니다.
- production 세션·state 쿠키에는 Secure가 붙으므로 외부 접속은 HTTPS가 필요합니다. 시작 스크립트의 로컬 HTTP 실행은 local/development 모드를 사용합니다. Compose의 NODE_ENV 기본값은 APP_ENV와 별개로 production이므로 HTTP로 인증을 검증할 때는 NODE_ENV=development도 명시합니다. DB_SSL과 별개입니다.

[환경 변수 예시](.env.example)는 항목 안내용입니다. 실제 키·비밀번호를 넣어 커밋하지 않습니다. 기존 `users` 테이블이 있는 DB에는 [OAuth 컬럼 SQL](migrations/20261019_add_oauth_columns.sql)을 별도로 검토·적용해야 합니다. 이 SQL은 users 테이블을 새로 만들지 않으며, 앱·배포가 스키마를 자동 생성하거나 마이그레이션하지 않습니다.

인증 기능은 기존 여행 API와 관리자 화면에 접근 제한을 자동 적용하지 않습니다. 로그인 화면은 별도 `FrontEnd/v2/v2`에 있으며 현재 Compose frontend는 `FrontEnd/v1` 여행 화면을 배포합니다.

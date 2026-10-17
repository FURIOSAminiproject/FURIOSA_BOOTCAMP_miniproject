# NestJS + TypeORM 여행 API

로컬(local), 개발(development), 운영(production) 세 환경만 사용합니다. Node.js 22.16 이상이 필요합니다.

| 환경 | 백엔드 파일 | DB | 빌드 | 백엔드 실행 |
| --- | --- | --- | --- | --- |
| 로컬 | .env.local | 로컬 PostgreSQL / travel_local | npm run build:local | npm run start:local |
| 개발 | .env.development | 공유 TEST DB / travel_test | npm run build:dev | npm run start:dev |
| 운영 | .env.production | 운영 DB / travel_prod | npm run build:op | npm run start:op |

BackEnd에서 `npm install` 후 위 명령을 실행합니다. 파일이 없으면 해당 `.example`을 복사하세요.
환경 파일은 하나만 읽고, 시스템 환경 변수가 파일 값보다 우선합니다. APP_ENV는 선택한 환경이며 NODE_ENV는 로컬/개발에서 development, 운영에서 production입니다.
실제 .env.* 파일은 Git에서 제외하고 .example만 공유합니다. 기존 .env 공통 파일은 사용하지 않습니다.

## PostgreSQL / TypeORM

DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_SSL을 읽어 NestJS 시작 시 연결합니다.
로컬은 PostgreSQL을 별도로 설치/실행하고 travel_local DB와 계정 비밀번호를 준비해야 합니다. 환경 파일만으로 DB가 생성되지는 않습니다.
개발은 기존 TEST 접속 설정을 유지합니다. 운영 계정은 별도로 입력해야 합니다. 팀원 계정의 운영 권한은 읽기 전용입니다.
DB_SSL=true일 때 서버 인증서를 검증합니다. 서버가 TLS를 지원할 때만 사용하세요.

synchronize, migrationsRun, dropSchema는 모든 환경에서 false입니다. 시작 시 테이블을 생성/변경/삭제하지 않습니다.
아직 Entity/여행 계획 저장 기능은 추가하지 않았습니다. 현재 작업은 TypeORM 연결 기반이며 기존 여행 생성 API는 그대로 동작합니다.

```powershell
npm run db:check -- prod
npm run db:check -- local
npm run db:check -- dev
```

연결 검사는 SELECT만 실행하며 데이터를 변경하지 않습니다. 모드는 prod, local, dev를 사용할 수 있습니다.
`GET /api/health`는 서버 상태, `GET /api/health/db`는 SELECT 1로 DB 연결을 확인합니다. DB 접속 실패 시 서버 시작도 실패합니다.

## FrontEnd

| 환경 | 파일 | 실행/빌드 |
| --- | --- | --- |
| 로컬 | .env.local | npm run start::local / npm run build:local |
| 개발 | .env.development | npm run start:dev / npm run build:dev |
| 운영 | .env.production | npm run start::prod / npm run build:prod |

Vite는 예약된 mode 이름 local 대신 localdev를 사용하고 .env.local 파일에 명시적으로 매핑합니다.
Vite 자동 환경 파일 로딩은 끄고 선택한 파일 하나만 읽습니다. 다른 환경의 .local 파일이 섞이지 않습니다.
BACKEND_URL은 개발/preview 프록시 전용이며 브라우저는 /api만 호출합니다. 기본 FrontEnd 포트는 80, NestJS는 3001입니다.
운영 정적 웹 서버에서는 /api를 NestJS로 연결하는 리버스 프록시가 필요합니다.

## API / Gemini

POST /api/travel/plans: TravelRequest JSON으로 여행 계획 생성.
POST /api/travel/poetic-reviews: 음식점/카페 TravelPlace JSON으로 수필·시 생성.
GEMINI_API_KEY와 GEMINI_MODEL은 BackEnd 환경 파일에만 넣습니다. 키가 없거나 호출에 실패하면 기존 예시 데이터 대체 동작을 사용합니다.

검증: npm test (DB 대신 테스트용 DataSource를 주입하며 실제 DB에 접속하지 않습니다).

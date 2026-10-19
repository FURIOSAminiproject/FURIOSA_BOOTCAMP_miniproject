# 길벗 AI 여행사 (Furiosa Mini Project)

국내 여행 일정과 시·수필을 생성하고, 일정 탐색 및 관리자 승인 흐름을 체험하는 웹 프로젝트입니다.

- 프로젝트 기간: 2026.10.16 ~ 2026.10.30
- 과정: 퓨리오사 AI 부트캠프 미니 프로젝트
- 팀원: 이동욱, 이지석, 장동율, 조정우

## 현재 구현 범위

NestJS는 Gemini에 통합 프롬프트를 보내 일정을 생성하며, 키가 없거나 생성에 실패하면 내장 절차적 일정 엔진을 사용합니다. 문학 리뷰는 별도 Gemini 요청과 폴백으로 생성하며, 일정당 생성 대상은 Gemini 경로 최대 6곳, 절차적 일정 경로 최대 5곳입니다.

프론트엔드는 길라잡이부터 풍류시객까지 8개 역할을 소개합니다. 진행 로그는 고정 문구와 지연으로 구성된 시각화이며, 로그 표시 후 일정 생성 API를 호출합니다. 독립적인 8개 AI 프로세스나 서버 진행 로그 스트리밍은 구현되어 있지 않습니다.

일정·승인·반려·통계는 React 메모리 상태로 관리됩니다. 새로고침하면 프리셋으로 초기화되며, 관리자 모드는 기본 활성화됩니다. 서버 인증·권한 검사와 일정/승인 데이터 DB 저장 API는 없습니다. TypeORM은 DB 연결 및 진단에 사용됩니다.

FastAPI는 별도 샘플 서비스입니다. 추천 API는 고정된 2개 장소를 요청 지역과 스타일에 맞춰 반환하며, 현재 프론트엔드 일정 생성이나 NestJS 처리 흐름에서 호출하지 않습니다.

## 기술 및 구조

| 구성 | 코드 기준 기술 | 위치 |
|---|---|---|
| 웹 | React 19, TypeScript 7, Vite 8, Tailwind CSS 4, Leaflet, Motion | `FrontEnd/` |
| 일정 API | NestJS 11, TypeScript 5.9, TypeORM, PostgreSQL 드라이버, Google GenAI SDK | `BackEnd/nestjs/` |
| 샘플 추천 API | FastAPI, Pydantic, Uvicorn, Python 3.12 컨테이너 | `BackEnd/fastapi/` |
| 배포 | GitHub Actions, Docker Compose, Nginx | `.github/workflows/`, `CI_CD/`, `docker-compose.yml` |

Node 기반 컨테이너와 CI는 Node.js 22를 사용합니다. PostgreSQL 서버는 Compose에 포함되지 않으므로 별도로 준비해야 하며, 실제 서버 버전·주소·계정은 운영 환경에서 확인합니다.

```text
브라우저 → frontend Nginx :80 / :443
             ├─ /          → React 정적 번들
             ├─ /api/      → backend:3001 → Gemini / PostgreSQL
             └─ /fastapi/  → fastapi:8000 (접두사 제거)
```

Vite 개발/preview 프록시는 `/api`만 지원합니다. HTTPS는 Nginx 컨테이너 시작 시 마운트된 인증서가 발견될 때 활성화됩니다.

`BackEnd/` 루트에도 별도의 NestJS 소스·스크립트·패키지가 남아 있습니다. 현재 Compose와 NestJS GitHub Actions는 `BackEnd/nestjs/`를 사용하며, 두 소스는 자동 동기화되지 않습니다.

## 로컬 실행

로컬 Node.js는 22.12 이상인 22.x 버전과 접근 가능한 PostgreSQL을 준비합니다. 프론트의 잠금 파일에 기록된 Vite가 Node 22.12 이상을 요구합니다. `BackEnd/nestjs/.env.local`을 만들고 아래 값을 실제 연결 정보로 설정합니다. `DB_NAME` 기본값은 local=`travel_local`, development=`travel_test`, production=`travel_prod`이며 환경변수로 재정의할 수 있습니다.

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=travel_local
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false
HOST=127.0.0.1
PORT=3001
ENABLE_TLS=false
# 선택 설정: GEMINI_API_KEY, GEMINI_MODEL
```

```powershell
cd BackEnd/nestjs
npm install
npm run db:check -- local
npm run start:local
```

새 터미널에서 실행합니다.

```powershell
cd FrontEnd
npm install
npm run start:local
```

브라우저에서 `http://localhost`로 접속합니다. Vite가 요청하는 기본 웹 포트는 80입니다. `strictPort`가 설정되어 있지 않아 점유 시 다른 포트로 넘어갈 수 있으므로 터미널에 표시된 실제 접속 URL을 확인합니다. OS의 바인딩 권한도 필요합니다. 기본 `/api` 프록시 대상은 `http://127.0.0.1:3001`입니다.

## 환경별 명령

각 프로젝트 폴더에서 실행합니다. 운영 실행 전에 빌드해야 합니다.

| 환경 | 환경 파일 | NestJS 빌드 / 실행 | FrontEnd 빌드 / 실행 |
|---|---|---|---|
| 로컬 | `.env.local` | `build:local` / `start:local` | `build:local` / `start:local` |
| 개발 | `.env.development` | `build:dev` / `start:dev` | `build:dev` / `start:dev` |
| 운영 | `.env.production` | `build:op` / `start:op` | `build:op` / `start:op` |

표의 명령은 `npm run <명령>`으로 실행합니다. NestJS 개발/로컬은 소스를 watch 모드로, 운영은 `dist/main.js`를 실행합니다. 프론트 운영 명령은 빌드된 `dist/`를 Vite preview로 제공합니다. 실제 배포는 Nginx를 사용합니다.

## API

| Method | 경로 | 기능 |
|---|---|---|
| GET | `/api/health` | NestJS 프로세스 응답 확인 |
| GET | `/api/health/db` | DB `SELECT 1` 확인 |
| POST | `/api/travel/plans` | 여행 일정 및 일부 장소의 문학 리뷰 생성 |
| POST | `/api/travel/poetic-reviews` | 단일 음식점/카페 문학 리뷰 생성 |
| GET | `/fastapi/health` | Nginx 경유 FastAPI 상태 확인 |
| POST | `/fastapi/api/v1/recommend` | Nginx 경유 샘플 추천 |

NestJS `/api/health`는 DB 쿼리를 수행하지 않습니다. DB 장애 진단은 `/api/health/db`를 사용합니다.

## Docker 및 검증

NestJS 환경 파일을 준비한 뒤 저장소 루트에서 실행합니다. 컨테이너에서 호스트 DB에 연결할 때는 `DB_HOST=host.docker.internal` 등을 사용합니다.

```powershell
$env:APP_ENV="local"
docker compose up -d --build
docker compose ps
```

Compose 기본 환경은 `production`입니다. 단일 컨테이너 교체 방식이므로 배포 중 일시 중단이 발생할 수 있습니다.

```powershell
cd BackEnd/nestjs
npm test
```

프론트엔드는 `npm run lint`로 타입을 검사하고 `npm run build`로 번들을 생성합니다.

## 상세 문서

- [FrontEnd](FrontEnd/README.md)
- [BackEnd 구성](BackEnd/README.md), [NestJS](BackEnd/nestjs/README.md), [FastAPI](BackEnd/fastapi/README.md)
- [DB 연결 및 진단](DataBase/README.md)
- [Docker 실행](Docker/README.md)
- [CI/CD 및 HTTPS 운영](CI_CD/README.md)
- [기타 자료와 회의록](ETC/README.md)

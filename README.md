# 길벗 AI 여행사 (Furiosa Mini Project)

국내 여행 일정과 시·수필을 생성하고, 일정 탐색 및 관리자 승인 흐름을 체험하는 웹 프로젝트입니다.

- 프로젝트 기간: 2026.10.16 ~ 2026.10.30
- 과정: 퓨리오사 AI 부트캠프 미니 프로젝트
- 팀원: 이지석, 장동율

## 현재 구현 범위

NestJS는 Gemini에 통합 프롬프트를 보내 일정을 생성하며, 키가 없거나 생성에 실패하면 내장 절차적 일정 엔진을 사용합니다. 문학 리뷰는 별도 Gemini 요청과 폴백으로 생성하며, 일정당 생성 대상은 Gemini 경로 최대 6곳, 절차적 일정 경로 최대 5곳입니다.

프론트엔드는 길라잡이부터 풍류시객까지 8개 역할을 소개합니다. 진행 로그는 고정 문구와 지연으로 구성된 시각화이며, 로그 표시 후 일정 생성 API를 호출합니다. 독립적인 8개 AI 프로세스나 서버 진행 로그 스트리밍은 구현되어 있지 않습니다.

일정·승인·반려·통계는 React 메모리 상태로 관리됩니다. 새로고침하면 프리셋으로 초기화되며, 관리자 모드는 기본 활성화됩니다. 서버에는 회원가입·로그인·OAuth와 users 저장이 있습니다. 여행·관리자 API 권한 검사와 일정/승인 데이터 DB 저장은 없습니다. 로그인 화면은 별도 v2이며 현재 배포는 v1 여행 화면입니다.

FastAPI는 별도 샘플 서비스입니다. 추천 API는 고정된 2개 장소를 요청 지역과 스타일에 맞춰 반환하며, 현재 프론트엔드 일정 생성이나 NestJS 처리 흐름에서 호출하지 않습니다.

## 기술 및 구조

| 구성 | 코드 기준 기술 | 위치 |
|---|---|---|
| 웹 | React 19, TypeScript 7, Vite 8, Tailwind CSS 4, Leaflet, Motion | `FrontEnd/v1/` |
| 일정 API | NestJS 12, TypeScript 6, TypeORM, PostgreSQL 드라이버, Google GenAI SDK | `BackEnd/NestJS/` |
| 샘플 추천 API | FastAPI, Pydantic, Uvicorn, Python 3.12 컨테이너 | `BackEnd/FastAPI/` |
| 지도·경로 | Leaflet, OpenStreetMap 타일, 외부 HeiGIT ORS API·DB 캐시 | `FrontEnd/v1/`, `BackEnd/NestJS/src/routing-cache/` |
| 배포 | GitHub Actions, Docker Compose, Nginx | `.github/workflows/`, `CI_CD/`, `docker-compose.yml` |
| EC2 IP 인증서 폐기 도구 | Python 3.9 이상, OpenSSL, EC2 IMDSv2, Certbot Docker | `CI_CD/certificates/` |

Node 기반 컨테이너와 CI는 Node.js 22를 사용합니다. PostgreSQL 서버는 Compose에 포함되지 않으므로 별도로 준비해야 하며, 실제 서버 버전·주소·계정은 운영 환경에서 확인합니다.

```text
브라우저 → frontend Nginx :80 / :443
             ├─ /          → React 정적 번들
             ├─ /api/      → backend:3001 → Gemini / PostgreSQL
             └─ /fastapi/  → fastapi:8000 (접두사 제거)
```

Vite 개발/preview 프록시는 `/api`만 지원합니다. HTTPS는 Nginx 컨테이너 시작 시 마운트된 인증서·개인키 쌍을 선택하면 활성화됩니다. IP 인증서 폐기 도구가 차단한 동일 인증서는 선택에서 제외합니다.

`BackEnd/` 루트에도 별도의 NestJS 소스·스크립트·패키지가 남아 있습니다. 현재 Compose와 NestJS GitHub Actions는 `BackEnd/NestJS/`를 사용하며, 두 소스는 자동 동기화되지 않습니다.

## 로컬 실행

로컬 Node.js는 22.12 이상인 22.x 버전과 접근 가능한 PostgreSQL을 준비합니다. 프론트의 잠금 파일에 기록된 Vite가 Node 22.12 이상을 요구합니다. `BackEnd/NestJS/.env.local`을 만들고 아래 값을 실제 연결 정보로 설정합니다. `DB_NAME` 기본값은 local=`travel_local`, development=`travel_test`, production=`travel_prod`이며 환경변수로 재정의할 수 있습니다.

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
cd BackEnd/NestJS
npm install
npm run db:check -- local
npm run start:local
```

새 터미널에서 실행합니다.

```powershell
cd FrontEnd/v1
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
위 명령은 frontend·backend·fastapi를 시작합니다. 경로 조회는 NestJS에서 외부 ORS API를 호출하므로 별도 경로 엔진 컨테이너가 필요하지 않습니다.

```powershell
cd BackEnd/NestJS
npm test
```

프론트엔드는 `npm run lint`로 타입을 검사하고 `npm run build`로 번들을 생성합니다.

## 지도와 외부 ORS API

지도는 Leaflet으로 표시하고 OpenStreetMap의 배경 타일을 사용합니다. 경로는 NestJS가 외부 HeiGIT ORS API에 요청하며, 자체 ORS 서버는 운영하지 않습니다.

```text
브라우저 → OpenStreetMap 배경 타일
브라우저 → POST /api/routes → NestJS → 유효한 PostgreSQL 캐시
                                     └→ 캐시 미스 시 외부 HeiGIT ORS API
```

자동차(`driving-car`)·도보(`foot-walking`)와 추천/최단 경로, 거리·예상시간·경로 좌표를 기존 API로 제공합니다. 성공한 경로는 DB에 24시간 캐시하고, 만료 후 다음 요청에서 다시 조회합니다. ORS 키는 서버의 `ORS_API_KEY`로 설정하며 브라우저에는 전달하지 않습니다. 예상시간에는 실시간 교통 정체가 반영되지 않습니다.

미니프로젝트에서는 배경 지도와 외부 ORS의 데이터 갱신 시점 차이를 감안합니다. `fetchedAt`은 API 응답 수집 시각이며 원본 OSM의 갱신 시각이 아닙니다. 지도와 경로 데이터 버전을 강제로 일치시키지 않습니다.

자체 ORS용 Compose 확장·설정·배포 스크립트·GitHub Actions는 제거했습니다. 기존 EC2에 이미 생성된 컨테이너는 코드 삭제만으로 중지되지 않으므로 [전환 시 중지 절차](Docker/README.md#기존-자체-ors-중지)를 한 번 실행합니다. 외부 API 설정·요청 예시는 [ORS 경로와 캐시 안내](BackEnd/NestJS/src/routing-cache/README.md)를 따릅니다.

## EC2 IP 인증서 관리

[IP 인증서 폐기 도구](CI_CD/certificates/README.md)는 EC2의 IP가 변경되어 이전 주소를 더 이상 사용하지 않을 때, 지정한 인증서를 점검하고 Let's Encrypt에 폐기를 요청하는 별도 관리 명령입니다. **현재 배포 스크립트·GitHub Actions가 자동 호출하지는 않습니다.**

| 파일 | 역할 |
|---|---|
| [revoke_ip_certificates.py](CI_CD/certificates/revoke_ip_certificates.py) | EC2 IP·인증서 점검, 대상의 자동 갱신 중단, 폐기 요청 및 결과 기록 |
| [docker-entrypoint.sh](FrontEnd/v1/docker-entrypoint.sh) | 동일 lineage의 인증서·키 선택, 차단된 동일 leaf 인증서 제외 |
| [폐기 도구 테스트](CI_CD/certificates/tests/test_revoke_ip_certificates.py) | IP 변경·실패·재시도·Nginx 선택 등 오프라인 검증 |

- IMDSv2로 모든 네트워크 인터페이스의 공인 IPv4를 확인하며, 현재 할당된 IP 인증서는 유지합니다. 조회 실패나 공인 IP가 없는 경우에는 폐기를 진행하지 않습니다.
- 실제 인증서 SAN이 공인 IPv4 하나인 대상만 처리합니다. 도메인·혼합 SAN·여러 IP·IPv6 인증서는 자동 폐기하지 않습니다.
- 기본 실행은 읽기 전용 점검입니다. `--apply`에서만 파일 변경과 실제 폐기 요청을 수행합니다. Stop/EIP 해제 전에 현재 IP 인증서도 폐기하려면 `--retire-current-ip`을 추가합니다.
- 적용 시 폐기 의도를 기록하고 해당 lineage의 자동 갱신을 끕니다. 실패·타임아웃 때 차단 상태를 유지하고, CA의 확인 결과와 성공 기록을 구분합니다. 기존 인증서·개인키 파일을 자동 삭제하지 않습니다.

아래는 **EC2 Linux 호스트의 저장소 루트**에서 실행하는 점검 예시입니다. 인증서를 발급한 기존 Certbot 계정·파일, Python 3.9 이상, OpenSSL, Docker가 필요합니다.

```bash
read -r -p "점검할 Certbot 인증서 이름(lineage): " CERT_NAME
sudo python3 CI_CD/certificates/revoke_ip_certificates.py --cert-name "$CERT_NAME"
```

Nginx의 차단 처리는 **새 진입점이 포함된 frontend 이미지를 반영한 후 컨테이너를 재시작할 때** 적용됩니다. 실행 중인 Nginx의 인증서를 즉시 교체하지 않습니다. 다른 사용 가능한 인증서 쌍이 없으면 HTTP로 시작하므로 서비스 종료·HTTPS 제공 정책을 확인합니다.

신규 발급·일반 갱신의 IP 검사, 현재 IP에 맞는 인증서 자동 선택, 자동 실행 스케줄·EC2 종료 훅·Nginx 자동 재시작은 별도 연결이 필요합니다. 실제 적용·재시도 절차는 [도구 사용 설명](CI_CD/certificates/README.md)을 따릅니다.

```bash
# AWS·CA·Docker 데몬 호출 없이 폐기 도구와 Nginx 진입점 분기 검증
python3 -B -m unittest discover -s CI_CD/certificates/tests -v
```

27개 테스트가 통과했으며, IMDS·Certbot·nginx는 모킹하고 SAN·만료 파싱은 로컬 자체 서명 인증서로도 확인했습니다. 실제 EC2 배포·CA 폐기·컨테이너 Nginx TLS 연동 검증과 구분합니다.

## 상세 문서

- [외부 ORS 경로와 DB 캐시](BackEnd/NestJS/src/routing-cache/README.md): 자동차·도보 경로 조회, 서버 API 키 설정, 24시간 캐시.
- [FrontEnd](FrontEnd/README.md)
- [BackEnd 구성](BackEnd/README.md), [NestJS](BackEnd/NestJS/README.md), [FastAPI](BackEnd/FastAPI/README.md)
- [DB 연결 및 진단](DataBase/README.md)
- [Docker 실행](Docker/README.md)
- [CI/CD 및 HTTPS 운영](CI_CD/README.md)
- [GitHub Actions 워크플로우](.github/workflows/README.md)
- [EC2 IP 인증서 폐기 도구](CI_CD/certificates/README.md)
- [기타 자료와 회의록](ETC/README.md)

각 폴더의 `README.md`는 구조·사용법, `AGENTS.md`는 AI 작업 지침, `REVIEW.md`는 검토 시점의 문제·재현 결과·검증 범위를 담습니다. 변경 작업 전에 해당 폴더의 지침과 검토 기록을 함께 확인합니다.

인증 통합 후에는 기존 DB 환경변수에 더해 32자 이상의 `JWT_SECRET`이 필요합니다. OAuth 공급자·콜백·FRONTEND_URL 및 기존 users 테이블의 수동 SQL 준비는 [NestJS 인증 설정](BackEnd/NestJS/README.md)을 확인합니다. 현재 Nginx는 `/api/`, `/auth/`, `/fastapi/`를 프록시하며 Compose frontend 빌드 컨텍스트는 `FrontEnd/v1`입니다.

# PostgreSQL 연결 및 진단 안내

현재 NestJS는 PostgreSQL에 연결하고 상태를 확인하며 `users`에 회원가입·OAuth 사용자를 저장합니다. 일정·승인 데이터를 저장하는 엔티티·저장 API는 구현되어 있지 않습니다. 프론트의 일정과 승인 상태는 React 메모리 상태입니다.

## 최신 장소 스키마 — 2026-10-22

현재 장소 영역의 기준은 [DDL v2](place_schema_v2.sql), [전체 테이블 명세](table_spec_2026-10-18.md), [통합 설계 설명](place_design_v2.md)입니다. 테이블 명세 파일명은 기존 링크를 위해 유지하며 본문은 2026-10-22 기준으로 갱신했습니다.

| 테이블 | 한글명 | 컬럼 수 | 출처 |
|---|---|---:|---|
| place_categories | 장소 분류 | 5 | TourAPI 분류 코드·이름과 내부 계층 연결 |
| places | 장소 정보 | 32 | TourAPI 장소 정보와 최신 수집 정보 |
| place_reviews | 장소 후기 | 7 | 로그인 사용자 입력과 작성·수정 시각 |

place_category_map과 place_sources는 제외했습니다. places.category_id로 소분류 하나를 직접 연결하고 대·중분류는 상위 분류로 조회합니다. 외부 콘텐츠 ID·원본 JSON·수집 시각은 places에 유지합니다. 좋아요·수집 관리·ORS·ITS 전용 테이블은 최신 DDL에 포함하지 않습니다. ORS·ITS 연동은 이번 배포 범위에 포함하지 않습니다.

TourAPI 수집 로직은 [NestJS 수집 서비스·CLI](../BackEnd/NestJS/docs/TOUR_INGESTION.md)로 구현했습니다. 개발 DB에 분류 315개와 관광지 2개의 목록·상세를 실제 저장하고 재수집 시 UUID·상세 유지와 중복 방지를 확인했습니다. 출처 URL·수집 방식을 places에 추가했으며 회원·후기 데이터는 수집 대상이 아닙니다.

### UUID 전제와 현재 백엔드의 차이

새 장소·분류·후기 ID와 리뷰 작성자 user_id는 UUID입니다. 개발 DB travel_test.public.users.user_id는 실제 UUID PK인 것을 확인했습니다. 현재 [User 엔티티](../BackEnd/NestJS/src/users/entities/user.entity.ts)는 정수 자동 증가 전략으로 선언되어 있어 DB와 다릅니다. 이 DDL은 users나 회원 코드를 변경하지 않습니다. 다른 환경에서는 적용 전에 실제 회원 ID 타입을 확인합니다.

### DDL 실행 순서

1. DBeaver에서 대상 DB·스키마를 선택하고 기존 users.user_id가 UUID PK인지 확인합니다. users와 새 테이블이 같은 스키마에 있다는 전제입니다.
2. 새 테이블이 없는 환경에서 [place_schema_v2.sql](place_schema_v2.sql) 전체를 BEGIN부터 COMMIT까지 SQL 스크립트로 실행합니다. 파일 안에서 분류 → 장소 → 후기 순으로 생성합니다.
3. 기존 v2 30컬럼 환경은 [출처 컬럼 추가 SQL](migrations/20261022_add_place_source_metadata.sql)만 실행합니다. 개발 DB에는 적용 완료했습니다. 다른 기존 구조는 별도 변경·이관 SQL이 필요합니다. `place_schema_v1.sql`은 이전 초안이므로 v2와 연속 실행하지 않습니다. 오류로 트랜잭션이 실패 상태라면 ROLLBACK 후 원인을 확인합니다.
4. 분류를 대 → 중 → 소 순서로 넣고 장소를 수집합니다. UUID는 서버가 전달하고 재수집 시 유지합니다. updated_at은 UPDATE에서 명시적으로 변경합니다.

임시 PostgreSQL 엔진에서 DDL·제약조건 등 27개 검증을 통과했습니다. 이후 2026-10-22 11:38:48 KST에 개발 DB travel_test.public에 세 테이블을 생성하고 COMMIT했습니다. 총 42개 컬럼·FK 4개·컬럼 주석 42개를 확인했습니다. [실행 기록](place_schema_v2_applied_2026-10-22.md)을 참고하며, 같은 개발 DB에서 신규 생성 SQL을 다시 실행하지 않습니다. 최초 생성 이후 13:40:16 KST에 출처 컬럼 추가 SQL도 적용해 현재 총 44개 컬럼·주석 44개입니다. 개발 DB의 TourAPI 수집 검증은 위 수집 안내에 별도 기록했습니다. 분류 단계·JSON 내부 항목·리뷰 권한은 별도 서버 검증 대상입니다.

## 설정의 기준

현재 실행 대상은 `BackEnd/NestJS/`이며 DB 접속 옵션은 [database.config.ts](../BackEnd/NestJS/src/database/database.config.ts)에서 정의합니다. DB 서버는 Docker Compose에 포함되지 않습니다. 실제 서버 버전·주소·계정·권한은 운영 환경에서 확인하며 특정 EC2 IP나 계정명이 코드에 고정되어 있지 않습니다.

| 항목 | 코드의 동작 |
|---|---|
| DB_HOST | 필수, 실제 접속 가능한 DB 주소 |
| DB_PORT | 기본 5432, 정수 1~65535 |
| DB_NAME | 연결 시 필수 |
| DB_USER / DB_PASSWORD | 필수 |
| DB_SSL | 생략 시 false, 지정 시 true/false; true이면 인증서 검증 수행 |
| synchronize | false |
| migrationsRun / dropSchema | false / false |
| 연결 제한 | 연결 타임아웃 5초, 풀 최대 5, statement_timeout 5초 |

자동 테이블 생성·마이그레이션 실행·스키마 삭제는 비활성화되어 있습니다. DB 연결 성공이 일정 영구 저장 기능을 의미하지는 않습니다.

## 환경별 파일

NestJS 시작 스크립트는 선택한 파일 한 개를 읽고 시스템 환경변수를 우선합니다.

| 명령 모드 | 파일 | DB_NAME 기본값 |
|---|---|---|
| local | `.env.local` | travel_local |
| dev / development | `.env.development` | travel_test |
| prod / production / op | `.env.production` | travel_prod |

DB_NAME 기본값은 `scripts/start.cjs`와 이를 사용하는 진단 CLI에 적용되며 파일이나 시스템 환경변수로 재정의할 수 있습니다. Compose는 `node dist/main.js`를 직접 실행하므로 환경 파일에 DB_NAME을 명시해야 합니다.

`BackEnd/NestJS/.env.local` 예시:

```env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=travel_local
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false
```

파일은 별도로 준비하고 실제 비밀번호·키는 Git에 커밋하지 않습니다. 개발·운영 DB를 분리하려면 각각 생성하고 환경별 파일에 해당 정보를 지정합니다. 앱이 DB나 계정을 자동 생성하지 않습니다.

## 컨테이너에서 연결

- 호스트 OS의 PostgreSQL: `DB_HOST=host.docker.internal`. Compose backend에 host-gateway 매핑이 있습니다.
- 별도 서버의 PostgreSQL: 해당 서버의 실제 주소를 사용합니다.
- `127.0.0.1`은 컨테이너 자기 자신이므로 호스트 DB를 가리키지 않습니다.

PostgreSQL 수신 주소, pg_hba.conf 및 네트워크 허용 범위를 실제 접속 경로에 맞춰 설정합니다. 공인 IP나 특정 브리지 IP가 항상 유효하다고 가정하지 않습니다.

## 연결 진단

```bash
cd BackEnd/NestJS
npm install
npm run db:check -- local
npm run db:check -- dev
npm run db:check -- prod
```

진단 CLI는 TypeScript 소스가 있으면 tsx로 실행하고, 없으면 빌드된 진단 JS를 실행합니다. `SELECT current_database() AS name`으로 DB 이름이 설정과 일치하는지 확인하고 연결을 닫습니다. 데이터를 변경하지 않으며 실행 시간은 연결 상태에 따라 달라집니다.

성공 출력 예시:

```text
Database connection verified (local). No data changed.
```

서버 실행 중의 `GET /api/health/db`는 `SELECT 1`을 수행해 성공 시 `{"status":"ok","database":"connected"}`, 실패 시 503을 반환합니다. `GET /api/health`는 DB 쿼리를 수행하지 않습니다.

## DBeaver 및 계정·권한

DBeaver에서 PostgreSQL 연결을 만들고 실제 환경 파일과 같은 호스트·포트·DB 이름·사용자·비밀번호를 입력합니다. SSL도 서버 설정과 DB_SSL에 맞춥니다. 팀원 개인 계정과 서비스 계정의 이름·권한은 코드로 관리되지 않으므로 DB 관리자에게 확인합니다.

현재 진단에는 DB 접속과 진단 쿼리가 가능해야 합니다. 향후 테이블을 추가하면 필요한 스키마·테이블 권한을 별도로 설계합니다. 계정 생성·GRANT·기본 권한 적용은 앱이나 배포 스크립트가 자동 수행하지 않습니다.

## 오류 확인

- 필수 설정 누락: 선택한 환경 파일 경로와 시스템 환경변수 우선순위를 확인합니다.
- 인증 실패: DB_USER와 DB_PASSWORD, 대상 DB, 서버 인증 방식을 확인합니다.
- 연결 거부·시간 초과: DB 서비스, 수신 인터페이스, 컨테이너 호스트 경로, 방화벽·보안 그룹을 확인합니다.
- pg_hba.conf 거부: 실제 클라이언트 주소와 TLS 정책에 맞는 접근 규칙을 DB 관리자가 설정한 뒤 반영합니다.
- SSL 검증 실패: 서버 인증서와 신뢰 체인을 확인합니다. 코드의 DB_SSL=true는 인증서 검증을 켭니다.

인프라 경로와 환경 파일 보관 방법은 [CI/CD 안내](../CI_CD/README.md)를 참고합니다.

## 인증 사용자 스키마

현재 인증 구현의 기준은 [User 엔티티](../BackEnd/NestJS/src/users/entities/user.entity.ts)입니다. [테이블 명세](table_spec_2026-10-18.md)는 최신 장소·분류·후기 DDL과 기존 회원·여행 초안을 구분해 설명합니다. 명세의 UUID 목표 설계와 현재 정수 자동 증가 회원 선언은 서로 다르며, 기존 회원의 실제 타입·OAuth 컬럼·NULL 허용 여부는 엔티티·실제 DB와 대조해야 합니다.

기존 users 테이블에는 [OAuth 변경 SQL](../BackEnd/NestJS/migrations/20261019_add_oauth_columns.sql)이 email/password_hash의 NULL 허용, auth_provider/provider_subject 컬럼, 공급자·식별자 유니크 인덱스를 적용합니다. users 테이블 생성은 포함하지 않습니다. 실제 DB의 컬럼 타입·기본값·권한을 확인한 뒤 DB 관리자가 별도 적용합니다. 앱이나 배포는 자동 실행하지 않습니다. 사용자 저장에는 해당 테이블·ID 생성에 필요한 쓰기 권한도 필요합니다.

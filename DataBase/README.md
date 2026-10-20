# PostgreSQL 연결 및 진단 안내

현재 NestJS는 PostgreSQL에 연결하고 상태를 확인하며 `users`에 회원가입·OAuth 사용자를 저장합니다. 일정·승인 데이터를 저장하는 엔티티·저장 API는 구현되어 있지 않습니다. 프론트의 일정과 승인 상태는 React 메모리 상태입니다.

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

현재 기준은 [User 엔티티](../BackEnd/NestJS/src/users/entities/user.entity.ts)입니다. [2026-10-18 테이블 명세](table_spec_2026-10-18.md)는 이전 설계 기록이므로 현재 엔티티·실제 DB 스키마와 대조해야 합니다.

기존 users 테이블에는 [OAuth 변경 SQL](../BackEnd/NestJS/migrations/20261019_add_oauth_columns.sql)이 email/password_hash의 NULL 허용, auth_provider/provider_subject 컬럼, 공급자·식별자 유니크 인덱스를 적용합니다. users 테이블 생성은 포함하지 않습니다. 실제 DB의 컬럼 타입·기본값·권한을 확인한 뒤 DB 관리자가 별도 적용합니다. 앱이나 배포는 자동 실행하지 않습니다. 사용자 저장에는 해당 테이블·ID 생성에 필요한 쓰기 권한도 필요합니다.

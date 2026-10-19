# 🗄️ PostgreSQL 데이터베이스 접속 및 운영 가이드

> **길벗 AI 여행사 시스템의 데이터 저장소 구축, 계정 관리 및 DBeaver / Docker 접속 가이드**  
> 본 프로젝트는 데이터 신뢰성과 운영 안정성을 위해 AWS EC2 인스턴스에 PostgreSQL 16.15를 구축하고, **개발(TEST)** 과 **운영(PROD)** 데이터베이스를 완전 분리하여 운영합니다.

---

## 📑 목차
1. [DB 인프라 사양 및 접속 정보](#1-db-인프라-사양-및-접속-정보)
2. [데이터베이스 환경 분리](#2-데이터베이스-환경-분리)
3. [사용자 계정 체계](#3-사용자-계정-체계)
4. [권한(GRANT) 관리 및 복구 스크립트](#4-권한grant-관리-및-복구-스크립트)
5. [DBeaver 연결 가이드](#5-dbeaver-연결-가이드)
6. [Docker 컨테이너 환경 접속 가이드](#6-docker-컨테이너-환경-접속-가이드)
7. [연결성 사전 진단 CLI](#7-연결성-사전-진단-cli)
8. [접속 오류 해결 및 트러블슈팅](#8-접속-오류-해결-및-트러블슈팅)

---

## 1. DB 인프라 사양 및 접속 정보

| 항목 | 설정값 | 비고 |
|---|---|---|
| **DBMS** | PostgreSQL 16.15 | AWS EC2 (Amazon Linux 2023) |
| **서버 공인 IP (`DB_HOST`)** | `32.236.200.229` | EC2 퍼블릭 IP |
| **포트 (`DB_PORT`)** | `5432` | PostgreSQL 기본 포트 |
| **개발 DB (`dev`)** | `travel_test` | 공유 개발 및 테스트용 DB |
| **운영 DB (`op` / `prod`)** | `travel_prod` | 실서버 프로덕션 서비스 DB |
| **로컬 DB (`local`)** | `travel_local` | 개발자 로컬 PC 단독 DB |
| **SSL 암호화 (`DB_SSL`)** | `false` | 인스턴스 내부 및 전용 네트워크 통신 |

---

## 2. 데이터베이스 환경 분리

```
[ PostgreSQL Instance (32.236.200.229:5432) ]
        ├── travel_test (DEV 환경)
        │     ├── 서비스 계정: travel_app (읽기/쓰기 전체 권한)
        │     └── 목적: API 개발, 테이블 스키마 검증, 통합 테스트 데이터 적재
        │
        └── travel_prod (PROD 운영 환경)
              ├── 서비스 계정: traverl_app (운영 백엔드 전용)
              └── 목적: 실제 배포 서비스 운영 데이터 보관
```

* **개발용 (`travel_test`)**: 기능 개발, 임의 데이터 삽입, 스키마 수정 등 자유로운 테스트가 허용됩니다.
* **운영용 (`travel_prod`)**: 실서비스 인입 데이터가 적재되며, 데이터의 임의 삭제나 비인가 변경이 엄격히 금지됩니다.

---

## 3. 사용자 계정 체계

### 3-1. 백엔드 애플리케이션 서비스 전용 계정
백엔드 서버의 `.env` 파일에 설정되어 실제 API 동작 시 연결되는 시스템 계정입니다:

| 환경 | 대상 DB | 계정명 (`DB_USER`) | 비밀번호 (`DB_PASSWORD`) | 권한 범위 |
|---|---|---|---|---|
| **개발 (DEV)** | `travel_test` | `travel_app` | `1234` | DB 접속 및 public 스키마 전체 권한 |
| **운영 (PROD)** | `travel_prod` | `traverl_app` | `1234` | DB 접속 및 public 스키마 전체 권한 |

### 3-2. 팀원별 개인 계정 (DBeaver 분석/조회용)
팀원들이 DBeaver 또는 외부 클라이언트로 접속하여 쿼리를 작성하고 분석할 때 사용하는 계정입니다:

| 이름 | Username (`DB_USER`) | 초기 비밀번호 (`DB_PASSWORD`) | 비고 |
|---|---|---|---|
| 이지석 | `lee_jiseok` | `lee_jiseok` | 개발 DB 생성/조회 권한 |
| 장동율 | `jang_dongyul` | `jang_dongyul` | 개발 DB 생성/조회 권한 |
| 이동욱 | `lee_dongwook` | `lee_dongwook` | 개발 DB 생성/조회 권한 |

---

## 4. 권한(GRANT) 관리 및 복구 스크립트

계정 생성 후 또는 권한 오류(permission denied)가 발생했을 때 EC2 `postgres` 관리자 계정으로 접속하여 아래 SQL을 순차적으로 실행합니다:

```sql
-- 1. 데이터베이스 접속 권한 부여
GRANT CONNECT ON DATABASE travel_test TO travel_app;
GRANT CONNECT ON DATABASE travel_prod TO traverl_app;

-- 2. 개발 DB (travel_test) 스키마 및 테이블 권한 부여
\c travel_test
GRANT ALL ON SCHEMA public TO travel_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO travel_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO travel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO travel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO travel_app;

-- 3. 운영 DB (travel_prod) 스키마 및 테이블 권한 부여
\c travel_prod
GRANT ALL ON SCHEMA public TO traverl_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO traverl_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO traverl_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO traverl_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO traverl_app;
```

> [!TIP]
> **Bash 터미널 실행 주의**: 위 쿼리문은 Linux Bash 셸이 아니라 **PostgreSQL 셸 (`psql -U postgres`) 내부에서** 실행해야 합니다. Bash에서 바로 붙여넣으면 `command not found` 오류가 발생합니다.

---

## 5. DBeaver 연결 가이드

1. **DBeaver** 실행 후 상단 콘센트 모양의 **[새 데이터베이스 연결]** 클릭
2. 목록에서 **PostgreSQL** 선택 후 **[Next]** 클릭
3. 접속 파라미터 입력:
   * **Host**: `32.236.200.229`
   * **Port**: `5432`
   * **Database**: `travel_test` (운영 확인 시 `travel_prod`)
   * **Authentication**: `Database Native`
   * **Username**: 본인 개인 계정 (예: `lee_jiseok`)
   * **Password**: 본인 비밀번호
4. **SSL** 탭: `Use SSL` 체크 해제
5. 좌측 하단 **[Test Connection]** 을 눌러 "Connected" 팝업이 뜨는지 확인 후 **[Finish]** 완료

---

## 6. Docker 컨테이너 환경 접속 가이드

백엔드가 Docker 컨테이너 안에서 동작할 때 데이터베이스 호스트(`DB_HOST`) 설정 요령:

1. **EC2 인스턴스 내부에서 Docker를 띄우는 경우**:
   - `DB_HOST=32.236.200.229` 또는 Docker 기본 브리지 호스트 IP(`172.17.0.1` 등)를 사용할 수 있습니다.
2. **로컬 PC에서 Docker Compose를 띄우고 원격 AWS DB에 연결하는 경우**:
   - `DB_HOST=32.236.200.229` (외부 공인 IP 직접 지정)
3. **로컬 PC에서 Docker Compose를 띄우고 로컬 PC에 설치된 PostgreSQL에 연결하는 경우**:
   - `DB_HOST=host.docker.internal` (Docker Desktop이 제공하는 호스트 머신 루프백 별칭)

---

## 7. 연결성 사전 진단 CLI

BackEnd 프로젝트에는 서버를 가동하기 전에 DB 연결 가능 여부와 자격 증명을 1초 만에 검증하는 내장 진단 스크립트가 포함되어 있습니다:

```bash
cd BackEnd

# 개발 DB (travel_test) 접속 검사
npm run db:check -- dev

# 운영 DB (travel_prod) 접속 검사
npm run db:check -- prod

# 로컬 DB (travel_local) 접속 검사
npm run db:check -- local
```

진단 스크립트는 `SELECT 1;` 쿼리만 안전하게 수행하므로 실제 데이터에는 어떠한 영향도 미치지 않습니다.

---

## 8. 접속 오류 해결 및 트러블슈팅

### 1) `no pg_hba.conf entry for host ...` 오류
* **원인**: 새 위치(카페, 자택 등)에서 접속하여 공인 IP가 PostgreSQL 접근 허용 목록에 없는 경우
* **해결**:
  1. EC2 터미널 접속: `sudo vim /var/lib/pgsql/data/pg_hba.conf`
  2. 다음 라인이 포함되어 있는지 확인:
     ```
     host    all    all    0.0.0.0/0    md5
     ```
  3. 설정 반영: `sudo systemctl reload postgresql`

### 2) `password authentication failed for user "..."` 오류
* **원인**: 계정명 오타 또는 비밀번호 불일치
* **확인**:
  - 개발 환경 계정명: `travel_app`
  - 운영 환경 계정명: `traverl_app` (알파벳 `er` 표기 주의)
  - 비밀번호: `1234`
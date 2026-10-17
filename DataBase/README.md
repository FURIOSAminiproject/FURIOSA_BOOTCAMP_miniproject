# PostgreSQL 데이터베이스 접속 안내

AWS EC2에 PostgreSQL 16.15 데이터베이스를 구축했습니다.

개발용(TEST)과 운영용(PROD)을 분리했으며, 팀원별로 개별 사용자 계정을 생성했습니다.

---

### 1. DB 서버 정보

| 항목 | 정보 |
|---|---|
| DBMS | PostgreSQL 16.15 |
| 서버 IP (`DB_HOST`) | `32.236.200.229` |
| Port (`DB_PORT`) | `5432` |
| TEST DB (`dev`) | `travel_test` |
| PROD DB (`op` / `prod`) | `travel_prod` |
| SSL 암호화 | 비활성화 (`DB_SSL=false`) |

---

### 2. 팀원별 계정

| 이름 | Username (`DB_USER`) | 초기 비밀번호 (`DB_PASSWORD`) |
|---|---|---|
| 이지석 | `lee_jiseok` | `********` |
| 장동율 | `jang_dongyul` | `********` (또는 개별 변경 비밀번호) |
| 이동욱 | `lee_dongwook` | `********` |

---

### 3. DBeaver 접속 방법

1. DBeaver 실행
2. **새 데이터베이스 연결** → **PostgreSQL** 선택
3. 아래 정보 입력:

| 항목 | 설정값 |
|---|---|
| Host | `32.236.200.229` |
| Port | `5432` |
| Database | `travel_test` (또는 `travel_prod`) |
| Authentication | Database Native / Username & Password |
| Username | 본인에게 할당된 계정 |
| Password | 개별 전달받은 비밀번호 |
| SSL | 비활성화 (Use SSL 체크 해제) |

4. 설정 후 **Test Connection** → **Finish**를 선택합니다.

---

### 4. TEST / PROD 구분

* **TEST — `travel_test` (dev)**
  - 개발 및 테스트용 DB
  - 테이블 생성 및 데이터 CRUD
  - SQL 쿼리 및 API 연동 테스트
  - 팀원 간 테스트 데이터 공유

* **PROD — `travel_prod` (op / prod)**
  - 실제 서비스 운영용 DB
  - 팀원 계정은 읽기 전용으로 설정
  - 운영 데이터 수정은 별도의 운영 계정으로 처리

---

### 5. 접속 시 주의사항

- 개발 및 테스트 작업은 반드시 TEST DB(`travel_test`)에서 진행해 주세요.
- 운영 DB의 데이터 변경 및 삭제는 임의로 진행하지 말아 주세요.
- 계정 비밀번호는 외부에 공유하지 말아 주세요.
- 외부 접속 시 `pg_hba.conf` 접근 차단 오류(`no pg_hba.conf entry for host ...`)가 발생할 경우, DB 인스턴스에 접속하여 접속할 공인 IP를 `pg_hba.conf`에 추가하고 reload 해야 합니다.
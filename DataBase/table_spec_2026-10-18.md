# 데이터베이스 스키마 명세서

---

## `users` 테이블

### 테이블 설명
사용자 계정 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명      | 데이터 타입   | 제약 조건             | 설명                                   |
| ----------- | ------------- | --------------------- | -------------------------------------- |
| user_id     | UUID          | PK, NOT NULL          | 사용자의 고유 식별자                   |
| name        | VARCHAR(100)  | NOT NULL              | 사용자의 이름                          |
| email       | VARCHAR(255)  | NOT NULL              | 사용자의 이메일 주소                   |
| password_hash | TEXT          | NOT NULL              | 사용자 비밀번호의 해시 값              |
| created_at  | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 계정 생성 시각                         |
| updated_at  | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 계정 정보 마지막 업데이트 시각         |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT TRUE  | 계정 활성화 여부                       |

### 인덱스
*   `users_pkey` (PK, UNIQUE): `user_id`

### 외래 키 관계
*   없음

---

## `user_preferences` 테이블

### 테이블 설명
각 사용자의 여행 선호도 설정을 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명              | 데이터 타입   | 제약 조건             | 설명                                   |
| ------------------- | ------------- | --------------------- | -------------------------------------- |
| user_id             | UUID          | PK, FK (users), NOT NULL | 사용자의 고유 식별자                   |
| budget_min          | INTEGER       |                       | 최소 예산 범위                         |
| budget_max          | INTEGER       |                       | 최대 예산 범위                         |
| preferred_transport | VARCHAR(30)   |                       | 선호하는 교통수단                      |
| preferred_travel_style | VARCHAR(50)   |                       | 선호하는 여행 스타일                   |
| preferred_group_type | VARCHAR(30)   |                       | 선호하는 그룹 유형                     |
| updated_at          | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 설정 정보 마지막 업데이트 시각         |

### 인덱스
*   `user_preferences_pkey` (PK, UNIQUE): `user_id`

### 외래 키 관계
*   `user_preferences_user_id_fkey`: `user_id` (참조: `users.user_id`)

---

## `trips` 테이블

### 테이블 설명
사용자가 계획한 여행 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명           | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------------- | ------------- | --------------------- | -------------------------------------- |
| trip_id          | UUID          | PK, NOT NULL          | 여행의 고유 식별자                     |
| user_id          | UUID          | FK (users), NOT NULL  | 여행을 계획한 사용자의 ID              |
| title            | VARCHAR(200)  | NOT NULL              | 여행의 제목                            |
| origin_name      | VARCHAR(255)  |                       | 출발지 명칭                            |
| destination_name | VARCHAR(255)  |                       | 목적지 명칭                            |
| start_date       | DATE          | NOT NULL              | 여행 시작일                            |
| end_date         | DATE          | NOT NULL              | 여행 종료일                            |
| status           | VARCHAR(20)   | NOT NULL, DEFAULT 'draft' | 여행 상태 (예: draft, planning, completed) |
| budget           | INTEGER       |                       | 여행 총 예산                           |
| created_at       | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 여행 정보 생성 시각                    |
| updated_at       | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 여행 정보 마지막 업데이트 시각         |

### 인덱스
*   `trips_pkey` (PK, UNIQUE): `trip_id`
*   `trips_user_id_fkey`: `user_id`

### 외래 키 관계
*   `trips_user_id_fkey`: `user_id` (참조: `users.user_id`)

---

## `trip_days` 테이블

### 테이블 설명
각 여행의 특정 일자에 대한 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명     | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------- | ------------- | --------------------- | -------------------------------------- |
| trip_day_id | UUID          | PK, NOT NULL          | 여행 일자의 고유 식별자                |
| trip_id    | UUID          | FK (trips), NOT NULL  | 해당 일자가 속한 여행의 ID             |
| day_number | SMALLINT      | NOT NULL              | 여행 내에서의 일자 순서 (예: 1, 2, 3)   |
| trip_date  | DATE          | NOT NULL              | 실제 여행 일자                         |
| notes      | TEXT          |                       | 해당 일자에 대한 추가 메모             |

### 인덱스
*   `trip_days_pkey` (PK, UNIQUE): `trip_day_id`
*   `trip_days_trip_id_fkey`: `trip_id`

### 외래 키 관계
*   `trip_days_trip_id_fkey`: `trip_id` (참조: `trips.trip_id`)

---

## `trip_stops` 테이블

### 테이블 설명
여행 중 특정 장소에 들르는 일정 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명            | 데이터 타입   | 제약 조건             | 설명                                   |
| ----------------- | ------------- | --------------------- | -------------------------------------- |
| trip_stop_id      | UUID          | PK, NOT NULL          | 여행 경유지의 고유 식별자              |
| trip_day_id       | UUID          | FK (trip_days), NOT NULL | 이 경유지가 포함된 여행 일자의 ID       |
| place_id          | UUID          | FK (places), NULLABLE   | 경유하는 장소의 ID                     |
| stop_order        | SMALLINT      | NOT NULL              | 해당 일자 내에서의 경유 순서           |
| planned_arrival   | TIMESTAMPTZ   |                       | 계획된 도착 시각                       |
| planned_departure | TIMESTAMPTZ   |                       | 계획된 출발 시각                       |
| estimated_cost    | INTEGER       |                       | 예상 경유 비용                         |
| notes             | TEXT          |                       | 경유지에 대한 추가 메모                |

### 인덱스
*   `trip_stops_pkey` (PK, UNIQUE): `trip_stop_id`
*   `trip_stops_trip_day_id_fkey`: `trip_day_id`
*   `trip_stops_place_id_fkey`: `place_id`

### 외래 키 관계
*   `trip_stops_trip_day_id_fkey`: `trip_day_id` (참조: `trip_days.trip_day_id`)
*   `trip_stops_place_id_fkey`: `place_id` (참조: `places.place_id`)

---

## `places` 테이블

### 테이블 설명
여행 관련 장소(관광지, 숙소, 식당 등)의 기본 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명      | 데이터 타입        | 제약 조건             | 설명                                   |
| ----------- | ------------------ | --------------------- | -------------------------------------- |
| place_id    | UUID               | PK, NOT NULL          | 장소의 고유 식별자                     |
| name        | VARCHAR(255)       | NOT NULL              | 장소의 이름                            |
| description | TEXT               |                       | 장소에 대한 설명                       |
| region_name | VARCHAR(100)       |                       | 지역명                                 |
| district_name | VARCHAR(100)       |                       | 구/군명                                |
| address     | TEXT               |                       | 장소의 주소                            |
| latitude    | DECIMAL(10, 7)     |                       | 위도                                   |
| longitude   | DECIMAL(10, 7)     |                       | 경도                                   |
| phone       | VARCHAR(50)        |                       | 장소 전화번호                          |
| website_url | TEXT               |                       | 장소 웹사이트 URL                      |
| created_at  | TIMESTAMPTZ        | NOT NULL, DEFAULT NOW() | 장소 정보 생성 시각                    |
| updated_at  | TIMESTAMPTZ        | NOT NULL, DEFAULT NOW() | 장소 정보 마지막 업데이트 시각         |

### 인덱스
*   `places_pkey` (PK, UNIQUE): `place_id`

### 외래 키 관계
*   없음

---

## `place_categories` 테이블

### 테이블 설명
장소의 분류(카테고리) 정보를 저장하는 테이블입니다. 계층 구조를 가질 수 있습니다.

### 컬럼 명세

| 컬럼명               | 데이터 타입   | 제약 조건             | 설명                                   |
| -------------------- | ------------- | --------------------- | -------------------------------------- |
| category_id          | UUID          | PK, NOT NULL          | 카테고리의 고유 식별자                 |
| category_name        | VARCHAR(100)  | NOT NULL, UNIQUE      | 카테고리 이름                          |
| parent_category_id   | UUID          | FK (place_categories), NULLABLE | 상위 카테고리의 ID (계층 구조용)       |
| description          | TEXT          |                       | 카테고리 설명                          |

### 인덱스
*   `place_categories_pkey` (PK, UNIQUE): `category_id`
*   `place_categories_category_name_key` (UNIQUE): `category_name`
*   `place_categories_parent_category_id_fkey`: `parent_category_id`

### 외래 키 관계
*   `place_categories_parent_category_id_fkey`: `parent_category_id` (참조: `place_categories.category_id`)

---

## `place_category_map` 테이블

### 테이블 설명
장소와 카테고리 간의 다대다 관계를 연결하는 매핑 테이블입니다.

### 컬럼 명세

| 컬럼명     | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------- | ------------- | --------------------- | -------------------------------------- |
| place_id   | UUID          | PK, FK (places), NOT NULL | 장소의 ID                              |
| category_id | UUID          | PK, FK (place_categories), NOT NULL | 카테고리의 ID                          |

### 인덱스
*   `place_category_map_pkey` (PK, UNIQUE): `place_id`, `category_id`
*   `place_category_map_place_id_fkey`: `place_id`
*   `place_category_map_category_id_fkey`: `category_id`

### 외래 키 관계
*   `place_category_map_place_id_fkey`: `place_id` (참조: `places.place_id`)
*   `place_category_map_category_id_fkey`: `category_id` (참조: `place_categories.category_id`)

---

## `data_sources` 테이블

### 테이블 설명
외부 데이터 소스 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명      | 데이터 타입   | 제약 조건             | 설명                                   |
| ----------- | ------------- | --------------------- | -------------------------------------- |
| data_source_id | UUID          | PK, NOT NULL          | 데이터 소스의 고유 식별자              |
| source_name | VARCHAR(150)  | NOT NULL, UNIQUE      | 데이터 소스 이름                       |
| source_type | VARCHAR(30)   | NOT NULL              | 데이터 소스 유형 (예: API, CSV, DB)    |
| base_url    | TEXT          |                       | 데이터 소스의 기본 URL (API의 경우)    |
| description | TEXT          |                       | 데이터 소스 설명                       |
| is_active   | BOOLEAN       | NOT NULL, DEFAULT TRUE  | 데이터 소스 활성화 여부                |
| created_at  | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 데이터 소스 정보 생성 시각             |

### 인덱스
*   `data_sources_pkey` (PK, UNIQUE): `data_source_id`
*   `data_sources_source_name_key` (UNIQUE): `source_name`

### 외래 키 관계
*   없음

---

## `place_sources` 테이블

### 테이블 설명
각 장소가 어떤 외부 데이터 소스에서 왔는지, 그리고 해당 소스에서의 식별자 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명           | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------------- | ------------- | --------------------- | -------------------------------------- |
| place_source_id  | UUID          | PK, NOT NULL          | 장소 소스 정보의 고유 식별자           |
| place_id         | UUID          | FK (places), NOT NULL | 장소의 ID                              |
| data_source_id   | UUID          | FK (data_sources), NOT NULL | 데이터 소스의 ID                       |
| source_place_id  | VARCHAR(255)  | NOT NULL              | 해당 데이터 소스에서 장소를 식별하는 ID |
| source_payload   | JSONB         |                       | 소스로부터 받은 원본 데이터 (JSON 형식) |
| source_updated_at | TIMESTAMPTZ   |                       | 소스에서 해당 장소 정보가 업데이트된 시각 |
| last_synced_at   | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 마지막으로 동기화된 시각               |

### 인덱스
*   `place_sources_pkey` (PK, UNIQUE): `place_source_id`
*   `place_sources_place_id_fkey`: `place_id`
*   `place_sources_data_source_id_fkey`: `data_source_id`
*   `place_sources_unique_place_source` (UNIQUE): `place_id`, `data_source_id`

### 외래 키 관계
*   `place_sources_place_id_fkey`: `place_id` (참조: `places.place_id`)
*   `place_sources_data_source_id_fkey`: `data_source_id` (참조: `data_sources.data_source_id`)

---

## `ingestion_runs` 테이블

### 테이블 설명
데이터 수집(ingestion) 작업의 실행 기록을 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명           | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------------- | ------------- | --------------------- | -------------------------------------- |
| ingestion_run_id | UUID          | PK, NOT NULL          | 수집 실행의 고유 식별자                |
| data_source_id   | UUID          | FK (data_sources), NOT NULL | 실행된 데이터 소스의 ID                |
| started_at       | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 수집 작업 시작 시각                    |
| finished_at      | TIMESTAMPTZ   |                       | 수집 작업 종료 시각                    |
| status           | VARCHAR(20)   | NOT NULL, DEFAULT 'running' | 수집 작업 상태 (예: running, completed, failed) |
| records_fetched  | INTEGER       | NOT NULL, DEFAULT 0   | 가져온 레코드 수                       |
| records_inserted | INTEGER       | NOT NULL, DEFAULT 0   | 새로 삽입된 레코드 수                  |
| records_updated  | INTEGER       | NOT NULL, DEFAULT 0   | 업데이트된 레코드 수                   |
| records_skipped  | INTEGER       | NOT NULL, DEFAULT 0   | 건너뛴 레코드 수                       |
| error_message    | TEXT          |                       | 오류 발생 시 오류 메시지               |

### 인덱스
*   `ingestion_runs_pkey` (PK, UNIQUE): `ingestion_run_id`
*   `ingestion_runs_data_source_id_fkey`: `data_source_id`

### 외래 키 관계
*   `ingestion_runs_data_source_id_fkey`: `data_source_id` (참조: `data_sources.data_source_id`)

---

## `place_reviews` 테이블

### 테이블 설명
장소에 대한 사용자 리뷰 정보를 저장하는 테이블입니다.

### 컬럼 명세

| 컬럼명     | 데이터 타입   | 제약 조건             | 설명                                   |
| ---------- | ------------- | --------------------- | -------------------------------------- |
| review_id  | UUID          | PK, NOT NULL          | 리뷰의 고유 식별자                     |
| place_id   | UUID          | FK (places), NOT NULL | 리뷰 대상 장소의 ID                    |
| user_id    | UUID          | FK (users), NULLABLE  | 리뷰를 작성한 사용자의 ID              |
| rating     | SMALLINT      | NOT NULL              | 평점 (예: 1-5)                         |
| review_text | TEXT          |                       | 리뷰 내용                              |
| created_at | TIMESTAMPTZ   | NOT NULL, DEFAULT NOW() | 리뷰 작성 시각                         |

### 인덱스
*   `place_reviews_pkey` (PK, UNIQUE): `review_id`
*   `place_reviews_place_id_fkey`: `place_id`
*   `place_reviews_user_id_fkey`: `user_id`

### 외래 키 관계
*   `place_reviews_place_id_fkey`: `place_id` (참조: `places.place_id`)
*   `place_reviews_user_id_fkey`: `user_id` (참조: `users.user_id`)

---
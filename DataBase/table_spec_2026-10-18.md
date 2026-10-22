# 데이터베이스 스키마 명세서

최종 수정: 2026-10-22. 기존 링크를 유지하기 위해 파일명의 2026-10-18은 변경하지 않았습니다.

장소 영역의 최신 기준은 [place_schema_v2.sql](place_schema_v2.sql)과 [통합 설계 설명](place_design_v2.md)입니다. 새 DDL은 분류 5개, 장소 32개, 후기 7개로 총 44개 컬럼을 생성합니다. 개발 DB travel_test.public에 최초 생성 후 2026-10-22 13:40:16 KST에 출처 컬럼 2개를 추가했습니다. [실행 기록](place_schema_v2_applied_2026-10-22.md)을 참고합니다.

| 구분 | 테이블 | 문서·구현 상태 |
|---|---|---|
| 최신 장소 DDL | place_categories, places, place_reviews | UUID 기준 SQL 작성·임시 엔진 검증·개발 DB 적용 완료 |
| 회원·여행 | users, user_preferences, trips, trip_days, trip_stops | 기존 ERD 초안 유지. 새 장소 DDL에서 생성·변경하지 않음 |
| 수집 관리 참고안 | data_sources, ingestion_runs | 기존 컬럼 설명만 보존. 현재 장소 DDL에 포함하지 않음 |

`place_category_map`과 `place_sources`는 설계에서 제외했습니다. 분류는 places.category_id로 직접 연결하고, TourAPI 외부 ID·최신 원본·수집 시각은 places에 보관합니다. 좋아요·ORS·ITS 전용 테이블은 이번 DDL에 포함하지 않습니다.

설계의 users.user_id와 후기 작성자 ID는 UUID입니다. 개발 DB users.user_id가 실제 UUID PK인 것을 확인했습니다. 현재 백엔드 User 엔티티는 정수 자동 증가 전략이므로 실제 개발 DB와 차이가 있습니다. 회원 ID 이관·백엔드 수정은 이 DDL 실행에 포함하지 않았습니다. 다른 DB에 적용할 때는 해당 환경의 실제 타입을 확인합니다.

아래 회원·여행 영역의 제약·인덱스는 기존 초안이며 적용된 DB 객체 목록을 뜻하지 않습니다. 현재 인증 코드의 OAuth 컬럼·NULL 허용 여부는 [User 엔티티](../BackEnd/NestJS/src/users/entities/user.entity.ts) 및 [OAuth 변경 SQL](../BackEnd/NestJS/migrations/20261019_add_oauth_columns.sql)을 함께 확인합니다.

---

## `users` 테이블

이 절은 기존 ERD 초안이며 최신 장소 DDL의 생성 대상은 아닙니다. UUID는 목표 설계입니다. 이메일·비밀번호 필수 여부 등 아래 기존 필드는 현재 OAuth 코드와 차이가 있으므로 실제 인증 스키마는 User 엔티티와 대조합니다.

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

이 절은 기존 ERD 초안이며 최신 장소 DDL의 생성 대상은 아닙니다.

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

이 절은 기존 ERD 초안이며 최신 장소 DDL의 생성 대상은 아닙니다.

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

이 절은 기존 ERD 초안이며 최신 장소 DDL의 생성 대상은 아닙니다.

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

이 절은 기존 ERD 초안이며 최신 장소 DDL의 생성 대상은 아닙니다.

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

## `place_categories` 테이블

### 테이블 설명

TourAPI 대·중·소 분류를 한 테이블의 여러 행으로 저장합니다. places는 소분류 하나를 직접 참조하며 연결 테이블을 사용하지 않습니다. 이 절은 최신 DDL v2와 대응합니다.

### 컬럼 명세

| 컬럼명 | 한글명 | 데이터 타입 | 제약 조건·기본값 | 출처·설명 |
|---|---|---|---|---|
| category_id | 분류 ID | UUID | PK, NOT NULL | 내부 생성 UUID. category_code로 재수집하며 기존 ID를 유지한다. |
| category_code | TourAPI 분류 코드 | VARCHAR(30) | UNIQUE, NOT NULL, 빈 값 금지 | TourAPI lclsSystmCode2의 분류 코드. ListYn=Y일 때 lclsSystm1Cd/2Cd/3Cd, N일 때 code. |
| category_name | 분류명 | VARCHAR(100) | NOT NULL, 빈 값 금지 | TourAPI lclsSystmCode2의 분류명. ListYn=Y일 때 lclsSystm1Nm/2Nm/3Nm, N일 때 name. 이름 중복 허용. |
| category_level | 분류 단계 | SMALLINT | NOT NULL, 1/2/3 | 내부 지정: 대분류 1, 중분류 2, 소분류 3. |
| parent_category_id | 상위 분류 ID | UUID | FK, NULL 허용 | 같은 코드 응답의 상위 코드에 대응하는 내부 분류 ID. 중분류 부모는 대분류, 소분류 부모는 중분류로 저장 로직에서 검사. |

### 인덱스

- `pk_place_categories`: category_id 기본키.
- `uq_place_categories_code`: category_code 중복 방지. category_name에는 UNIQUE를 걸지 않습니다.
- `ix_place_categories_parent`: parent_category_id.

### 외래 키·검증 규칙

- `fk_place_categories_parent`: parent_category_id → 같은 테이블의 category_id.
- 대분류는 부모가 NULL, 중·소분류는 부모가 있어야 하며 자기 자신을 부모로 지정할 수 없습니다.
- 부모의 단계가 바로 위 단계인지, 순환이 없는지는 저장 로직에서도 검사합니다. FK만으로 단계까지 보장하지는 않습니다.
- 관광타입(contenttypeid)은 이 분류 계층과 별개이며 places.content_type_id에 유지합니다.

---

## `places` 테이블

### 테이블 설명

TourAPI 콘텐츠 한 건을 한 행에 저장합니다. 내부 UUID인 place_id는 일정·후기 연결에, TourAPI contentid인 content_id는 재수집과 중복 방지에 사용합니다. 이 절은 최신 DDL v2와 대응합니다.

### 컬럼 명세

| 컬럼명 | 한글명 | 데이터 타입 | 제약 조건·기본값 | 출처·설명 |
|---|---|---|---|---|
| place_id | 내부 장소 ID | UUID | PK, NOT NULL | 내부 생성 UUID. 여행 일정·후기에서 참조하며 재수집 시 유지. |
| content_id | TourAPI 콘텐츠 ID | VARCHAR(30) | UNIQUE, NOT NULL, 빈 값 금지 | TourAPI areaBasedList2/detailCommon2.contentid. 중복 수집 방지용 외부 콘텐츠 ID. |
| content_type_id | 관광타입 ID | SMALLINT | NOT NULL, 12/14/15/28/32/38/39 | TourAPI areaBasedList2/detailCommon2.contenttypeid. 12 관광지, 14 문화, 15 행사, 28 레포츠, 32 숙박, 38 쇼핑, 39 음식점. |
| name | 장소명 | VARCHAR(255) | NOT NULL, 빈 값 금지 | TourAPI areaBasedList2/detailCommon2.title. 장소명. |
| description | 장소 설명 | TEXT | NULL 허용 | TourAPI detailCommon2.overview. 장소 설명. |
| address | 기본 주소 | TEXT | NULL 허용 | TourAPI areaBasedList2/detailCommon2.addr1. 기본 주소. |
| address_detail | 상세 주소 | TEXT | NULL 허용 | TourAPI areaBasedList2/detailCommon2.addr2. 상세 주소. |
| latitude | 위도 | NUMERIC(10,7) | NULL 허용, -90~90 | TourAPI areaBasedList2/detailCommon2.mapy. WGS84 위도. |
| longitude | 경도 | NUMERIC(10,7) | NULL 허용, -180~180 | TourAPI areaBasedList2/detailCommon2.mapx. WGS84 경도. |
| region_code | 시도 코드 | VARCHAR(2) | NULL 허용 | TourAPI areaBasedList2/detailCommon2.lDongRegnCd. 법정동 시도 코드. |
| region_name | 시도명 | VARCHAR(100) | NULL 허용 | TourAPI ldongCode2에서 시도 코드에 해당하는 이름을 매핑. |
| district_code | 시군구 코드 | VARCHAR(3) | NULL 허용 | TourAPI areaBasedList2/detailCommon2.lDongSignguCd. 시도 코드와 함께 해석. |
| district_name | 시군구명 | VARCHAR(100) | NULL 허용 | TourAPI ldongCode2에서 해당 시도·시군구 코드에 대응하는 이름을 매핑. |
| category_id | 소분류 ID | UUID | FK, NULL 허용 | TourAPI lclsSystm3와 place_categories.category_code를 매칭한 소분류 UUID. 미제공·매칭 실패는 NULL. 단계 3 여부는 저장 로직에서 검사. |
| phone | 전화번호 | TEXT | NULL 허용 | TourAPI areaBasedList2/detailCommon2.tel. 대표 연락처. |
| website_url | 홈페이지 주소 | TEXT | NULL 허용 | TourAPI detailCommon2.homepage에서 HTTP(S) URL을 추출·검증. |
| opening_hours | 운영시간 | TEXT | NULL 허용 | TourAPI detailIntro2의 타입별 시간: usetime/usetimeculture/playtime/usetimeleports/checkintime+checkouttime/opentime/opentimefood. |
| closed_days | 휴무일 | TEXT | NULL 허용 | TourAPI detailIntro2의 타입별 휴무: restdate/restdateculture/restdateleports/restdateshopping/restdatefood. 행사·숙박 전용 필드 없음. |
| main_image_url | 대표 이미지 주소 | TEXT | NULL 허용 | TourAPI 목록·detailCommon2.firstimage 우선, 없으면 detailImage2.originimgurl에서 선택. |
| images | 이미지 목록 | JSONB | NOT NULL, 기본 '[]'::jsonb | TourAPI detailImage2 originimgurl/smallimageurl/cpyrhtDivCd 및 목록 대표 이미지 정보를 가공한 배열. |
| fee_text | 요금 안내문 | TEXT | NULL 허용 | TourAPI detailIntro2(usefee/usetimefestival/usefeeleports 등), detailInfo2(infoname/infotext·숙박 객실별 요금)를 취합한 조건별 안내. |
| fees | 조건별 요금 목록 | JSONB | NOT NULL, 기본 '[]'::jsonb | 요금 원문을 label/text/amount/unit 배열로 가공. 금액·단위 미상은 JSON null, 명확한 무료만 0. |
| event_start_date | 행사 시작일 | DATE | NULL 허용 | TourAPI searchFestival2.eventstartdate. YYYYMMDD를 DATE로 변환. |
| event_end_date | 행사 종료일 | DATE | NULL 허용 | TourAPI searchFestival2.eventenddate. YYYYMMDD를 DATE로 변환. |
| raw_data | API별 최신 원본 | JSONB | NOT NULL, 기본 '{}'::jsonb | TourAPI 엔드포인트별 최신 성공 items, fetched_at, source_url/source_urls. 인증키·인증 헤더는 제외. |
| source_url | 마지막 수집 URL | TEXT | NULL 허용 | 마지막 성공 장소 수집 요청 URL. 인증키·인증정보 제외. 상세 API별 URL은 raw_data에도 저장. |
| source_type | 수집 방식 | VARCHAR(20) | NULL 허용, API/CRAWLING | 내부 기록: API 호출 또는 크롤링. 출처 미확인은 NULL, 현재 TourAPI 수집기는 API. |
| source_updated_at | 외부 정보 수정 일시 | TIMESTAMPTZ | NULL 허용 | TourAPI 목록·공통상세·동기화목록.modifiedtime. Asia/Seoul로 해석하는 수집 정책. |
| last_synced_at | 마지막 성공 수집 일시 | TIMESTAMPTZ | NOT NULL, 기본 CURRENT_TIMESTAMP | 내부 기록: 이 장소의 마지막 성공 수집 시각. API별 시각은 raw_data에서 확인. |
| is_active | 서비스 노출 여부 | BOOLEAN | NOT NULL, 기본 TRUE | TourAPI areaBasedSyncList2.showflag: 1=true, 0=false. 미수집 신규 행 기본 true. 검색 누락만으로 숨기지 않는다. |
| created_at | 생성 일시 | TIMESTAMPTZ | NOT NULL, 기본 CURRENT_TIMESTAMP | 내부 기록: 우리 DB 최초 삽입 시각. TourAPI createdtime과 다르다. |
| updated_at | 수정 일시 | TIMESTAMPTZ | NOT NULL, 기본 CURRENT_TIMESTAMP | 내부 기록: 우리 DB 수정 시각. UPDATE에서 명시적으로 갱신. |

### 인덱스

- `pk_places`: place_id 기본키.
- `uq_places_content_id`: content_id 중복 방지.
- `ix_places_category`: category_id.
- `ix_places_active_area_type`: region_code, district_code, content_type_id. is_active=true인 행에만 적용.

### 외래 키·검증 규칙

- `fk_places_category`: category_id → place_categories.category_id.
- TourAPI 소분류 코드가 없거나 매칭되지 않으면 category_id는 NULL입니다. 단계 3인 분류인지 저장 로직에서 검사합니다.
- 위도·경도는 둘 다 있거나 둘 다 NULL이어야 합니다. 시군구 코드를 저장할 때는 시도 코드가 필요합니다.
- 행사 시작·종료일이 모두 있으면 종료일은 시작일보다 빠를 수 없습니다.
- images/fees는 JSON 배열, raw_data는 JSON 객체입니다. 배열 내부 항목은 서버가 검사합니다. 명확한 무료만 amount=0, 미상 금액은 null입니다.
- 목록 수집으로 상세 설명·요금·이미지를 빈 값으로 덮어쓰지 않습니다. raw_data는 API별 마지막 성공 응답을 유지하고 인증정보는 제외합니다.
- is_active는 영업 중 여부가 아닌 서비스 노출 여부입니다. 검색 결과에서 빠졌다는 이유만으로 비활성화하지 않습니다.
- ORS 경로 거리·기본 시간과 ITS 실시간 교통은 장소의 고정 속성으로 저장하지 않습니다.
- 타입별 시간·요금 필드와 JSON 구조는 [수집·변환 설명](../BackEnd/NestJS/docs/TOUR_INGESTION.md)을 참고합니다. 분류 구조는 이 v2 명세를 우선합니다.

---

## `place_reviews` 테이블

### 테이블 설명

로그인 사용자의 장소 후기입니다. TourAPI에서 수집하는 데이터가 아니며, 별점만 작성할 수 있도록 후기 내용은 NULL을 허용합니다. 이 절은 최신 DDL v2와 대응합니다.

### 컬럼 명세

| 컬럼명 | 한글명 | 데이터 타입 | 제약 조건·기본값 | 출처·설명 |
|---|---|---|---|---|
| review_id | 리뷰 ID | UUID | PK, NOT NULL | 내부 생성 UUID. 리뷰 고유 식별자. |
| place_id | 후기 대상 장소 ID | UUID | FK, NOT NULL | 사용자가 후기를 남긴 places.place_id. API contentid가 아닌 내부 장소 UUID. |
| user_id | 작성자 ID | UUID | FK, NOT NULL | 로그인 사용자의 UUID. 기존 users.user_id를 참조하며 리뷰 작성 시 새 사용자 ID를 생성하지 않는다. |
| rating | 별점 | SMALLINT | NOT NULL, 1~5 | 사용자 입력 별점, 1~5 정수. |
| review_text | 후기 내용 | TEXT | NULL 허용 | 사용자 입력 후기 내용. 별점만 입력할 수 있도록 NULL 허용. |
| created_at | 생성 일시 | TIMESTAMPTZ | NOT NULL, 기본 CURRENT_TIMESTAMP | 내부 기록: 후기 작성 시각. |
| updated_at | 수정 일시 | TIMESTAMPTZ | NOT NULL, 기본 CURRENT_TIMESTAMP | 내부 기록: 후기 수정 시각. UPDATE에서 명시적으로 갱신. |

### 인덱스

- `pk_place_reviews`: review_id 기본키.
- `ix_place_reviews_place_created`: place_id, created_at DESC, review_id DESC.
- `ix_place_reviews_user_created`: user_id, created_at DESC, review_id DESC.

### 외래 키·검증 규칙

- `fk_place_reviews_place`: place_id → places.place_id.
- `fk_place_reviews_user`: user_id → users.user_id. 작성자 ID도 UUID이며 NULL을 허용하지 않습니다.
- 별점은 1~5 정수입니다. 기존 로그인 사용자의 ID를 연결하며 새 사용자 ID를 생성하지 않습니다.
- 사용자당 장소별 리뷰 개수 정책은 아직 정하지 않아 UNIQUE(user_id, place_id)를 두지 않습니다.
- updated_at은 UPDATE에서 명시적으로 갱신합니다. 생성·수정 권한은 서버에서 검사합니다.
- FK는 기본 NO ACTION으로 연결된 장소·회원이 자동 연쇄 삭제되지 않도록 합니다. 좋아요 기능은 포함하지 않습니다.

---

## `data_sources` 테이블

참고·미채택: 기존 수집 관리 설계의 컬럼 설명을 보존한 절입니다. 현재 3개 테이블 DDL에는 포함하지 않으며, 당장 별도 DB 테이블을 추가한다는 뜻은 아닙니다. 수집 실행 결과는 우선 서버 로그에 남기는 방향입니다.

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

## `ingestion_runs` 테이블

참고·미채택: 기존 수집 관리 설계의 컬럼 설명을 보존한 절입니다. 현재 3개 테이블 DDL에는 포함하지 않으며, 당장 별도 DB 테이블을 추가한다는 뜻은 아닙니다. 수집 실행 결과는 우선 서버 로그에 남기는 방향입니다.

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

## DDL 공통 규칙과 검증

- UUID는 애플리케이션에서 생성·전달합니다. created_at/updated_at의 DEFAULT는 INSERT에만 적용되며 자동 UPDATE 트리거는 없습니다.
- 최신 DDL의 FK는 기본 NO ACTION입니다. 연결 데이터의 연쇄 삭제를 설정하지 않았습니다.
- PK·UNIQUE 인덱스는 PostgreSQL이 생성합니다. FK 선언만으로 일반 조회 인덱스가 자동 생성되는 것은 아닙니다. 최신 3개 테이블의 조회 인덱스는 DDL에 명시했습니다.
- PGlite 임시 PostgreSQL 엔진에서 27개 검증을 통과했습니다. 이후 실제 개발 DB에 스키마를 생성하고 세 테이블·44개 컬럼·FK 4개·컬럼 주석 44개와 COMMIT 이후 유지 여부를 확인했습니다. 임시 엔진의 데이터 저장 검증과 개발 DB의 스키마 생성 검증은 구분하며, 후속 TourAPI 수집 테스트로 개발 DB에 분류 315개·관광지 2개 저장 및 재수집 시 UUID·상세 유지도 확인했습니다. [수집 안내](../BackEnd/NestJS/docs/TOUR_INGESTION.md)를 참고합니다.
- DDL v2는 신규 생성용입니다. v1과 연속 실행하거나 기존 테이블에 그대로 적용하는 마이그레이션이 아닙니다.

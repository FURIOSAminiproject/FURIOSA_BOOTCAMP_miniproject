-- PostgreSQL DDL: 장소·분류·후기, 2026-10-22.
-- 신규 생성용이며 기존 users(user_id) 테이블이 필요하다. 기존 데이터를 삭제하지 않는다.
-- place_schema_v1.sql 대신 이 파일을 사용한다. 기존 장소 테이블이 있으면 별도 이관이 필요하다.
-- UUID는 애플리케이션에서 생성한다. updated_at은 UPDATE에서 명시적으로 갱신한다.
-- 사용자 결정에 따라 리뷰 user_id도 UUID를 사용한다.
-- 기존 users.user_id가 UUID PK여야 한다. users와 회원 코드를 생성·변경하지 않는다.

BEGIN;

CREATE TABLE place_categories (
    category_id UUID NOT NULL,
    category_code VARCHAR(30) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_level SMALLINT NOT NULL,
    parent_category_id UUID,

    CONSTRAINT pk_place_categories PRIMARY KEY (category_id),
    CONSTRAINT uq_place_categories_code UNIQUE (category_code),
    CONSTRAINT ck_place_categories_code_not_blank CHECK (btrim(category_code) <> ''),
    CONSTRAINT ck_place_categories_name_not_blank CHECK (btrim(category_name) <> ''),
    CONSTRAINT ck_place_categories_level CHECK (category_level IN (1, 2, 3)),
    CONSTRAINT ck_place_categories_parent_presence CHECK (
        (category_level = 1 AND parent_category_id IS NULL)
        OR (category_level IN (2, 3) AND parent_category_id IS NOT NULL)
    ),
    CONSTRAINT ck_place_categories_not_self_parent CHECK (parent_category_id <> category_id),
    CONSTRAINT fk_place_categories_parent FOREIGN KEY (parent_category_id)
        REFERENCES place_categories (category_id)
);

CREATE TABLE places (
    -- 기본 정보: TourAPI contentid는 외부 ID, place_id는 내부 ID다.
    place_id UUID NOT NULL,
    content_id VARCHAR(30) NOT NULL,
    content_type_id SMALLINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- 주소·좌표
    address TEXT,
    address_detail TEXT,
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    region_code VARCHAR(2),
    region_name VARCHAR(100),
    district_code VARCHAR(3),
    district_name VARCHAR(100),

    -- 소분류 하나를 참조한다. 대·중분류는 상위 분류로 조회한다.
    category_id UUID,

    -- 이용 안내·이미지·요금
    phone TEXT,
    website_url TEXT,
    opening_hours TEXT,
    closed_days TEXT,
    main_image_url TEXT,
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    fee_text TEXT,
    fees JSONB NOT NULL DEFAULT '[]'::jsonb,
    event_start_date DATE,
    event_end_date DATE,

    -- 장소별 최신 원본과 수집 정보: place_sources를 따로 만들지 않는다.
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_url TEXT,
    source_type VARCHAR(20),
    source_updated_at TIMESTAMPTZ,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_places PRIMARY KEY (place_id),
    CONSTRAINT uq_places_content_id UNIQUE (content_id),
    CONSTRAINT fk_places_category FOREIGN KEY (category_id)
        REFERENCES place_categories (category_id),
    CONSTRAINT ck_places_content_id_not_blank CHECK (btrim(content_id) <> ''),
    CONSTRAINT ck_places_source_type CHECK (source_type IN ('API', 'CRAWLING')),
    CONSTRAINT ck_places_name_not_blank CHECK (btrim(name) <> ''),
    CONSTRAINT ck_places_content_type CHECK (
        content_type_id IN (12, 14, 15, 28, 32, 38, 39)
    ),
    CONSTRAINT ck_places_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_places_longitude CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_places_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
    CONSTRAINT ck_places_district_region CHECK (district_code IS NULL OR region_code IS NOT NULL),
    CONSTRAINT ck_places_images_array CHECK (jsonb_typeof(images) = 'array'),
    CONSTRAINT ck_places_fees_array CHECK (jsonb_typeof(fees) = 'array'),
    CONSTRAINT ck_places_raw_data_object CHECK (jsonb_typeof(raw_data) = 'object'),
    CONSTRAINT ck_places_event_dates CHECK (
        event_start_date IS NULL OR event_end_date IS NULL
        OR event_end_date >= event_start_date
    )
);

CREATE TABLE place_reviews (
    review_id UUID NOT NULL,
    place_id UUID NOT NULL,
    user_id UUID NOT NULL,
    rating SMALLINT NOT NULL,
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_place_reviews PRIMARY KEY (review_id),
    CONSTRAINT fk_place_reviews_place FOREIGN KEY (place_id)
        REFERENCES places (place_id),
    CONSTRAINT fk_place_reviews_user FOREIGN KEY (user_id)
        REFERENCES users (user_id),
    CONSTRAINT ck_place_reviews_rating CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX ix_place_categories_parent ON place_categories (parent_category_id);
CREATE INDEX ix_places_category ON places (category_id);
CREATE INDEX ix_places_active_area_type
    ON places (region_code, district_code, content_type_id) WHERE is_active;
CREATE INDEX ix_place_reviews_place_created
    ON place_reviews (place_id, created_at DESC, review_id DESC);
CREATE INDEX ix_place_reviews_user_created
    ON place_reviews (user_id, created_at DESC, review_id DESC);

-- FK는 분류의 존재만 검사한다. 부모 단계와 소분류 연결 규칙은 저장 로직에서 검사한다.
-- 원본 JSON 배열 내부 항목 검증도 애플리케이션에서 수행한다.

COMMENT ON TABLE place_categories IS
    'TourAPI 대·중·소 분류. 같은 테이블의 상위 분류를 참조하며 장소·분류 연결 테이블은 사용하지 않는다.';
COMMENT ON COLUMN place_categories.category_id IS
    '내부 생성 UUID. category_code로 재수집하며 기존 ID를 유지한다.';
COMMENT ON COLUMN place_categories.category_code IS
    'TourAPI lclsSystmCode2의 분류 코드. ListYn=Y일 때 lclsSystm1Cd/2Cd/3Cd, N일 때 code.';
COMMENT ON COLUMN place_categories.category_name IS
    'TourAPI lclsSystmCode2의 분류명. ListYn=Y일 때 lclsSystm1Nm/2Nm/3Nm, N일 때 name. 이름 중복 허용.';
COMMENT ON COLUMN place_categories.category_level IS
    '내부 지정: 대분류 1, 중분류 2, 소분류 3.';
COMMENT ON COLUMN place_categories.parent_category_id IS
    '같은 코드 응답의 상위 코드에 대응하는 내부 분류 ID. 중분류 부모는 대분류, 소분류 부모는 중분류로 저장 로직에서 검사.';

COMMENT ON TABLE places IS
    'TourAPI 장소 정보. 외부 ID·API별 최신 원본·수집 시각을 함께 저장. ORS 경로와 ITS 교통은 별도 조회·캐시 대상.';
COMMENT ON COLUMN places.place_id IS
    '내부 생성 UUID. 여행 일정·후기에서 참조하며 재수집 시 유지.';
COMMENT ON COLUMN places.content_id IS
    'TourAPI areaBasedList2/detailCommon2.contentid. 중복 수집 방지용 외부 콘텐츠 ID.';
COMMENT ON COLUMN places.content_type_id IS
    'TourAPI areaBasedList2/detailCommon2.contenttypeid. 12 관광지, 14 문화, 15 행사, 28 레포츠, 32 숙박, 38 쇼핑, 39 음식점.';
COMMENT ON COLUMN places.name IS
    'TourAPI areaBasedList2/detailCommon2.title. 장소명.';
COMMENT ON COLUMN places.description IS
    'TourAPI detailCommon2.overview. 장소 설명.';
COMMENT ON COLUMN places.address IS
    'TourAPI areaBasedList2/detailCommon2.addr1. 기본 주소.';
COMMENT ON COLUMN places.address_detail IS
    'TourAPI areaBasedList2/detailCommon2.addr2. 상세 주소.';
COMMENT ON COLUMN places.latitude IS
    'TourAPI areaBasedList2/detailCommon2.mapy. WGS84 위도.';
COMMENT ON COLUMN places.longitude IS
    'TourAPI areaBasedList2/detailCommon2.mapx. WGS84 경도.';
COMMENT ON COLUMN places.region_code IS
    'TourAPI areaBasedList2/detailCommon2.lDongRegnCd. 법정동 시도 코드.';
COMMENT ON COLUMN places.region_name IS
    'TourAPI ldongCode2에서 시도 코드에 해당하는 이름을 매핑.';
COMMENT ON COLUMN places.district_code IS
    'TourAPI areaBasedList2/detailCommon2.lDongSignguCd. 시도 코드와 함께 해석.';
COMMENT ON COLUMN places.district_name IS
    'TourAPI ldongCode2에서 해당 시도·시군구 코드에 대응하는 이름을 매핑.';
COMMENT ON COLUMN places.category_id IS
    'TourAPI lclsSystm3와 place_categories.category_code를 매칭한 소분류 UUID. 미제공·매칭 실패는 NULL. 단계 3 여부는 저장 로직에서 검사.';
COMMENT ON COLUMN places.phone IS
    'TourAPI areaBasedList2/detailCommon2.tel. 대표 연락처.';
COMMENT ON COLUMN places.website_url IS
    'TourAPI detailCommon2.homepage에서 HTTP(S) URL을 추출·검증.';
COMMENT ON COLUMN places.opening_hours IS
    'TourAPI detailIntro2의 타입별 시간: usetime/usetimeculture/playtime/usetimeleports/checkintime+checkouttime/opentime/opentimefood.';
COMMENT ON COLUMN places.closed_days IS
    'TourAPI detailIntro2의 타입별 휴무: restdate/restdateculture/restdateleports/restdateshopping/restdatefood. 행사·숙박 전용 필드 없음.';
COMMENT ON COLUMN places.main_image_url IS
    'TourAPI 목록·detailCommon2.firstimage 우선, 없으면 detailImage2.originimgurl에서 선택.';
COMMENT ON COLUMN places.images IS
    'TourAPI detailImage2 originimgurl/smallimageurl/cpyrhtDivCd 및 목록 대표 이미지 정보를 가공한 배열.';
COMMENT ON COLUMN places.fee_text IS
    'TourAPI detailIntro2(usefee/usetimefestival/usefeeleports 등), detailInfo2(infoname/infotext·숙박 객실별 요금)를 취합한 조건별 안내.';
COMMENT ON COLUMN places.fees IS
    '요금 원문을 label/text/amount/unit 배열로 가공. 금액·단위 미상은 JSON null, 명확한 무료만 0.';
COMMENT ON COLUMN places.event_start_date IS
    'TourAPI searchFestival2.eventstartdate. YYYYMMDD를 DATE로 변환.';
COMMENT ON COLUMN places.event_end_date IS
    'TourAPI searchFestival2.eventenddate. YYYYMMDD를 DATE로 변환.';
COMMENT ON COLUMN places.raw_data IS
    'TourAPI 엔드포인트별 최신 성공 items, fetched_at, source_url/source_urls. 인증키·인증 헤더는 제외.';
COMMENT ON COLUMN places.source_url IS
    '마지막 성공 장소 수집 요청 URL. 인증키·인증정보 제외. 이전 수집분은 요청 쿼리를 복원할 수 없어 엔드포인트 주소만 보완.';
COMMENT ON COLUMN places.source_type IS
    '내부 기록: API=API 호출, CRAWLING=크롤링. 미확인 출처는 NULL. 현재 TourAPI 수집기는 API로 저장.';
COMMENT ON COLUMN places.source_updated_at IS
    'TourAPI 목록·공통상세·동기화목록.modifiedtime. Asia/Seoul로 해석하는 수집 정책.';
COMMENT ON COLUMN places.last_synced_at IS
    '내부 기록: 이 장소의 마지막 성공 수집 시각. API별 시각은 raw_data에서 확인.';
COMMENT ON COLUMN places.is_active IS
    'TourAPI areaBasedSyncList2.showflag: 1=true, 0=false. 미수집 신규 행 기본 true. 검색 누락만으로 숨기지 않는다.';
COMMENT ON COLUMN places.created_at IS
    '내부 기록: 우리 DB 최초 삽입 시각. TourAPI createdtime과 다르다.';
COMMENT ON COLUMN places.updated_at IS
    '내부 기록: 우리 DB 수정 시각. UPDATE에서 명시적으로 갱신.';

COMMENT ON TABLE place_reviews IS
    '로그인 사용자가 작성하는 장소 후기. 외부 API 수집 대상이 아니며 사용자당 장소별 리뷰 수 제한은 아직 두지 않는다.';
COMMENT ON COLUMN place_reviews.review_id IS
    '내부 생성 UUID. 리뷰 고유 식별자.';
COMMENT ON COLUMN place_reviews.place_id IS
    '사용자가 후기를 남긴 places.place_id. API contentid가 아닌 내부 장소 UUID.';
COMMENT ON COLUMN place_reviews.user_id IS
    '로그인 사용자의 UUID. 기존 users.user_id를 참조하며 리뷰 작성 시 새 사용자 ID를 생성하지 않는다.';
COMMENT ON COLUMN place_reviews.rating IS
    '사용자 입력 별점, 1~5 정수.';
COMMENT ON COLUMN place_reviews.review_text IS
    '사용자 입력 후기 내용. 별점만 입력할 수 있도록 NULL 허용.';
COMMENT ON COLUMN place_reviews.created_at IS
    '내부 기록: 후기 작성 시각.';
COMMENT ON COLUMN place_reviews.updated_at IS
    '내부 기록: 후기 수정 시각. UPDATE에서 명시적으로 갱신.';

COMMIT;

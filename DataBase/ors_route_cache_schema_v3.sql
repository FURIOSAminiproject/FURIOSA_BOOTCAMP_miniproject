-- PostgreSQL 신규 생성 DDL v3: ORS 경로 캐시 전용 (2026-10-26)
-- 기존 v2의 ors_route_cache와 동일 구조. 이미 있으면 재실행하지 않는다.
-- ITS 테이블을 생성·조회·변경·삭제하지 않는다. 기존 데이터는 유지한다.
-- UUID와 해시는 서버에서 생성한다. 스케줄과 권한은 이 SQL이 등록하지 않는다.
BEGIN;
CREATE TABLE ors_route_cache (
    cache_id UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    request_params JSONB NOT NULL,
    profile VARCHAR(30) NOT NULL,
    preference VARCHAR(20) NOT NULL DEFAULT 'recommended',
    origin_longitude DOUBLE PRECISION NOT NULL,
    origin_latitude DOUBLE PRECISION NOT NULL,
    destination_longitude DOUBLE PRECISION NOT NULL,
    destination_latitude DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL,
    duration_seconds DOUBLE PRECISION NOT NULL,
    geometry JSONB NOT NULL,
    time_spans JSONB NOT NULL DEFAULT '[]'::jsonb,
    attribution TEXT,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_url TEXT NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),

    CONSTRAINT pk_ors_route_cache PRIMARY KEY (cache_id),
    CONSTRAINT uq_ors_route_cache_request UNIQUE (request_hash),
    CONSTRAINT ck_ors_request_hash CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_ors_request_params CHECK (jsonb_typeof(request_params) = 'object'),
    CONSTRAINT ck_ors_profile CHECK (profile IN ('driving-car', 'foot-walking')),
    CONSTRAINT ck_ors_preference CHECK (preference IN ('recommended', 'shortest')),
    CONSTRAINT ck_ors_origin_longitude CHECK (origin_longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_ors_origin_latitude CHECK (origin_latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_ors_destination_longitude CHECK (destination_longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_ors_destination_latitude CHECK (destination_latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_ors_distance CHECK (distance_meters >= 0 AND distance_meters < 'Infinity'::double precision),
    CONSTRAINT ck_ors_duration CHECK (duration_seconds >= 0 AND duration_seconds < 'Infinity'::double precision),
    CONSTRAINT ck_ors_geometry CHECK ((
        jsonb_typeof(geometry) = 'object'
        AND geometry ->> 'type' = 'LineString'
        AND jsonb_typeof(geometry -> 'coordinates') = 'array'
        AND jsonb_array_length(geometry -> 'coordinates') >= 2
    ) IS TRUE),
    CONSTRAINT ck_ors_time_spans CHECK (jsonb_typeof(time_spans) = 'array'),
    CONSTRAINT ck_ors_warnings CHECK (jsonb_typeof(warnings) = 'array'),
    CONSTRAINT ck_ors_source_url CHECK (source_url ~ '^https://[^[:space:]?#@]+$'),
    CONSTRAINT ck_ors_expiry CHECK (isfinite(fetched_at) AND isfinite(expires_at) AND expires_at > fetched_at)
);

CREATE INDEX ix_ors_route_cache_expiry ON ors_route_cache (expires_at);

COMMENT ON TABLE ors_route_cache IS 'ORS 요청 조건별 최신 경로 캐시. 기본 유효기간 24시간. 실시간 정체 미반영.';
COMMENT ON COLUMN ors_route_cache.cache_id IS '서버 생성 UUID. 캐시 행 식별자이며 영구 여행 경로 ID와 다르다.';
COMMENT ON COLUMN ors_route_cache.request_hash IS '인증정보를 제외하고 정규화한 실제 ORS 요청 조건의 SHA-256 소문자 64자리.';
COMMENT ON COLUMN ors_route_cache.request_params IS '좌표 전체(경유지 순서 포함), profile, preference, 상세 응답 옵션·계약 버전을 포함한 정규화 요청. 인증키 제외.';
COMMENT ON COLUMN ors_route_cache.profile IS 'ORS 요청 프로필: driving-car 자동차, foot-walking 도보.';
COMMENT ON COLUMN ors_route_cache.preference IS 'ORS 경로 선택 조건: recommended 또는 shortest.';
COMMENT ON COLUMN ors_route_cache.origin_longitude IS 'ORS 요청 첫 좌표의 경도. GeoJSON 좌표 순서는 [경도, 위도].';
COMMENT ON COLUMN ors_route_cache.origin_latitude IS 'ORS 요청 첫 좌표의 위도.';
COMMENT ON COLUMN ors_route_cache.destination_longitude IS 'ORS 요청 마지막 좌표의 경도.';
COMMENT ON COLUMN ors_route_cache.destination_latitude IS 'ORS 요청 마지막 좌표의 위도.';
COMMENT ON COLUMN ors_route_cache.distance_meters IS 'ORS features[0].properties.summary.distance. units=m 요청 기준 미터.';
COMMENT ON COLUMN ors_route_cache.duration_seconds IS 'ORS features[0].properties.summary.duration. 초. ITS 정체를 반영한 시간이 아니다.';
COMMENT ON COLUMN ors_route_cache.geometry IS 'ORS features[0].geometry의 GeoJSON LineString. 개별 좌표 쌍·유한값·범위는 서버에서 검사.';
COMMENT ON COLUMN ors_route_cache.time_spans IS 'ORS segments[].steps[]에서 가공한 [{fromIndex,toIndex,durationSeconds}]. 상세가 없으면 []. 인덱스·연속성·합계는 서버 검사.';
COMMENT ON COLUMN ors_route_cache.attribution IS 'ORS metadata.attribution. 제공되지 않으면 NULL. 화면의 라이선스·출처 표시 정책은 별도 유지.';
COMMENT ON COLUMN ors_route_cache.warnings IS 'ORS features[0].properties.warnings 배열. 없으면 [].';
COMMENT ON COLUMN ors_route_cache.source_url IS '인증정보·쿼리 없는 ORS 엔드포인트 URL. 인증키는 저장하지 않는다.';
COMMENT ON COLUMN ors_route_cache.fetched_at IS '서버가 ORS 결과를 성공적으로 수집한 시각.';
COMMENT ON COLUMN ors_route_cache.expires_at IS '서버 캐시 만료 시각. 기본 24시간. 만료 후 조회에서 제외하며 실제 삭제는 별도 작업.';

COMMIT;

-- PostgreSQL 신규 생성 DDL: ORS 경로 캐시 / ITS 조회 캐시 / ITS 구간 관측값
-- 이전 설계 보존용. 2026-10-26부터 현재 서비스 신규 생성은 ors_route_cache_schema_v3.sql을 사용한다.
-- 작성: 2026-10-23. 기존 테이블·데이터를 삭제하거나 변경하지 않는다.
-- 대상 DB와 스키마를 확인한 후 전체 스크립트를 실행한다.
-- 같은 이름의 테이블이 이미 있으면 중단한다. IF NOT EXISTS로 구조 차이를 숨기지 않는다.
-- UUID와 SHA-256 요청 해시는 서버에서 생성한다. PostgreSQL 확장 설치는 필요 없다.
-- 이 DDL은 백엔드 캐시 연동이나 만료 데이터 자동 삭제 스케줄러를 등록하지 않는다.

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

CREATE TABLE its_traffic_cache (
    cache_id UUID NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    request_params JSONB NOT NULL,
    item_count INTEGER NOT NULL DEFAULT 0,
    source_url TEXT NOT NULL DEFAULT 'https://openapi.its.go.kr:9443/trafficInfo',
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '5 minutes'),

    CONSTRAINT pk_its_traffic_cache PRIMARY KEY (cache_id),
    CONSTRAINT uq_its_traffic_cache_request UNIQUE (request_hash),
    CONSTRAINT ck_its_request_hash CHECK (request_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_its_request_params CHECK (jsonb_typeof(request_params) = 'object'),
    CONSTRAINT ck_its_item_count CHECK (item_count >= 0),
    CONSTRAINT ck_its_source_url CHECK (source_url ~ '^https://[^[:space:]?#@]+$'),
    CONSTRAINT ck_its_expiry CHECK (isfinite(fetched_at) AND isfinite(expires_at) AND expires_at > fetched_at)
);

CREATE TABLE its_traffic_links (
    cache_id UUID NOT NULL,
    link_id VARCHAR(30) NOT NULL,
    start_node_id VARCHAR(30),
    end_node_id VARCHAR(30),
    road_name TEXT,
    road_direction VARCHAR(30),
    link_no VARCHAR(30),
    speed DOUBLE PRECISION,
    travel_time_seconds DOUBLE PRECISION,
    observed_at TIMESTAMPTZ,

    CONSTRAINT pk_its_traffic_links PRIMARY KEY (cache_id, link_id),
    CONSTRAINT fk_its_traffic_links_cache FOREIGN KEY (cache_id)
        REFERENCES its_traffic_cache (cache_id) ON DELETE CASCADE,
    CONSTRAINT ck_its_link_id CHECK (btrim(link_id) <> ''),
    CONSTRAINT ck_its_start_node CHECK (start_node_id IS NULL OR btrim(start_node_id) <> ''),
    CONSTRAINT ck_its_end_node CHECK (end_node_id IS NULL OR btrim(end_node_id) <> ''),
    CONSTRAINT ck_its_speed CHECK (speed IS NULL OR (speed >= 0 AND speed < 'Infinity'::double precision)),
    CONSTRAINT ck_its_travel_time CHECK (travel_time_seconds IS NULL OR (travel_time_seconds > 0 AND travel_time_seconds < 'Infinity'::double precision)),
    CONSTRAINT ck_its_observed_at CHECK (observed_at IS NULL OR isfinite(observed_at))
);

CREATE INDEX ix_ors_route_cache_expiry ON ors_route_cache (expires_at);
CREATE INDEX ix_its_traffic_cache_expiry ON its_traffic_cache (expires_at);
CREATE INDEX ix_its_traffic_links_link ON its_traffic_links (link_id, cache_id);

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

COMMENT ON TABLE its_traffic_cache IS 'ITS trafficInfo 조회 조건별 최신 캐시 헤더. 기본 유효기간 5분. 정상 빈 결과도 보관.';
COMMENT ON COLUMN its_traffic_cache.cache_id IS '서버 생성 UUID. 한 영역·도로 조건의 조회 캐시 ID.';
COMMENT ON COLUMN its_traffic_cache.request_hash IS '인증정보를 제외하고 정규화한 ITS 요청 조건의 SHA-256 소문자 64자리.';
COMMENT ON COLUMN its_traffic_cache.request_params IS 'ITS minX/maxX/minY/maxY, type/drcType 등 실제 필터와 계약 버전. apiKey 제외.';
COMMENT ON COLUMN its_traffic_cache.item_count IS '이번 조회에 저장한 서로 다른 link_id 개수. 실제 자식 행 개수와의 일치는 서버 트랜잭션에서 검사.';
COMMENT ON COLUMN its_traffic_cache.source_url IS '인증키·쿼리 없는 ITS trafficInfo 엔드포인트 URL.';
COMMENT ON COLUMN its_traffic_cache.fetched_at IS '서버의 성공 수집 시각. 구간별 원천 관측 시각과 다르다.';
COMMENT ON COLUMN its_traffic_cache.expires_at IS '기본 5분 뒤 캐시 만료. 원천 교통정보의 최신성을 보장하지 않는다.';

COMMENT ON TABLE its_traffic_links IS 'ITS 조회 캐시에 종속된 구간별 최신 관측값. 영구 도로망 테이블이 아니며 부모 캐시 삭제 시 함께 삭제.';
COMMENT ON COLUMN its_traffic_links.cache_id IS 'its_traffic_cache.cache_id FK. 조회 1건에 구간 0~N건.';
COMMENT ON COLUMN its_traffic_links.link_id IS 'ITS body.items[].linkId. 선행 0 보존 문자열. 다른 조회 캐시에서 같은 도로 ID가 반복될 수 있다.';
COMMENT ON COLUMN its_traffic_links.start_node_id IS 'ITS startNodeId. 시작 노드 ID. 빈 문자열은 NULL로 정리.';
COMMENT ON COLUMN its_traffic_links.end_node_id IS 'ITS endNodeId. 끝 노드 ID. 방향·지도 버전 검증 전 매칭을 확정하지 않는다.';
COMMENT ON COLUMN its_traffic_links.road_name IS 'ITS roadName. 도로 이름만으로 ORS 경로와 연결하지 않는다.';
COMMENT ON COLUMN its_traffic_links.road_direction IS 'ITS roadDrcType 원천 방향 값. 빈 문자열은 NULL.';
COMMENT ON COLUMN its_traffic_links.link_no IS 'ITS linkNo 원천 값. 빈 문자열은 NULL.';
COMMENT ON COLUMN its_traffic_links.speed IS 'ITS speed 원천 숫자. 단위 오기 확인 전 km/h로 확정하거나 임의 정체 등급을 만들지 않는다. 관측값 0은 보존.';
COMMENT ON COLUMN its_traffic_links.travel_time_seconds IS 'ITS travelTime, 초. 0/결측 등 미확인 시간은 서버에서 NULL로 정리. ORS 전체 시간에 단순 가산하지 않는다.';
COMMENT ON COLUMN its_traffic_links.observed_at IS 'ITS createdDate(YYYYMMDDHHMMSS)를 한국 시각으로 해석. 결측/잘못된 날짜는 NULL.';

COMMIT;

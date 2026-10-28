-- 운영 DB 전용: EC2에서 관리자로 travel_prod에 연결해 수동 실행한다.
-- 앱 기동 시 자동 실행하지 않는다. 기존 위도/경도와 데이터는 유지한다.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $$
BEGIN
  IF current_database() <> 'travel_prod' THEN
    RAISE EXCEPTION 'PostGIS migration requires travel_prod; no changes applied';
  END IF;
END
$$;

CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE public.places
ADD COLUMN IF NOT EXISTS location geography(Point, 4326)
GENERATED ALWAYS AS (
  CASE WHEN longitude IS NOT NULL AND latitude IS NOT NULL
    THEN ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
    ELSE NULL
  END
) STORED;
CREATE INDEX IF NOT EXISTS ix_places_location_gist
ON public.places USING GIST (location);
COMMIT;

ANALYZE public.places;
SELECT current_database(), extversion AS postgis_version
FROM pg_extension WHERE extname = 'postgis';
SELECT COUNT(*) AS total_places, COUNT(location) AS places_with_location
FROM public.places;
SELECT indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'places'
  AND indexname = 'ix_places_location_gist';
-- IF NOT EXISTS는 같은 이름의 기존 컬럼/인덱스 정의를 수정하지 않는다.

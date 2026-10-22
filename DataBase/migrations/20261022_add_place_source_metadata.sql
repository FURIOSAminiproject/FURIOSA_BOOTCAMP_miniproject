-- 기존 v2(places 30컬럼)에 수집 출처 2컬럼 추가. 신규 환경은 place_schema_v2.sql만 실행.
-- 장소 UUID·내용·후기·수집 시각은 유지한다. 자동 마이그레이션으로 등록하지 않는다.
BEGIN;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE public.places ADD COLUMN IF NOT EXISTS source_type VARCHAR(20);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conrelid = 'public.places'::regclass AND conname = 'ck_places_source_type') THEN
        ALTER TABLE public.places ADD CONSTRAINT ck_places_source_type
            CHECK (source_type IN ('API', 'CRAWLING'));
    END IF;
END $$;

-- 과거 원본에 TourAPI 엔드포인트가 확인되는 행만 보완한다.
-- 과거 요청 쿼리는 저장하지 않았으므로 임의로 만들지 않고 엔드포인트 URL만 기록한다.
WITH latest AS (
    SELECT p.place_id, s.key
    FROM public.places p
    CROSS JOIN LATERAL (
        SELECT key FROM jsonb_each(p.raw_data)
        WHERE key IN ('areaBasedList2','areaBasedSyncList2','searchFestival2',
                      'detailCommon2','detailIntro2','detailInfo2','detailImage2')
        ORDER BY value->>'fetched_at' DESC NULLS LAST, key DESC LIMIT 1
    ) s
    WHERE p.source_type IS NULL
)
UPDATE public.places p
SET source_type = 'API',
    source_url = COALESCE(p.source_url, 'https://apis.data.go.kr/B551011/KorService2/' || latest.key)
FROM latest WHERE p.place_id = latest.place_id;

COMMENT ON COLUMN public.places.raw_data IS
    'TourAPI 엔드포인트별 최신 성공 items, fetched_at, source_url/source_urls. 인증키·인증 헤더는 제외.';
COMMENT ON COLUMN public.places.source_url IS
    '마지막 성공 장소 수집 요청 URL. 인증키·인증정보 제외. 이전 수집분은 요청 쿼리를 복원할 수 없어 엔드포인트 주소만 보완.';
COMMENT ON COLUMN public.places.source_type IS
    '내부 기록: API=API 호출, CRAWLING=크롤링. 미확인 출처는 NULL. 현재 TourAPI 수집기는 API로 저장.';
COMMIT;

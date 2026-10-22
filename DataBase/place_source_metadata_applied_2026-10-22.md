# 장소 수집 출처 컬럼 적용 기록

- 적용: 2026-10-22 13:40:16 KST, 개발 DB `travel_test.public`.
- 실행 파일: [20261022_add_place_source_metadata.sql](migrations/20261022_add_place_source_metadata.sql).
- SHA-256: `76c849ec9213c65b761146b6948e517c240fdb1517af61732176112ee69bdb43`.
- 변경: `places.source_url TEXT`, `places.source_type VARCHAR(20)`와 API/CRAWLING 체크 제약. 두 컬럼은 미확인 출처의 NULL을 허용한다.
- 현재 컬럼 수: place_categories 5, places 32, place_reviews 7. 새 테이블은 만들지 않았다.
- 기존 2개 장소의 UUID·설명·생성/수정 시각과 후기 행 보존을 적용 전후 대조했다. 후기 행은 0개였다. users는 변경하지 않았다.
- 기존 TourAPI 원본이 있는 2행만 API와 확인 가능한 엔드포인트 URL을 보완했다. 당시 요청 쿼리는 임의로 복원하지 않았다.

## 실제 재수집 확인

2026-10-22 13:41:06 KST에 TourAPI 부산 사하구 관광지 목록 2건을 실제 재수집했다. 분류·지역 조회를 포함해 6요청을 사용했고 inserted=0, updated=0, unchanged=2였다. 분류는 315개이며 장소 UUID·설명·요금·이미지 상세가 유지됐다.

두 장소 모두 source_type=API, source_url은 실제 areaBasedList2의 지역·타입·페이지 쿼리까지 저장됐다. URL과 raw_data에 serviceKey가 없는 것을 확인했다. 이후 여러 상세 API를 호출하면 마지막 성공한 장소 상세 URL이 source_url이 되고 API별 주소는 raw_data에서 확인할 수 있다. 과거 전체 수집 이력은 저장하지 않는다.

운영 DB에는 실행하지 않았다. 신규 환경은 [최신 생성 DDL](place_schema_v2.sql)을 사용하고, 기존 30컬럼 v2 환경은 변경 SQL만 실행한다. 자동 마이그레이션은 비활성화 상태다.

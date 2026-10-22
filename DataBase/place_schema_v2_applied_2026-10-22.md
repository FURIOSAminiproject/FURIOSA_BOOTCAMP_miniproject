# DDL v2 개발 DB 실행 기록

- 실행 일시: 2026-10-22 11:38:48 KST.
- 대상: `travel_test.public` 개발 DB.
- 실행 파일: [place_schema_v2.sql](place_schema_v2.sql).
- 실행 당시 파일 SHA-256: `c82b317f77e784dce066ab460dcdc0c532c059bf3b581d714e98b68cedb9f7cc`.
- 사용자 실행 지시와 개발 DB 선택에 따라 트랜잭션으로 생성하고 검증 후 COMMIT했습니다.

## 결과

| 테이블 | 컬럼 수 |
|---|---:|
| place_categories | 5 |
| places | 30 |
| place_reviews | 7 |

실행 전 기존 세 테이블이 없고 users.user_id가 UUID PK인 것을 확인했습니다. 세 테이블 생성 후 총 42개 컬럼과 컬럼 주석 42개, FK 4개를 검사했고 COMMIT 후에도 테이블·컬럼이 유지되는 것을 확인했습니다.

| 외래키 | 참조 |
|---|---|
| fk_place_categories_parent | place_categories.parent_category_id → place_categories.category_id |
| fk_places_category | places.category_id → place_categories.category_id |
| fk_place_reviews_place | place_reviews.place_id → places.place_id |
| fk_place_reviews_user | place_reviews.user_id → users.user_id |

기존 users 테이블과 회원 데이터는 변경하지 않았습니다. API 데이터 수집·분류 초기 데이터·후기 삽입은 실행하지 않았습니다. 이번 실행은 개발 DB에만 수행했습니다.

현재 백엔드 User 엔티티의 정수 자동 증가 선언과 실제 개발 DB의 UUID 컬럼이 다르다는 점은 별도 코드 정합성 검토 대상으로 남습니다. 회원 코드와 시퀀스는 이 작업에서 변경하지 않았습니다.

이 DDL은 신규 생성용이므로 같은 개발 DB에서 다시 실행하면 테이블 중복 오류가 발생합니다. 후속 변경은 별도 마이그레이션으로 작성합니다.

## 후속 변경: 수집 출처 컬럼

이 문서의 최초 적용 시각·해시는 당시 42컬럼 생성본 기록이다. 이후 생성 DDL에 source_url/source_type을 추가했으며 현재 생성본의 파일 해시와 다르다. 기존 개발 DB에는 2026-10-22 13:40:16 KST에 별도 변경 SQL을 적용했다. 현재 총 44컬럼이며 [출처 컬럼 변경 기록](place_source_metadata_applied_2026-10-22.md)을 참고한다.

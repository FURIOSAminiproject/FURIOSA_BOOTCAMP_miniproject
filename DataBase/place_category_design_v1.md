# 장소 분류 테이블 설계

작성일: 2026-10-22. 최신 결정은 place_category_map과 place_sources 제외, 장소 분류 테이블 유지다. 기존 ERD의 이름을 따라 테이블명은 `place_categories`로 표기한다. 현재 통합 DDL과 개발 DB 적용 내역은 [설계 v2](place_design_v2.md)와 [적용 기록](place_schema_v2_applied_2026-10-22.md)을 따른다.

## 컬럼 5개

| 컬럼 | 한글명 | PostgreSQL 타입 | 제약 | 출처·설명 |
|---|---|---|---|---|
| `category_id` | 분류 ID | UUID | PK, NOT NULL | 서버에서 생성하는 내부 분류 ID. 재수집할 때 유지 |
| `category_code` | TourAPI 분류 코드 | VARCHAR(30) | UNIQUE, NOT NULL | lclsSystmCode2의 대·중·소 분류 코드. 이름 대신 이 코드로 중복 수집 판별 |
| `category_name` | 분류명 | VARCHAR(100) | NOT NULL | lclsSystmCode2의 해당 분류명. 서로 다른 단계에서 이름이 같을 수 있어 UNIQUE를 걸지 않음 |
| `category_level` | 분류 단계 | SMALLINT | NOT NULL, 1/2/3 | 대분류 1, 중분류 2, 소분류 3으로 서버에서 지정 |
| `parent_category_id` | 상위 분류 ID | UUID | FK → place_categories.category_id, NULL 허용 | 상위 분류의 내부 ID. 대분류는 NULL, 중·소분류는 바로 위 단계의 ID |

TourAPI의 설명 필드에 대응하지 않는 description, 자체 태그, 개별 변경 이력은 우선 추가하지 않는다. 생성·수정 시각은 필요할 때 추가할 수 있지만 최소 컬럼에는 포함하지 않는다.

## TourAPI 원본 필드 대응

`lclsSystmCode2`에 `lclsSystmListYn=Y`를 사용해 전체 계층 목록을 받는 경우의 대응이다. 페이지가 나뉘면 전체 페이지를 수집한다.

| 단계 | category_code 원본 | category_name 원본 | 부모를 찾는 기준 |
|---|---|---|---|
| 대분류 1 | `lclsSystm1Cd` | `lclsSystm1Nm` | 없음 |
| 중분류 2 | `lclsSystm2Cd` | `lclsSystm2Nm` | 같은 응답의 lclsSystm1Cd |
| 소분류 3 | `lclsSystm3Cd` | `lclsSystm3Nm` | 같은 응답의 lclsSystm2Cd |

code/name 형태의 `lclsSystmListYn=N` 응답을 사용해도 같은 테이블에 넣을 수 있다. 그 경우 요청한 단계와 상위 코드 문맥을 이용해 level과 parent를 지정한다. 두 방식을 혼용해도 category_code로 동일 분류를 식별한다.

## 저장 예시

아래 A/B/C는 설명용 내부 ID 표시이며 실제 저장값은 UUID다.

| category_id | category_code | category_name | category_level | parent_category_id |
|---|---|---|---:|---|
| A | AC | 숙박 | 1 | NULL |
| B | AC01 | 호텔 | 2 | A |
| C | AC010100 | 호텔 | 3 | B |

대·중·소 분류를 각각 별도 테이블로 나누지 않고 한 테이블의 여러 행으로 저장한다. 중분류와 소분류의 이름이 모두 호텔인 것은 허용한다.

## places와 연결

`places`에 `category_id UUID NULL`을 두고 `place_categories.category_id`를 참조한다. 원칙적으로 TourAPI `lclsSystm3`에 대응하는 소분류 ID를 저장한다. 같은 소분류에 여러 장소가 연결되는 1:N 관계이며 연결 테이블은 없다.

장소의 API 응답에는 `lclsSystm3`가 내려오므로 category_code로 분류 행을 찾고, 그 행의 category_id를 places.category_id에 넣는다. 코드를 UUID로 직접 변환하는 것이 아니다. 소분류가 없거나 코드표에서 찾지 못하면 NULL로 두고 원본·수집 로그를 확인한다. 없는 코드를 임의의 분류에 연결하지 않는다.

소분류 C → 중분류 B → 대분류 A로 따라가면 전체 분류 경로를 알 수 있다. 이 방식을 채택할 때 이전 단일 테이블 초안의 category1/2/3_code 및 category1/2/3_name 6개 컬럼은 category_id로 대체하는 방향이다. 기존 DB의 컬럼 삭제나 데이터 이관을 실행했다는 뜻은 아니다.

## 검증 규칙

- category_code와 category_name은 빈 문자열로 저장하지 않는다.
- 대분류는 부모가 없고, 중분류의 부모는 대분류, 소분류의 부모는 중분류여야 한다.
- 자기 자신을 부모로 참조하지 않는다. 부모 단계 검증은 FK만으로 보장되지 않으므로 수집·저장 로직에서도 검사한다.
- 재수집 시 category_code를 기준으로 추가·갱신하고 category_id는 유지한다.
- TourAPI의 contenttypeid(관광지 12, 숙박 32 등)는 이 계층과 별개이므로 places.content_type_id에 유지한다.

이 분류 분리안을 반영한 최신 생성 SQL은 [장소·분류·후기 DDL v2](place_schema_v2.sql)다. [통합 설계 설명](place_design_v2.md)을 함께 참고한다. 기존 단일 테이블 DDL v1은 이전 초안이며 두 파일을 연속 실행하지 않는다.

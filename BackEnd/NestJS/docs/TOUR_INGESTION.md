# TourAPI 장소 수집

구현일: 2026-10-22. 실행 대상은 BackEnd/NestJS이며, DataBase/place_schema_v2.sql의 장소·분류 테이블을 사용한다. 스키마 생성·변경·TRUNCATE·리뷰 삽입은 수행하지 않는다.

책임별 모듈 구조와 SOLID 적용·검증 기록, 현재 장소가 2건인 이유는 [장소 모듈 README](../src/places/README.md)를 참고한다.

## 실행

선택한 환경 파일 또는 시스템 환경변수에 `TOUR_API_KEY`를 설정한다. 디코딩 키와 1회 URL 인코딩된 키를 모두 받아 요청 시 한 번만 인코딩한다. 실제 키는 커밋하지 않는다. 사용자가 이전에 제공한 키를 실제 환경 파일에 자동 저장하지 않았다.

```env
TOUR_API_KEY=본인_인증키
TOUR_API_MOBILE_APP=FuriosaTravel
TOUR_API_MAX_REQUESTS=200
TOUR_API_INTERVAL_MS=250
TOUR_API_TIMEOUT_MS=15000
```

저장소 루트에서 BackEnd/NestJS로 이동한 뒤 실행한다. local/dev/prod는 기존 시작 스크립트와 같은 환경 파일·시스템 변수 우선순위를 사용한다. 모드는 필수이며 자동으로 운영 DB를 선택하지 않는다. 실제 대상은 해당 환경의 DB_HOST/DB_NAME 설정이다.

```powershell
# 부산 사하구 관광지: 한 페이지 2건, 상세 포함
npm run tour:ingest -- dev --region 26 --district 380 --content-type 12 --page-size 2 --max-pages 1

# 상세는 유지하고 목록 필드만 수집
npm run tour:ingest -- dev --region 26 --district 380 --content-type 12 --page-size 20 --list-only

# 다음 페이지부터 계속 수집
npm run tour:ingest -- dev --region 26 --district 380 --content-type 12 --start-page 2 --max-pages 1

# 표시·비표시 변경분을 모두 조회. 날짜는 한국 날짜 기준 YYYYMMDD
npm run tour:ingest -- dev --mode sync --modified-since 20261021 --region 26 --list-only

# 단일 장소 상세 갱신. 외부 contentid 사용
npm run tour:ingest -- dev --mode detail --content-id 127974

# 행사 기간 수집. 기본 장소 목록만으로는 행사 날짜가 채워지지 않음
npm run tour:ingest -- dev --mode festivals --region 26 --event-start 20261022 --event-end 20261231

# 분류·시도 코드 조회와 분류 저장만 실행
npm run tour:ingest -- dev --mode reference
```

production 모드는 빌드된 dist/places/ingest.js를 사용하므로 먼저 npm run build 또는 npm run build:prod를 실행한다. 일반 웹 서버를 재시작하거나 공개 HTTP 수집 엔드포인트를 호출하는 방식은 아니다. 관리 역할이 없는 기존 인증 API에 임의 수집 권한을 추가하지 않았으며 서버 명령에서만 실행한다. 추후 작업 스케줄러는 같은 서비스를 호출할 수 있지만 자동 스케줄은 아직 없다.

기존 v2의 places가 30컬럼이면 먼저 [출처 컬럼 추가 SQL](../../../DataBase/migrations/20261022_add_place_source_metadata.sql)을 적용한다. 최신 생성 DDL은 32컬럼이며 개발 DB travel_test에는 변경 SQL 적용을 완료했다. 자동 스키마 변경은 사용하지 않는다.

## 옵션과 호출 한도

| 옵션 | 기본값·의미 |
|---|---|
| --mode | initial / sync / festivals / detail / reference. 기본 initial |
| --region, --district | 법정동 시도·시군구 코드. 시군구에는 시도 필수 |
| --content-type | 12/14/15/28/32/38/39. 생략 시 지원 타입을 수집하고 여행코스 25 등은 건너뜀 |
| --page-size | 기본 20, 최대 100 |
| --start-page | 기본 1 |
| --max-pages | 기본 1. sync는 표시·비표시 각각에 적용 |
| --list-only | 설명·소개·반복·이미지 상세 요청을 생략 |
| --modified-since | sync에서 필수. YYYYMMDD |
| --content-id | detail에서 필수. 내부 UUID가 아닌 TourAPI 콘텐츠 ID |
| --event-start, --event-end | festivals에서 시작일 필수, 종료일 선택 |

기본 한 페이지 실행은 전국 전체 수집을 뜻하지 않는다. 응답 nextPages에 다음 페이지가 있으면 이어서 실행한다. 상세 기본 수집은 장소당 최소 네 요청이며 반복·이미지가 페이지로 나뉘면 더 사용한다. 분류·지역 코드·재시도도 maxRequests에 포함한다. 이 값은 한 실행 프로세스의 자체 요청 제한이며 제공기관의 일일 잔여량을 보장하지 않는다.

HTTP 5xx는 한 번만 재시도한다. 인증 오류·호출 한도·잘못된 JSON·비정상 결과코드·네트워크 타임아웃은 성공으로 처리하지 않고 종료한다. XML로 반환된 게이트웨이 오류도 JSON 파싱 실패로 처리한다. URL·인증키·원본 오류 응답은 로그에 출력하지 않는다.

## 처리 흐름

1. DB v2 테이블을 확인하고 PostgreSQL 세션 advisory lock으로 같은 DB의 중복 수집 실행을 막는다.
2. lclsSystmCode2(lclsSystmListYn=Y)를 전체 페이지 조회한다. 계층·동일 코드의 충돌을 검사한 뒤 대→중→소 순으로 한 트랜잭션에서 UPSERT한다. 분류 ID는 유지한다.
3. ldongCode2(lDongListYn=N)로 시도 이름을 읽고, 등장한 시도별 시군구 이름을 메모리 사전에 추가한다. 별도 지역 테이블을 만들지 않는다.
4. 지역 목록, 동기화 목록 또는 행사 목록을 페이지별로 읽는다. contentid가 같으면 같은 places 행을 갱신한다. 미지원 타입·잘못된 필수 장소 정보는 건너뛰고 제한된 issue 목록으로 알린다.
5. 기본 모드에서는 장소마다 detailCommon2, detailIntro2, detailInfo2, detailImage2를 조회한다. 네 상세 요청이 모두 성공한 경우에만 상세 묶음을 저장한다. 상세 실패 전에 저장된 기본 장소는 유지되고, 기존 상세를 불완전한 응답으로 지우지 않는다.
6. 각 장소 저장은 트랜잭션이다. 호출 사이에 장시간 DB 트랜잭션을 유지하지 않는다. 성공한 장소의 정보와 API별 최신 원본·수집 시각을 함께 반영한다.

실행 전체가 하나의 트랜잭션인 것은 아니다. 중간 API 오류가 나면 앞서 성공한 분류·장소는 남는다. nextPages의 해당 페이지부터 재시도하면 이미 저장한 장소를 중복 생성하지 않는다. 동기화 재실행은 누락 방지를 위해 날짜 범위를 겹치게 잡는다. 필터에 나오지 않은 장소를 자동 삭제·비활성화하지 않는다. 지역 필터는 지역을 옮긴 장소의 누락까지 해결하지 않으므로 서비스 운영 시 전체 범위 점검 정책은 별도로 정한다.

## 데이터 변환·갱신

- UUID는 서버가 생성한다. ON CONFLICT(content_id) 갱신에서 place_id와 created_at을 유지하므로 기존 일정·후기 연결이 바뀌지 않는다. 분류도 category_code로 동일 ID를 유지한다.
- mapx=경도, mapy=위도. 범위·숫자·좌표 쌍을 검사하고 (0,0)은 미제공으로 처리한다.
- modifiedtime은 한국 시각으로 해석한다. 내부 updated_at·last_synced_at과 구분한다.
- API에 없는 필드는 갱신하지 않는다. 예를 들어 목록 수집은 기존 overview·homepage·운영시간을 지우지 않는다. 목록의 빈 대표 이미지는 기존 대표 이미지를 유지한다. 그 밖에 성공 응답에 명시된 빈 선택값은 NULL로 반영할 수 있다.
- 실제 데이터·원본 내용이 같으면 unchanged로 집계하고 updated_at을 유지한다. last_synced_at과 API별 fetched_at 갱신 때문에 DB 메타데이터 쓰기는 발생한다.
- category_id는 소분류 코드를 분류 테이블에서 찾아 연결한다. 모르는 코드는 NULL이며 원본에는 외부 코드가 남는다.
- 홈페이지는 HTTP(S) 링크만 추출한다. 설명·안내는 HTML 태그를 제거한 표시 문자열로 저장하고 원문은 raw_data에 보존한다. 화면 출력 시에도 적절한 이스케이프가 필요하다.
- 행사 날짜는 searchFestival2에서 저장한다. 날짜 미상·역전은 임의로 확정하지 않는다.
- detailImage2의 개별 cpyrhtDivCd를 해당 이미지에 붙인다. 출처 문구를 임의 생성하지 않으며 attribution은 미확인 시 null이다.
- 관광지 입장료는 detailInfo2의 안내 제목·내용으로 찾고 serialnum 번호에 의존하지 않는다. 행사 usetimefestival은 이용요금이며 시간은 playtime이다.
- 이용요금은 조건과 원문을 보존한다. 단위·단일 금액이 명확할 때만 숫자로 정리한다. 여러 연령 요금을 합산하지 않고, 범위·할인 등은 미상으로 둔다. 숙박의 원본 숫자 0은 무료로 해석하지 않는다. 메뉴명만으로 식비를 추정하지 않는다.
- source_payload 별도 테이블은 없다. places.source_type은 API로 저장하고 source_url은 마지막 성공 장소 요청 URL을 저장한다. raw_data는 각 API의 마지막 성공 장소 items, fetched_at, source_url을 저장하고, 여러 페이지는 source_urls 배열도 남긴다. 인증키·인증 쿼리는 URL에서 제거한다. URL·수집 방식만 달라져도 updated_at은 유지하며 last_synced_at은 갱신한다. 과거 변경 이력은 축적하지 않는다.

## 실행 결과

표준 출력의 JSON은 시작·종료 시각, 상태, API 요청 횟수, 분류 수, 목록 처리 수, 상세 보완 수, 다음 페이지를 담는다. inserted/updated/unchanged는 목록 저장 결과, enriched는 상세 저장 성공 건수다. detail 모드는 enriched를 확인한다. API 오류 시 종료 코드 1과 실패 결과를 반환한다. 필수 장소 필드 오류로 건너뛴 행은 skipped에 집계하므로 completed만 보지 않고 skipped/nextPages도 확인한다.

## 검증 결과와 범위

- 로컬 전용 검증 파일을 포함한 Node 내장 수집 테스트 25개(기존 수집 14개 + 책임·계약 11개), 전체 Node 31개 + Jest 4개가 Node 22.23.3에서 통과했다. 운영 빌드도 통과했다. 검증용 테스트 코드는 배포 커밋에서 제외하며, 배포 커밋의 npm test는 기존 Node 6개 + Jest 4개를 실행한다. 검사 내용: 인증키 인코딩·오류 비노출, JSON/페이지 검증, 요청 예산, 분류 계층, 좌표·날짜, 요금·이미지, 부분 실패, 표시/비표시 동기화, CLI 입력 검증.
- 임시 PostgreSQL(PGlite): 실제 SQL UPSERT, 분류/장소 UUID 유지, 상세·원본 병합, unchanged 판정, 비표출 시 후기 FK 유지.
- 2026-10-22 개발 DB travel_test.public에서 실제 TourAPI 연동: 분류 315개, 부산 사하구 장소 2개와 네 상세 API를 저장했다. 첫 실행 14회, 목록 재수집 6회로 총 20회 API 요청을 사용했다.
- 장소는 부산 감천문화마을(contentid 1997221), 낙동강문화관(2554141)이었다. 재수집 결과 inserted=0, updated=0, unchanged=2였고 UUID·설명·상세 원본이 유지됐다.
- 실제 검증은 지역 목록·분류/지역 코드·두 관광지 상세에 한정된다. 행사·숙박 등 모든 타입의 실제 응답, 전국 전체 수집, 운영 서버 배포·자동 스케줄, 웹 조회 API 구현은 포함하지 않는다.

출처 컬럼 추가 후에도 6요청으로 실제 목록 2건을 재수집해 source_url의 실제 쿼리 저장·인증키 제거와 source_type=API를 확인했다. 전체 실연동 테스트는 총 26요청이었다. [변경 기록](../../../DataBase/place_source_metadata_applied_2026-10-22.md)을 참고한다.

실제 API 테스트의 인증키는 프로세스 표준입력으로만 전달했고 파일·실행 결과에 저장하지 않았다.

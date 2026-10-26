# ORS DB 캐시와 만료 정리

갱신: 2026-10-26. 배포 대상은 `BackEnd/NestJS`다. [ORS 전용 DDL v3](../../../../DataBase/ors_route_cache_schema_v3.sql)의 `ors_route_cache` 하나를 사용한다. 기존 v2의 ORS 테이블과 호환되므로 이미 생성된 환경은 DDL을 재실행하지 않는다. 스키마 자동 생성·변경은 하지 않는다. 기존 TourAPI 새벽 1시 수집과 독립 기능이다.

## 지도와 경로 데이터

경로 계산은 외부 HeiGIT ORS API만 사용하며 자체 ORS 서버는 운영하지 않는다. 프론트의 Leaflet/OpenStreetMap 배경 타일과 ORS의 원본 데이터 갱신 시점이 다를 수 있고, 미니프로젝트에서는 이 차이를 감안한다. `fetchedAt`/`calculatedAt`은 응답 수집 시각이며 원본 OSM 갱신 시각을 뜻하지 않는다. 자체 ORS 배포 구성은 제거했으며 기존 EC2 컨테이너는 [중지 절차](../../../../Docker/README.md#기존-자체-ors-중지)를 따른다.

## 동작

```text
ORS 경로 조회 요청
  → 요청 조건 정규화·SHA-256
  → DB에서 expires_at > 현재 시각인 캐시 조회
      → 있음: 외부 API 호출 없이 반환
      → 없음/만료: 외부 API 호출 → 응답 검증 → DB 저장 → 반환

서버 시작: 테이블 필수 컬럼 확인·만료 행 정리
매분 0초: ORS 만료 행을 최대 1,000건 삭제
```

| 데이터 | 보관시간 | 저장 대상 |
|---|---|---|
| ORS | 성공 응답 수집 후 24시간 | 요청한 자동차/도보 경로만 |

**재호출은 만료 후 다음 사용자 요청이 들어올 때 수행한다.** 사용하지 않는 경로를 주기적으로 재수집하지 않는다. 서버 시작 때도 제공자 API를 호출하지 않는다. ORS 전국 경로 조합의 사전 수집은 하지 않는다.

만료 시각부터 조회에서는 즉시 제외하고, 실제 삭제는 매분 정리한다. 정리 전 같은 조건을 다시 요청하면 UPSERT로 갱신한다. 정리로 삭제되기 전에는 기존 cache_id를 유지하고, 삭제 후 다시 저장하면 새 UUID를 만든다. cache_id는 영구 여행 경로 ID가 아니다.

## 운영 준비

1. 대상 DB·스키마에서 [ORS DDL v3](../../../../DataBase/ors_route_cache_schema_v3.sql)를 적용한다. 신규 생성 SQL이므로 같은 이름의 테이블이 이미 있으면 기존 구조를 확인해야 한다.
2. 실제 서버가 읽는 환경 파일/환경변수에 키를 설정한다.
3. 새 코드를 빌드하고 서버를 재시작한다. Docker Compose는 기존 backend 서비스 설정을 사용한다.

```env
ORS_API_KEY=발급받은_ORS키
ORS_API_TIMEOUT_MS=15000
```

기존에 사용한 `ORS_API_key`도 호환한다. 표준 대문자 변수가 있으면 우선하며, 잘못된 표준 값을 다른 변수로 조용히 대체하지 않는다. 키의 바깥 따옴표와 공백은 정리한다. 실제 키는 소스·문서·응답·로그에 넣지 않는다.

**활성화 플래그는 없다.** 기존 TourBatchModule이 초기화한 Nest 스케줄러를 공유해 만료 정리가 자동 등록된다. 서버가 꺼지면 정리도 멈추고, 다시 켜면 시작 시 만료 데이터를 정리한다. 한 번에 남은 만료 행이 많으면 다음 분에 이어서 정리한다.

테이블이 없거나 필수 컬럼이 빠지면 기동 로그에 `routing_cache_schema_missing`과 테이블/컬럼을 기록한다. 기존 웹 서버는 유지하지만 해당 캐시 요청은 503을 반환하고 외부 API 요청을 낭비하지 않는다. 검사는 필수 컬럼 이름 기준이며 타입·PK·FK·권한 전체를 검증하는 마이그레이션 도구는 아니다. DB를 보완한 뒤에는 다음 요청/정리 작업에서 다시 DB를 사용한다. 최초 기동 시의 schema_ready 로그가 새로 출력되는 것은 아니다.

키는 실제 캐시 미스 때 검사한다. 키가 없어도 아직 유효한 DB 캐시는 사용할 수 있다. 인증·타임아웃·비정상 응답은 저장하지 않는다.

## ORS 경로 API

```http
POST /api/routes
Content-Type: application/json
```

```json
{
  "mode": "driving",
  "preference": "recommended",
  "points": [
    {"longitude": 128.9459775, "latitude": 35.1044927},
    {"longitude": 128.9680206, "latitude": 35.0463559}
  ]
}
```

mode는 driving/walking, preference는 recommended(기본값)/shortest다. 지점은 2~10개이며 순서를 유지한다. 활성 장소의 `{"placeId":"실제 UUID"}`도 지원한다. 한 지점에서 placeId와 직접 좌표를 섞지 않는다. DB 장소를 쓰면 실제 장소 좌표로 캐시 조건을 만든다. 장소 ID가 달라도 최종 좌표·옵션이 같으면 같은 경로 캐시를 공유한다.

응답에는 mode/preference/points, distanceMeters/durationSeconds, geometry/timeSpans, attribution/warnings와 다음 캐시 정보를 포함한다.

| 필드 | 의미 |
|---|---|
| cacheId | 저장된 캐시 UUID |
| cached | true: DB 캐시 사용, false: 이번 요청 흐름에서 외부 API 호출 후 저장 |
| fetchedAt | 성공 응답을 수집한 UTC ISO 시각 |
| expiresAt | 캐시 만료 UTC ISO 시각 |
| calculatedAt | fetchedAt과 같은 계산 결과 기준 시각 |
| trafficApplied | 항상 false. 실시간 교통상황이 반영되지 않은 예상시간 |

외부 요청은 `POST https://api.heigit.org/openrouteservice/v2/directions/{driving-car|foot-walking}/geojson`이며, 키는 Authorization 헤더로만 전달한다. units=m/instructions=true를 사용한다. [ORS 공식 형식](https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/requests-and-return-types)을 참고한다.

GeoJSON 좌표는 `[경도, 위도]`, 거리 m/시간 초다. 상세 steps의 way_points/duration을 timeSpans의 fromIndex/toIndex/durationSeconds로 가공하고 인덱스 범위·연속성과 전체 시간 합계를 검사한다. 상세가 없거나 잘못된 응답은 저장하지 않는다. 원천 길안내 문장·외부 응답 전체는 저장하지 않는다.

요청 해시는 좌표 전체와 경유 순서·프로필·선호·상세 옵션·계약 버전을 포함한다. 배열 순서는 보존하고 객체 키 순서는 정규화한다. 인증키는 해시/요청 조건/출처 URL에 포함하지 않는다. 자동차/도보나 경유지가 다른 경로를 같은 캐시로 처리하지 않는다.

리눅스 요청 예:

```bash
curl -sS -X POST 'http://127.0.0.1:3001/api/routes' \
  -H 'Content-Type: application/json' \
  -d '{"mode":"driving","points":[{"longitude":128.9459775,"latitude":35.1044927},{"longitude":128.9680206,"latitude":35.0463559}]}'
```

첫 요청은 cached=false, 같은 요청을 유효기간 안에 반복하면 cached=true다. 좌표는 형식/호출 예시이며 이번 변경에서 해당 실제 제공자 호출은 하지 않았다.

## ITS 제외와 저장·실패 처리

2026-10-26부터 현재 서비스는 ORS만 등록한다. `GET /api/traffic`는 Nest의 기본 404를 반환한다. ITS 인증키가 없어도 기동하며 ITS 제공자·저장소를 생성하지 않는다. 기동 필수 컬럼 검사와 매분 만료 정리는 `ors_route_cache`만 사용한다. 별도 활성화/비활성화 플래그는 없다.

`its.provider.ts`와 ITS 저장소 SQL·전용 타입·입력 검증·설정 분기를 소스에서 삭제했다. ITS에서만 사용하던 트랜잭션 래퍼와 구간별 건수 집계도 제거했다. ORS 경로 조회·24시간 캐시·매분 정리만 남긴다. ITS 테이블·기존 데이터는 삭제하거나 변경하지 않으며 기존 ITS 캐시의 자동 정리도 중단한다. 과거 통합 DDL과 설계 설명은 이전 기록으로 보존한다.

- ORS는 한 행을 원자적으로 UPSERT한다. DB 저장 실패는 성공으로 반환하지 않는다.
- 만료 후 제공자 호출이 실패하면 오류를 반환하며 만료 데이터를 최신 결과처럼 제공하지 않는다.
- 같은 프로세스의 동일 조건 동시 요청은 한 처리로 합친다. 다중 서버의 외부 호출을 정확히 한 번으로 보장하지는 않는다.
- 만료 정리는 SKIP LOCKED로 처리 중인 행을 피하고 ORS 만료 행을 최대 1,000개 삭제한다. TTL 판정과 물리 삭제 주기는 별개다.

## 로그

```bash
docker logs --timestamps travel-backend 2>&1 | grep 'routing_cache_'
docker logs -f --tail 100 travel-backend
```

| event | 의미 |
|---|---|
| routing_cache_cleanup_scheduled | 매분 정리 설정, 실제 수집 성공과 다름 |
| routing_cache_schema_missing | 시작 시 필수 테이블/컬럼 누락 |
| routing_cache_schema_check_failed | 시작 시 DB 구조 조회 실패 |
| routing_cache_schema_ready | 시작 시 필수 컬럼 확인 완료 |
| routing_cache_hit | 유효 캐시 재사용 |
| routing_cache_refresh_started | 캐시 미스 후 외부 조회 시작 |
| routing_cache_stored | 저장 완료. provider/cacheId/itemCount/fetchedAt/expiresAt 포함 |
| routing_cache_request_failed | read/fetch/save 실패 단계와 정제한 코드 |
| routing_cache_cleanup_completed | ORS 삭제 수 orsDeleted, 소요시간 (ITS 삭제 집계는 더 이상 없음) |
| routing_cache_cleanup_failed | 자동 정리 실패 코드 |

ORS itemCount는 경로 1건이다. 실제 키/요청 URL/좌표/원본 오류 본문을 로그에 넣지 않는다. 로그는 기존 Nest 표준 출력·Docker/PM2 로그에 남기며 별도 로그 DB 테이블은 추가하지 않는다. 이번 구조 진단은 ORS 캐시에 대한 것이며 TourAPI 기동 시 테이블 검사를 새로 추가한 것은 아니다.

대표 오류는 400 INVALID_REQUEST, 404 PLACE_NOT_FOUND, 422 PLACE_COORDINATES_MISSING/ROUTE_NOT_FOUND/POINT_NOT_ROUTABLE, 502 PROVIDER_AUTH_ERROR/PROVIDER_RESPONSE_INVALID, 503 CACHE_SCHEMA_REQUIRED/CACHE_DATABASE_ERROR/CACHE_DATA_INVALID/PROVIDER_QUOTA_EXCEEDED/PROVIDER_UNAVAILABLE, 504 PROVIDER_TIMEOUT이다.

### DB 오류 구분

`CACHE_DATABASE_ERROR`만으로 권한 부족을 확정할 수 없다. DB 실패 로그에는 `dbCode`(PostgreSQL SQLSTATE 또는 허용된 연결 오류 코드), `dbOperation`(query/schema_check/cleanup), `dbReason`을 추가한다. TypeORM의 driverError/cause에 감싸진 코드도 확인한다. 원본 오류 메시지·SQL·파라미터·접속 정보는 출력하지 않으며 HTTP 오류 응답에는 진단 필드를 추가하지 않는다. 코드를 찾을 수 없으면 UNKNOWN이다.

| dbCode | 확인할 사항 |
|---|---|
| 42501 | 실제 서비스 DB 계정의 스키마 사용·테이블 작업 권한 및 행 보안 정책 |
| 42P01 / 42703 | 서비스가 접속한 DB·스키마에 ORS 캐시 구조가 적용됐는지 |
| 42883 / 42804 / 22P02 | 컬럼 타입·연산자·입력 형식이 DDL과 일치하는지 |
| 28P01 / 28000 | DB 계정 인증 설정 |
| 57014 | 쿼리 제한시간·실행 지연 |
| ECONNREFUSED / ETIMEDOUT 등 | 접속 경로·포트·서버 상태·TLS 설정 |

서버에서 아래 조회를 비교하면 내부 백엔드와 외부 프록시의 응답을 구분할 수 있다. `/api/health/db`는 SELECT 1 검사이므로 성공하더라도 캐시 테이블 권한을 보장하지 않는다. 초기 수집 URL은 GET도 실제 수집을 실행하므로 연결 진단에는 사용하지 않는다.

```bash
curl -i --max-time 10 http://127.0.0.1:3001/api/health/db
curl -i --max-time 10 https://roadfriendtrip.freeddns.org/api/health/db
```

외부에서만 HTML Unauthorized가 나오면 외부 인증·프록시·DNS 연결 대상을 확인한다. 내부 요청의 DB 오류와는 별도로 진단한다. `.env` 파일에 접속 정보가 있다는 사실만으로 실행 중인 컨테이너의 접속 대상과 테이블 권한을 판단하지 않는다. 다음 SQL은 **백엔드와 같은 DB·계정**으로 실행하는 읽기 전용 확인이다. NULL인 테이블은 현재 search_path에서 찾지 못한 것이다.

```sql
WITH targets AS (
  SELECT name, to_regclass(name) AS relation
  FROM (VALUES ('ors_route_cache')) AS t(name)
)
SELECT current_database() AS database_name, current_user AS role_name,
       current_schema() AS schema_name, name AS table_name,
       relation IS NOT NULL AS table_found,
       has_table_privilege(current_user, relation, 'SELECT') AS can_select,
       has_table_privilege(current_user, relation, 'INSERT') AS can_insert,
       has_table_privilege(current_user, relation, 'UPDATE') AS can_update,
       has_table_privilege(current_user, relation, 'DELETE') AS can_delete
FROM targets;
```

권한 조회는 행 보안 정책·모든 컬럼 타입의 정상 동작을 검증하지 않는다. 권한 변경은 실제 실패 코드와 서비스 계정을 확인한 뒤 테이블 소유자/관리자가 필요한 범위에 적용한다. 앱은 권한을 자동 변경하지 않는다.

## 책임 분리

[ORS·장소 수집 유지보수 안내](../../docs/ORS_PLACE_MAINTENANCE.md)에 SOLID 근거·포트 계약·변경 위치를 정리했다.

| 파일 | 책임 |
|---|---|
| routing.ports / routing.types | 소비자별 동작 계약 / 요청·응답 데이터 |
| routing.validation / routing.errors | HTTP 입력 검증 / 정제 오류 |
| routing.service / routing.controller | PointResolver·RouteLookup을 이용한 경로 응답 구성 / HTTP 전달 |
| place-coordinate.repository / route-point.resolver | 활성 장소 SQL / 좌표 해석·순서·오류 규칙 |
| provider-http / ors.provider | 인증·고정 주소 HTTP·응답 수신 |
| ors-response.mapper | GeoJSON·구간 시간 변환과 검증; DB 캐시 검증에서도 재사용 |
| cache-coordinator | 요청 해시·TTL 흐름·동일 요청 합치기·처리 로그 |
| cache-database | DB 드라이버 호출·오류 코드 정제 |
| cache-repositories | ORS 조회·UPSERT SQL |
| ors-cache-maintenance.repository / cache-maintenance | 필수 컬럼·만료 삭제 SQL / 기동 진단·스케줄 실행 |
| routing.policy / routing-cache.module | 현재 TTL·정리 정책 / 실제 어댑터 조립 |

업무 서비스는 구체 TypeORM·HTTP·캐시 클래스 대신 좁은 포트에 의존한다. 데이터 계약이 같은 구현은 조립부에서 교체할 수 있다. 클래스 생성과 구체 구현 선택은 Nest provider factory에 모으고, 업무 서비스에서 새 어댑터를 생성하지 않는다.

## 2026-10-26 SOLID 리팩터링 검증

기존 npm test 17개와 저장소 밖 ORS/진단 32개·배치 17개·SOLID 계약 13개, 총 79개가 통과했다. 메모리/SQL 좌표 읽기 치환, 최소 포트만 가진 경로 서비스·유지관리 대역, 타입 계약, 기존 HTTP 응답/TTL/정리/404를 확인했다. 제공자 응답은 모킹했고 SQL은 임시 PGlite에서 실행했다. 신규 계약 검증은 배포 커밋 대상에 넣지 않는다. 외부 API·원격 DB·실제 배포 검증은 아니다.

## 현재 ORS 전용 검증 기록 — 2026-10-26

Node 22.23.3에서 기존 npm test 17개(Node 9/Jest 8), 저장소 밖 ORS 회귀 19개·독립 실행/DDL/HTTP 검증 7개·DB 진단 6개, 총 49개와 운영 빌드가 통과했다. ORS 전용 검증에는 ITS 키/테이블 없는 전체 Nest 기동·자동 스케줄 등록·자동차/도보 HTTP 조회·캐시 재사용·24시간 만료 재조회·최대 1,000행 정리·미등록 traffic 경로 404·기존 ITS 데이터 미변경·런타임 ITS 제공자/저장소 미로딩을 포함한다. 신규 DDL의 ORS 18컬럼·제약조건·인덱스는 기존 v2와 동일함을 비교했다.

제공자 응답은 모킹했고 SQL은 격리 PGlite에서 검증했다. 실제 외부 API나 원격 DB·AWS 배포를 이번 수정의 검증 수단으로 호출하지 않았다. 검증 스크립트는 기존 사용자 결정에 따라 저장소 밖에 보관하며 배포 커밋에 포함하지 않는다. 현재 저장소의 npm test는 기존 17개를 실행한다. 이전 ITS API가 성공한다고 기대하는 통합 테스트와 통합 정리 테스트는 현재 명세에서 제외하고 ORS 독립 실행·404·기존 데이터 보존 검사로 대체했다.

## 이전 통합 구현 검증 기록 (ITS 제외 전)

Node 22.23.3에서 저장소 밖 캐시 검증 29개와 기존 npm test 14개(Node 6/Jest 8), production 빌드가 통과했다. 신규 검증은 실제 저장 SQL/TTL·만료 재조회·프로세스 재생성 후 캐시 재사용·동시 요청 합치기·ITS 빈 결과/교체 롤백·스키마 누락 시 API 호출 방지·잘못된 캐시 JSON 거부·1,001건 중 제한 삭제·자식 연쇄 삭제·실제 Nest HTTP/기존 TourAPI와 새 Cron 동시 등록을 포함한다.

SQL은 격리 PGlite, 제공자 API는 전송 대역으로 검증했다. 로컬 HTTP는 루프백 허용 환경에서 검사했다. 검증 스크립트는 사용자 결정에 따라 저장소 밖에 보관하며 배포 코드/커밋에 넣지 않는다. 클린 체크아웃의 npm test는 신규 검증 29개를 실행하지 않는다. 이번 변경에서 실제 ORS/ITS 요청, 원격 DB DDL/쓰기, AWS 배포는 수행하지 않았다. 기존 AI 응답 검증·가격/폴백·회원 ID 선언 차이 등의 별도 문제를 해결한 것으로 표시하지 않는다.

예상시간을 표시하는 클라이언트는 trafficApplied=false를 확인하고 ‘실시간 교통상황이 반영되지 않은 예상시간’을 안내한다. 이번 작업에서는 프론트의 경로/일정 화면이나 추천 로직을 새로 구현하지 않는다.

## 코드 읽는 순서와 주석

[처음 읽는 팀원용 안내](../../docs/PLACE_ROUTING_CODE_GUIDE.md)에서 HTTP 요청부터 좌표 해석·캐시·ORS·만료 삭제까지 따라 읽을 수 있다. 모든 함수·콜백·인터페이스 메서드에 입력/출력/예시를 설명하고 자료형에는 좌표 순서, m/초 단위, UTC 시각과 캐시 상태를 적었다.

## 추가 검증

현재 ORS 요청은 instructions=true이므로 캐시 응답도 비어 있지 않은 timeSpans가 필요하다. 빈 구간 배열은 정상 캐시로 반환하지 않는다. [심화 검증 보고서](../../docs/PLACE_ROUTING_TEST_REPORT_2026-10-26.md)에 동시 요청 100개, 정확한 만료 경계, 실제 HTTP 본문 타임아웃, 실패 후 재시도와 기존 회귀 결과를 기록했다.

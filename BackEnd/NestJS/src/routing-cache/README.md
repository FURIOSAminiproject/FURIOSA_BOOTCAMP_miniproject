# ITS·ORS DB 캐시와 만료 정리

구현: 2026-10-23. 배포 대상은 `BackEnd/NestJS`다. [캐시 DDL v2](../../../../DataBase/routing_cache_schema_v2.sql)의 3개 테이블을 사용한다. 스키마 자동 생성·변경은 하지 않는다. 기존 TourAPI 새벽 1시 수집과 독립 기능이다.

## 동작

```text
경로/교통 조회 요청
  → 요청 조건 정규화·SHA-256
  → DB에서 expires_at > 현재 시각인 캐시 조회
      → 있음: 외부 API 호출 없이 반환
      → 없음/만료: 외부 API 호출 → 응답 검증 → DB 저장 → 반환

서버 시작: 테이블 필수 컬럼 확인·만료 행 정리
매분 0초: 만료 행을 테이블별 최대 1,000건 삭제
```

| 데이터 | 보관시간 | 저장 대상 |
|---|---|---|
| ORS | 성공 응답 수집 후 24시간 | 요청한 자동차/도보 경로만 |
| ITS | 성공 응답 수집 후 5분 | 요청한 영역의 조회 결과와 도로 구간만 |

**재호출은 만료 후 다음 사용자 요청이 들어올 때 수행한다.** 사용하지 않는 경로·영역을 주기적으로 재수집하지 않는다. 서버 시작 때도 제공자 API를 호출하지 않는다. ORS 전국 경로 조합의 사전 수집은 하지 않는다.

만료 시각부터 조회에서는 즉시 제외하고, 실제 삭제는 매분 정리한다. 정리 전 같은 조건을 다시 요청하면 UPSERT로 갱신한다. 정리로 삭제되기 전에는 기존 cache_id를 유지하고, 삭제 후 다시 저장하면 새 UUID를 만든다. cache_id는 영구 여행 경로 ID가 아니다.

## 운영 준비

1. 대상 DB·스키마에서 [DDL v2](../../../../DataBase/routing_cache_schema_v2.sql)를 적용한다. 신규 생성 SQL이므로 같은 이름의 테이블이 이미 있으면 기존 구조를 확인해야 한다.
2. 실제 서버가 읽는 환경 파일/환경변수에 키를 설정한다.
3. 새 코드를 빌드하고 서버를 재시작한다. Docker Compose는 기존 backend 서비스 설정을 사용한다.

```env
ORS_API_KEY=발급받은_ORS키
ORS_API_TIMEOUT_MS=15000
ITS_API_KEY=발급받은_ITS키
ITS_API_TIMEOUT_MS=10000
```

기존에 사용한 `ORS_API_key`, `ITS_API_key`도 호환한다. 표준 대문자 변수가 있으면 우선하며, 잘못된 표준 값을 다른 변수로 조용히 대체하지 않는다. 키의 바깥 따옴표와 공백은 정리한다. 실제 키는 소스·문서·응답·로그에 넣지 않는다.

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
| trafficApplied | 항상 false. ORS 기본 시간에 ITS 정체를 임의로 합산하지 않음 |

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

## ITS 교통 API

```http
GET /api/traffic?minX=126.97&maxX=127.02&minY=37.55&maxY=37.60
```

국내 영역(경도 124~132, 위도 33~39), min<max, 경도·위도 폭 각각 최대 0.2도를 지원한다. 이 상한은 현재 서비스 정책이다. type/drcType은 all(기본)만 지원하며 다른 필터·알 수 없는 파라미터는 400이다. 더 큰 영역은 호출 한도를 고려해 분할해야 한다.

```bash
curl -sS 'http://127.0.0.1:3001/api/traffic?minX=126.97&maxX=127.02&minY=37.55&maxY=37.60'
```

응답 items[]는 linkId/startNodeId/endNodeId/roadName/roadDirection/linkNo/speed/travelTimeSeconds/observedAt이다. count는 서로 다른 linkId 개수이고 cacheId/cached/fetchedAt/expiresAt도 반환한다.

외부 `GET https://openapi.its.go.kr:9443/trafficInfo`를 조회하고 header.resultCode와 body.totalCount/items를 검증한다. 성공한 빈 결과도 캐시하며 5분 동안 재호출하지 않는다. 같은 조회 안의 동일 링크가 다른 값을 가지면 실패 처리하고, 동일 값 중복은 하나만 저장한다. ID 문자열의 선행 0을 보존한다.

travelTime=0/미확인 값은 NULL, 실제 speed=0은 보존한다. createdDate는 한국 시각으로 해석하며 날짜가 잘못됐으면 observedAt=null이다. fetchedAt과 원천 관측 시각은 다르다. 속도 단위 확인이 남아 응답 speedUnit=null이고 임의 정체 등급을 만들지 않는다.

routeMatchStatus=NOT_MATCHED, trafficApplied=false다. 영역에는 경로 밖 도로·반대 방향이 포함될 수 있다. ITS linkId와 ORS 도로 ID를 직접 조인하지 않으며, 정체 반영 총 시간·미래 출발 예측·정체 회피 경로는 이번 저장/캐시 구현 범위가 아니다.

## 저장·실패·동시 요청

- ORS는 한 행을 원자적으로 UPSERT한다. ITS는 부모 UPSERT → 기존 구간 삭제 → 새 구간 최대 1,000개씩 삽입 → 건수 확인을 한 트랜잭션으로 수행한다.
- ITS는 캐시 ID/링크 ID 복합 PK다. 서로 다른 영역에서 같은 도로가 나와도 각 조회에 저장한다. 정상 빈 결과로 갱신하면 기존 자식도 삭제한다.
- 응답 처리/DB 저장 실패 시 성공 로그나 성공 응답을 만들지 않는다. ITS 교체 실패는 기존 헤더·구간·만료시각으로 롤백한다.
- 만료 후 외부 서비스가 실패하면 오류를 반환한다. 만료 데이터를 최신 결과처럼 반환하지 않는다. 만료되지 않은 다른 캐시는 유지한다.
- 같은 서버 프로세스의 동일 조건 동시 요청은 한 처리 흐름으로 합친다. 이 흐름을 함께 기다린 요청도 cached=false일 수 있다. 여러 서버의 외부 호출까지 정확히 한 번을 보장하는 분산 잠금은 아니다. DB UNIQUE와 트랜잭션은 중복 행/부분 교체를 막는다.
- 만료 정리는 SKIP LOCKED로 처리 중인 행을 피하고 테이블별 최대 1,000개 부모 행을 지운다. ITS 구간은 FK ON DELETE CASCADE로 함께 지운다. 조회의 TTL 판정과 삭제 주기는 별개다.

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
| routing_cache_cleanup_completed | ORS 부모 삭제 수 orsDeleted, ITS 부모 삭제 수 itsDeleted, 소요시간 |
| routing_cache_cleanup_failed | 자동 정리 실패 코드 |

ORS itemCount는 경로 1건, ITS itemCount는 저장한 서로 다른 도로 구간 수다. 실제 키/요청 URL/좌표/원본 오류 본문을 로그에 넣지 않는다. 로그는 기존 Nest 표준 출력·Docker/PM2 로그에 남기며 별도 로그 DB 테이블은 추가하지 않는다. 이번 구조 진단은 ITS·ORS 캐시에 대한 것이며 TourAPI 기동 시 테이블 검사를 새로 추가한 것은 아니다.

대표 오류는 400 INVALID_REQUEST, 404 PLACE_NOT_FOUND, 422 PLACE_COORDINATES_MISSING/ROUTE_NOT_FOUND/POINT_NOT_ROUTABLE, 502 PROVIDER_AUTH_ERROR/PROVIDER_RESPONSE_INVALID, 503 CACHE_SCHEMA_REQUIRED/CACHE_DATABASE_ERROR/CACHE_DATA_INVALID/PROVIDER_QUOTA_EXCEEDED/PROVIDER_UNAVAILABLE, 504 PROVIDER_TIMEOUT이다.

## 책임 분리

| 파일 | 책임 |
|---|---|
| routing.validation/types/errors | API 입력·단위/계약·정제 오류 |
| provider-http / ors.provider / its.provider | 고정 주소 외부 요청·시간 제한·원천 응답 검증 |
| cache-coordinator | 요청 해시·TTL 흐름·동일 요청 합치기·처리 로그 |
| cache-database | DB 실행·트랜잭션·필수 컬럼 검사·제한 삭제 |
| cache-repositories | ORS/ITS별 컬럼 매핑·SQL 저장·일관된 캐시 읽기 |
| cache-maintenance | 기동 진단·자동 만료 정리 |
| routing.service/controller/module | 장소 좌표 해석·HTTP 응답·의존성 조립 |

업무 흐름은 CacheStore/DataProvider 포트에 의존하고 저장/조회 구현과 분리한다. 새 제공자는 해당 포트와 모듈 조립을 추가해 붙일 수 있다. 수집 API를 DB 트랜잭션 안에서 호출하지 않는다.

## 검증 기록

Node 22.23.3에서 저장소 밖 캐시 검증 29개와 기존 npm test 14개(Node 6/Jest 8), production 빌드가 통과했다. 신규 검증은 실제 저장 SQL/TTL·만료 재조회·프로세스 재생성 후 캐시 재사용·동시 요청 합치기·ITS 빈 결과/교체 롤백·스키마 누락 시 API 호출 방지·잘못된 캐시 JSON 거부·1,001건 중 제한 삭제·자식 연쇄 삭제·실제 Nest HTTP/기존 TourAPI와 새 Cron 동시 등록을 포함한다.

SQL은 격리 PGlite, 제공자 API는 전송 대역으로 검증했다. 로컬 HTTP는 루프백 허용 환경에서 검사했다. 검증 스크립트는 사용자 결정에 따라 저장소 밖에 보관하며 배포 코드/커밋에 넣지 않는다. 클린 체크아웃의 npm test는 신규 검증 29개를 실행하지 않는다. 이번 변경에서 실제 ORS/ITS 요청, 원격 DB DDL/쓰기, AWS 배포는 수행하지 않았다. 기존 AI 응답 검증·가격/폴백·회원 ID 선언 차이 등의 별도 문제를 해결한 것으로 표시하지 않는다.

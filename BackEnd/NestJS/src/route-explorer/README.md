# 출발·도착지 검색, 경로 비교와 장소 추천

헤더의 **여행 계획하기**(`/trips/new`)에서 조건을 고르고 **내 여행 결과**(`/trips`)에서 비교한다. `/routes`는 두 기능을 한 화면에서 사용하는 호환 주소다. 별도 ORS 서버 없이 기존 서버의 `ORS_API_KEY`를 사용한다. 프론트엔드 번들·쿼리 문자열에 키를 넣지 않는다. 화면의 상위 카테고리는 `place_categories`의 LEVEL1, 상세 분류는 그 아래 LEVEL2·3이며 이름은 모두 `category_name` 원문을 사용한다.

## 처리 흐름

1. 출발·도착지 두 글자 이상 입력 후 600ms 대기 → 기존 검색 API → HeiGIT Pelias 검색 → 자동완성의 이름·주소 중 선택해 좌표 확정.
2. 자동차/도보, 추천 카테고리와 반경 선택 → 서버에 두 지점 전송.
3. 기존 `RoutingService`로 `recommended`와 `shortest`를 각각 조회한다. 기존 24시간 ORS DB 캐시를 공유한다.
4. 각 경로의 실제 좌표를 기준으로 해당 경로 주변의 활성 TourAPI 장소를 DB에서 조회하고 거리순으로 추천한다.
5. 지도에 두 선과 출발·도착점을 표시하고, 선택한 경로의 장소 목록·초록 마커를 표시한다. 장소의 ‘지도에서 보기’로 팝업을 연다.

조건을 변경하거나 조회를 취소하면 이전 결과·추천·팝업을 제거한다. 화면을 벗어난 뒤 도착한 응답은 표시하지 않는다. 두 경로가 같을 수 있으며, 추천 장소를 자동 경유지로 추가하거나 방문 순서를 최적화하지 않는다. 실시간 교통은 반영하지 않는다.

## API 계약

| API | 입력 | 응답 |
|---|---|---|
| `GET /api/map/search?q=서울역` | 검색어 2~100자. 한국으로 검색 범위 제한 | `places`: 검색 ID·이름·주소·위도·경도 |
| `GET /api/routes/categories` | 없음 | `contentTypes`, DB `categories`(ID·이름·단계·부모 ID), `warning` |
| `POST /api/routes/compare` | 아래 JSON | 두 경로와 경로별 추천 장소·오류·후보 한도 정보 |

```json
{
  "mode": "driving",
  "points": [
    {"longitude": 126.9707, "latitude": 37.5547},
    {"longitude": 126.9784, "latitude": 37.5667}
  ],
  "contentTypeIds": [],
  "categoryIds": [],
  "radiusMeters": 1000,
  "limit": 10
}
```

- `mode`: `driving` 또는 `walking`. 지점은 출발/도착 2개로, 직접 좌표 또는 기존 DB `placeId` UUID를 사용한다. 화면에서는 지도 검색 결과의 숫자 좌표만 보낸다.
- `categoryIds`: DB 분류 UUID 최대 200개. 선택한 분류들은 OR 조건이며 하위 분류를 포함한다. 화면에서 LEVEL1 전체를 고르면 그 UUID, 상세를 고르면 해당 LEVEL2·3 UUID들을 보낸다. ‘자연관광 일부 + 음식 전체’는 선택한 자연관광 상세 UUID들과 음식 LEVEL1 UUID를 함께 보낸다. 새 필터 필드·유형별 매핑은 필요하지 않다.
- `contentTypeIds`: 기존 클라이언트의 콘텐츠 유형 필터(12/14/15/28/32/38/39)를 계속 지원한다. 새 여행 화면은 항상 빈 배열로 보내 DB 분류만으로 추천한다. 두 배열이 모두 비면 장소 조회 없이 경로만 비교한다. 위 예시는 카테고리 미선택 상태다.
- 분류 조회 응답의 `contentTypes`는 이전 클라이언트 호환용 메타데이터이며 새 화면에서 상위 카테고리로 사용하지 않는다. `categories`의 `level`·`parentId`로 대·중·소 계층을 구성하고 DB 조회 실패 시 임의 상위 목록으로 대체하지 않는다.
- `radiusMeters`: 기본 1,000, 허용 100~5,000m. `limit`: 경로별 기본 10개, 허용 1~20개.
- `routes[]`: `preference`, 기존 [경로 응답](../routing-cache/README.md)의 `route`, `places`, `routeError`, `recommendationError`, `candidateLimitReached`.
- 장소는 ID·이름·주소·좌표·유형·분류명과 `distanceToRouteMeters`를 포함한다. PostGIS `geography`로 계산한 경로 선까지의 **최단 측지거리(m)**이며, 실제 진입로·도보 접근 가능 여부·우회거리·우회시간을 계산한 결과가 아니다.
- 권장/최단 중 한쪽이 실패하면 다른 경로를 표시하고 실패 이유를 구분한다. 양쪽 모두 실패하면 HTTP 오류다. 추천 DB 조회만 실패하면 정상 경로는 보존하고 추천 오류를 표시한다.
- DB 상세 분류를 못 읽으면 기본 카테고리는 제공하고 `warning`으로 알린다. 장소 테이블이 없거나 권한이 없으면 추천 오류가 표시된다. 수집 장소가 없을 때 임의 장소를 만들어 추천하지 않는다.

## 운영과 자원

기존 `places`, `place_categories`, `ors_route_cache` 테이블을 재사용한다. 장소 검색에는 PostGIS 확장과 `places.location geography(Point,4326)`, GiST 인덱스가 필요하다. 새 테이블·DDL 자동 실행·추가 컨테이너는 없다. 관리자 수동 적용 SQL은 [PostGIS 마이그레이션](../../../../DataBase/migrations/20261029_add_places_postgis.sql)이다. 개발 DB에는 사용자 실행 로그로 적용을 확인했으며 운영 DB는 적용 여부를 별도로 확인해야 한다. 신규 DB 준비는 [장소 DDL](../../../../DataBase/place_schema_v2.sql)과 [ORS 캐시 안내](../routing-cache/README.md)를 따르며 기존 테이블이 있으면 생성 SQL을 재실행하지 않는다.

경로 조회는 ORS 좌표 전체를 GeoJSON LineString으로 전달하고, 거점 조회는 경도·위도로 Point를 만든다. `ST_DWithin`으로 미터 반경 안의 활성 장소를 필터링하고 `ST_Distance`와 장소 ID로 정렬한 다음 LIMIT을 적용한다. 분류 재귀 조회와 콘텐츠 유형 필터는 유지한다. 경로 후보는 거리순 최대 2,000개이며 초과하면 `candidateLimitReached=true`다. 거점·시간대·도착지 일정도 같은 PostGIS 거점 조회를 사용한다. `location`은 기존 위도·경도에서 자동 생성되므로 수집 INSERT/UPDATE를 수정할 필요가 없다. 좌표 없는 장소는 제외한다. PostGIS 설정이나 권한 오류 시 기존 수식으로 조용히 대체하지 않고 추천 오류를 반환하며 정상 경로는 보존한다. GiST 인덱스 활용 여부는 데이터 규모와 실행 계획에 따라 달라진다.

프론트는 기존 검색 API를 입력 후 600ms 대기하는 자동완성으로 사용한다. 한글 조합 중에는 요청하지 않으며 새 입력/화면 이탈 시 이전 응답을 폐기한다. 서버는 동일 검색을 1시간/최대 200개 메모리 캐시하고 진행 중인 같은 요청을 합친다. 동시 검색은 프로세스당 8개로 제한한다. 이 캐시는 재시작하면 사라지며 ORS 경로의 DB 캐시와 별개다. 서비스 전체의 분산 호출 한도를 보장하지 않으며, 외부 API의 한도 초과는 오류로 처리한다.

출발·도착지 선택 및 이동 방식 변경 시 요약 카드가 기존 `POST /api/routes`의 `recommended` 예상시간·거리를 미리 조회한다. 카테고리·반경 변경에는 미리보기 요청을 추가하지 않으며, 실제 장소 추천과 두 경로 비교는 조회 버튼의 기존 `POST /api/routes/compare`에서 수행한다. 이번 UI 변경에는 서버 코드·API 계약 변경이 없다.

실제 조회 주소는 `https://api.heigit.org/pelias/v1/search`와 기존 ORS Directions HTTPS 엔드포인트다. 키는 Authorization 헤더로만 전달한다. 서버의 허용된 외부 통신에 `api.heigit.org:443`이 필요하다. 기본 제공자 타임아웃은 기존 `ORS_API_TIMEOUT_MS`를 공유한다.

## 상용 이용·출처

ORS 운영진은 [Standard 플랜의 상용 이용을 허용](https://ask.openrouteservice.org/t/free-plan-in-an-app-with-a-paid-tier-license-cc-by-sa-4-0-personal-data-and-attribution-questions/8079)한다고 안내하며, 결과물의 CC BY-SA 4.0 조건과 API 이용 조건은 준수해야 한다. ‘상용 허용’을 ‘무제한 호출·무조건 무표기·모든 권리 면제’로 해석하지 않는다. [HeiGIT 이용 조건](https://account.heigit.org/info/tos), [공식 Geocoder 문서](https://giscience.github.io/openrouteservice/api-reference/endpoints/geocoder/), [API 주소 이전 안내](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912)를 기준으로 한다.

화면에 ORS/HeiGIT, OpenStreetMap, 한국관광공사 출처를 표시하고 결과 라이선스와 검색 데이터 출처·이용 조건을 연결했다. 지도 타일의 기존 OSM 표기도 유지한다. Nominatim 공용 서버를 사용하지 않는다. 기존 Leaflet은 추가 라이브러리 없이 그대로 사용한다.

## 검증 (2026-10-26)

- Node 22.23.3에서 NestJS 컴파일, Node 테스트 18개와 Jest 8개(합계 26개), 프론트 타입 검사·production 번들 빌드 통과.
- 새 테스트 9개는 입력 경계, Pelias 서버 인증/한국 검색/캐시/동시 요청 합치기/실패, 선분 중간과 꺾인 경로의 거리, 경로별 추천 차이, 부분 실패, SQL 파라미터와 후보 한도, 로컬 HTTP 계약을 확인한다. DB·외부 제공자는 모킹한다.
- 기존 로컬 키로 **실제 Pelias ‘서울역’ 검색 1회(8개 결과)**와 **자동차 권장·최단 Directions 각 1회(51/54개 좌표)** 성공. 키·원본 응답은 로그에 남기지 않고 DB 쓰기 없이 제공자만 직접 검사했다.
- 브라우저에서는 격리된 NestJS 테스트 API와 실제 프론트 화면으로 검색/선택, 두 선 표시, 경로 전환, 추천 팝업, 카테고리 필터, 출발/도착 교환, 검색어 수정에 따른 이전 결과 제거와 검색 결과 없음을 확인했다. 이 화면 검증 데이터는 실제 운영 DB 조회 결과가 아니다.
- 미검증: 운영 PostgreSQL에서 새 장소 조회 SQL 실행, 실제 TourAPI 장소 추천을 포함한 EC2 종단간 호출·배포, 실제 휴대폰 화면. Vite의 기존 설정/청크 크기 경고는 빌드를 막지 않았다.

두 여행 화면의 커스터마이징에서는 이 API 계약과 백엔드 코드를 변경하지 않았다. 가짜 일정 대신 빈 초기 상태, 입력/결과 공유, 조건 변경 시 결과 폐기, 조회 취소·오류 안내를 추가했다. 실제 외부 검색 결과와 자동차/도보 권장·최단 응답을 기록한 뒤 격리된 테스트 API에서 재생해 화면을 확인했으며, 추천 장소는 명시적으로 표시한 검증용 데이터다. 운영 DB의 실제 TourAPI 추천과 배포 검증은 여전히 별도다. [화면 분석·검증 기록](../../../../FrontEnd/docs/TRIP_UI_CUSTOMIZATION.md)을 참고한다.

구현 위치: `GeocodingProvider`(검색), `ExplorerRepository`(장소/분류 읽기), `ExplorerService`(조립), `ExplorerController`(HTTP), `ExplorerModule`(의존성 연결). 프론트는 `services/route-explorer.ts`(HTTP/검증), `services/trip-workspace.ts`·`TripWorkspaceContext.tsx`(공유 상태), `RouteExplorerPage.tsx`(조건), `TripResultsPage.tsx`(결과), `MapPlaceSearch.tsx`(검색), `RouteExplorerMap.tsx`(지도)다. 기존 일정 지도 소스는 유지하지만 새 주요 여행 화면에서는 사용하지 않는다.

## PostGIS 변경 검증 (2026-10-29)

Node 22.23.3에서 Node 테스트 60개와 Jest 8개, 총 68개를 통과했다. 이 결과는 DB를 모킹한 SQL·반경·정렬·후보 제한·오류 계약 검사이며 실제 PostGIS 엔진의 공간 계산 성공을 의미하지 않는다. `RouteProximity`는 기존 독립 테스트용으로 남아 있으나 운영 추천 경로에서 호출하지 않는다.

실제 DB 읽기 전용 검증은 이 폴더에서 `npm run build` 후 `npm run db:check:postgis -- production`로 실행한다. `.env.production`의 기존 환경 로더를 공유하며 확장·생성 컬럼·인덱스와 실제 거점/경로/분류 SQL을 READ ONLY 트랜잭션으로 확인한다. 좌표가 있는 활성 장소가 최소 1개 필요하다. 사용자 지시에 따라 운영 DB에만 반영한다. 수동 마이그레이션은 travel_prod 외 DB에서 오류를 내며 종료한다. 이번 PC에서는 운영 DB 접속이 타임아웃이어서 실제 SQL 검증과 EC2 배포는 완료하지 못했다.

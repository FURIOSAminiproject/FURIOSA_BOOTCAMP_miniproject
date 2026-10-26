# 모바일 웹 현재 위치와 자동차·도보 길찾기

작성 기준: 2026-10-26. 실제 배포 앱은 `FrontEnd/v1`, 경로 서버는 `BackEnd/NestJS`다.

휴대폰 웹 브라우저에서 사용자가 위치 사용을 허용하면 위도·경도를 한 번 조회하고, 그 위치에서 일정 속 방문지까지 자동차 또는 도보 경로를 표시한다. 브라우저의 위치 조회 API와 기존 서버의 `POST /api/routes`를 연결했다. 별도의 위치 수집 서버 엔드포인트나 DB 테이블은 추가하지 않았다.

## 1. 화면 사용 방법

1. 여행 일정 상세 화면의 지도로 이동한다.
2. **현재 위치에서 길찾기** 영역에서 일정 속 목적지와 이동 방식(자동차/도보)을 선택한다.
3. **현재 위치 확인**을 누른다. 브라우저가 권한 창을 표시하면 위치 사용을 허용한다. 이미 허용·차단된 사이트에서는 권한 창이 다시 나타나지 않을 수 있다.
4. 위도·경도·브라우저 보고 정확도(m)·측정 시각이 표시되는지 확인한다. 이 단계에서는 경로 서버에 좌표를 보내지 않는다.
5. **확인한 위치에서 길찾기**를 누른다. 이때 출발지와 목적지 좌표를 서버로 보내 경로를 조회한다.
6. 거리, 예상시간, 경로 데이터 기준 시각, 출처, 제공자 경고를 확인한다. 지도에는 실제 경로가 파란 실선으로 표시된다.

위치를 다시 확인하거나 목적지·이동 방식을 바꾸면 이전 경로를 지운다. 목적지·이동 방식 변경은 확인한 출발 위치를 유지하며, 새 길찾기는 버튼으로 실행한다. 일차 필터나 계획이 바뀌면 위치 패널도 초기화한다. 계획 ID 변경은 `TravelPlanDetail`의 지도 `key`로 구분한다.

**조회 취소**는 화면의 대기를 중단하고 뒤늦은 결과를 무시한다. **화면에서 위치 지우기**는 이 화면의 위치와 경로를 지운다. 서버에 이미 저장된 ORS 캐시까지 삭제하는 버튼은 아니다.

실시간 위치 추적·이동 중 자동 재탐색·음성 안내·버스/택시 경로·교통비 계산은 구현 범위에 포함하지 않는다. 이동한 뒤에는 현재 위치를 다시 확인해야 한다. ITS가 제거된 현재 서비스에서는 실시간 교통 체증을 예상시간에 반영하지 않는다.

## 2. 전체 호출 흐름

```text
사용자: 현재 위치 확인
  → getCurrentLocation()
  → navigator.geolocation.getCurrentPosition()
  → 브라우저/운영체제 권한 확인과 위치 측정
  → 좌표·정확도·시각 검증
  → React 메모리와 화면에 표시

사용자: 확인한 위치에서 길찾기
  → routeFromCurrentLocation(origin, destination, mode)
  → requestLocationRoute()
  → 같은 출처 POST /api/routes
  → NestJS 입력 검사 → ORS 유효 캐시 확인
      → 유효 캐시 있음: 재사용
      → 없음/만료: ORS 호출 → 검증 → 기존 DB 캐시에 저장
  → 브라우저에서도 응답 형식 검증
  → Leaflet 파란 실선 + 거리/시간 표시
```

서버는 휴대폰의 GPS 권한 창을 직접 열 수 없다. 위치 권한과 측정은 브라우저가 담당하고 서버는 사용자가 전송한 좌표로 경로를 계산한다. 따라서 `GET /api/location` 같은 서버 주소만 호출해 휴대폰 위치를 알아내는 기능은 만들지 않았다.

## 3. 파일별 책임

| 파일 | 책임 |
|---|---|
| [`../../types/location.ts`](../../types/location.ts) | 좌표·측정값·경로 요청/응답·취소 신호의 공통 형식 |
| [`geolocation.ts`](geolocation.ts) | 브라우저 지원/보안 환경 확인, 단발성 위치 요청, 좌표 검증, 권한/시간 초과/취소 오류 변환 |
| [`route-client.ts`](route-client.ts) | 서버 입력 검사, 동일 출처 HTTP 요청, 30초 제한, 취소, 외부 JSON 런타임 검증 |
| [`../../components/CurrentLocationRoutePanel.tsx`](../../components/CurrentLocationRoutePanel.tsx) | 목적지·이동 방식 선택, 위치와 경로 조회 상태, 사용자 안내, 이전 요청 결과 차단 |
| [`../../components/TravelMapView.tsx`](../../components/TravelMapView.tsx) | 일차별 목적지 제공, 실제 경로와 출발 마커 추가/정리, 지도 좌표 순서 변환 |
| [`../../components/TravelPlanDetail.tsx`](../../components/TravelPlanDetail.tsx) | 계획 ID 전환 시 지도와 위치 상태 재생성 |

위치 측정·HTTP 전송·화면·지도 처리를 분리했다. 화면은 `locate`와 `findRoute`를 주입받을 수 있어 실제 휴대폰이나 ORS 없이 실패/취소를 검증할 수 있다. 제공자 교체는 서버 경로 API 계약을 유지하면 브라우저 위치 코드에 영향을 주지 않는다.

새 함수의 위쪽 주석에 입력·출력·예시를, 상태·타이머·취소 제어기·좌표 배열 등에는 변수의 의미와 단위를 적었다. 작성자 이름은 주석에 넣지 않으며 변경 이력은 Git으로 확인한다.

## 4. 브라우저 위치 API

### `getCurrentLocation(options?, environment?)`

```ts
getCurrentLocation(
  options?: { signal?: AbortSignal },
  environment?: LocationEnvironment,
): Promise<CurrentLocation>
```

| 입력 | 의미 | 기본값 |
|---|---|---|
| `options.signal` | 화면 이탈/취소에 사용하는 신호 | 없음 |
| `environment.secureContext` | HTTPS 또는 신뢰할 수 있는 로컬 실행 환경인지 | `window.isSecureContext` |
| `environment.geolocation` | `getCurrentPosition`을 가진 브라우저 객체. 검증 시 대역 주입 가능 | `navigator.geolocation` |

반환 예시:

```json
{
  "latitude": 35.1044927,
  "longitude": 128.9459775,
  "accuracyMeters": 12,
  "capturedAt": "2026-10-26T02:00:00.000Z"
}
```

| 출력 | 형식/단위 | 의미 |
|---|---|---|
| `latitude` | number, -90~90 | 위도. 숫자 문자열은 거절 |
| `longitude` | number, -180~180 | 경도. 숫자 문자열은 거절 |
| `accuracyMeters` | number, 0 이상, m | 브라우저가 보고한 수평 위치 정확도 |
| `capturedAt` | UTC ISO 문자열 | 브라우저 위치 결과의 측정 시각. 경로 수집 시각과 다름 |

사용 예시:

```ts
import { getCurrentLocation, CurrentLocationError } from './geolocation';

const controller = new AbortController(); // 화면에서 취소할 조회의 제어기

try {
  const location = await getCurrentLocation({ signal: controller.signal });
  // location.latitude, location.longitude를 출발 좌표로 사용한다.
} catch (error) {
  if (error instanceof CurrentLocationError) {
    // error.code로 분기하고 error.message를 사용자에게 표시한다.
  }
}

// 사용자가 취소하거나 화면이 사라질 때 실행한다.
controller.abort();
```

위치 설정은 `enableHighAccuracy: true`, `timeout: 10000`, `maximumAge: 0`이다. 고정밀 측정을 요청하고 브라우저의 이전 측정값을 재사용하지 않도록 요청한다. 고정밀 옵션이 GPS 사용이나 일정 오차를 보장하는 것은 아니다. 장치와 환경에 따라 GPS·Wi-Fi·이동통신 등의 정보를 사용할 수 있다.

권한 창을 응답하지 않고 두는 경우까지 포함해 화면은 최대 **15초** 기다린다. 브라우저 자체 10초 수신 제한과 별개의 전체 대기 제한이다. 사용자 취소나 제한 시간 후에도 브라우저 권한 창/내부 측정이 즉시 닫히는 것은 아니며, 이후 콜백을 무시하는 방식이다.

### 위치 오류 코드

| `CurrentLocationError.code` | 발생 조건 | 사용자가 할 일 |
|---|---|---|
| `UNSUPPORTED` | 위치 API를 제공하지 않는 환경 | 지원 브라우저 사용 |
| `INSECURE_CONTEXT` | 위치 API가 있지만 안전한 실행 환경이 아님 | 정상 인증서의 HTTPS 주소로 접속 |
| `PERMISSION_DENIED` | 브라우저 코드 1: 권한 거부 또는 정책 차단 등 | 사이트 권한·OS 위치 설정·임베드 정책 확인 |
| `POSITION_UNAVAILABLE` | 브라우저 코드 2, 기타 위치 실패, 동기 플랫폼 예외 | 위치 서비스/수신 상태 확인 후 재시도 |
| `TIMEOUT` | 브라우저 코드 3 또는 전체 15초 경과 | 권한 창과 수신 상태 확인 후 재시도 |
| `ABORTED` | 호출 화면에서 취소 | 필요하면 새로 조회 |
| `INVALID_POSITION` | 범위 밖 좌표, 잘못된 정확도/측정 시각 | 재측정. 기본 서울 좌표 등으로 대체하지 않음 |

브라우저가 HTTP 환경에서 `navigator.geolocation` 자체를 숨기면 `UNSUPPORTED`로 분류될 수 있다. 원본 플랫폼 오류 전문은 화면이나 로그에 출력하지 않는다.

### 나머지 위치 함수

| 함수 | 입력 | 출력/예외 |
|---|---|---|
| `readLocationEnvironment()` | 없음 | 보안 환경 여부와 브라우저 위치 객체. 권한 요청 없음 |
| `isLocationCoordinates(value)` | 검증 전 값 `unknown` | 실제 숫자 위도·경도이고 범위가 맞으면 `true` |
| `parseCurrentLocation(position)` | 브라우저 `GeolocationPosition` | 복사한 `CurrentLocation`. 잘못되면 `INVALID_POSITION` |

## 5. 서버 경로 API와 브라우저 클라이언트

### HTTP 계약: `POST /api/routes`

프런트는 외부 ORS 호스트를 직접 호출하지 않고 동일 출처의 서버 API를 호출한다. 인증키·위치 정확도·측정 시각·화면 목적지 키는 본문에 넣지 않는다.

```http
POST /api/routes
Content-Type: application/json
```

```json
{
  "mode": "walking",
  "preference": "recommended",
  "points": [
    { "latitude": 35.1044927, "longitude": 128.9459775 },
    { "latitude": 35.0463559, "longitude": 128.9680206 }
  ]
}
```

| 요청 필드 | 허용 값/의미 |
|---|---|
| `mode` | `driving` 자동차, `walking` 도보 |
| `preference` | `recommended` 추천, `shortest` 거리 우선. 현재 화면은 추천 사용 |
| `points` | 출발→경유→도착 순서, 2~10개 직접 좌표. 현재 화면은 출발/도착 2개 |
| `points[].latitude` / `longitude` | 실제 숫자 위도/경도. 휴대폰 값 그대로 전달하고 순서를 바꾸지 않음 |

기존 서버는 UUID `placeId` 지점도 지원하지만 이 클라이언트는 직접 좌표만 보낸다. 현재 일정 화면의 장소 ID는 DB UUID라고 보장되지 않으므로 임의로 `placeId`에 넣지 않는다. 서버의 전체 계약·오류·캐시는 [ORS 모듈 README](../../../../../BackEnd/NestJS/src/routing-cache/README.md)를 참조한다.

### `routeFromCurrentLocation(origin, destination, mode, options?, transport?)`

- `origin`: 이미 확인한 `CurrentLocation`.
- `destination`: `{ latitude: number; longitude: number }`.
- `mode`: `driving | walking`.
- `options.signal`: 선택적인 취소 신호.
- `transport`: 선택적인 `fetch` 대역. 운영에서는 브라우저 `fetch`를 사용한다.
- 출력: `Promise<LocationRouteResponse>`. 이 함수는 위치를 다시 측정하지 않는다.

```ts
import { getCurrentLocation } from './geolocation';
import { routeFromCurrentLocation } from './route-client';

// 실제 화면에서는 각각의 사용자 버튼에서 단계별로 호출한다.
const origin = await getCurrentLocation();
const destination = { latitude: 35.0463559, longitude: 128.9680206 };
const route = await routeFromCurrentLocation(origin, destination, 'driving');
// route.distanceMeters: 미터, route.durationSeconds: 초
// route.geometry.coordinates: [경도, 위도] 배열
```

### `requestLocationRoute(request, options?, transport?)`

입력은 `LocationRouteRequest`와 선택적인 취소 신호/fetch 대역이다. 지점 2~10개를 보내는 일반 경로 호출에 사용할 수 있다. 잘못된 입력은 HTTP 전송 전에 거절한다. 내부에서 허용 필드만 복사하므로 추가 속성이 서버의 엄격한 입력 검사에 섞이지 않는다.

출력은 다음 필드를 가진 검증된 `LocationRouteResponse`다. 기존 서버 응답의 `points`, `calculatedAt` 등 이 화면에서 사용하지 않는 필드는 반환 형식에서 제외한다.

| 응답 필드 | 형식/의미 |
|---|---|
| `mode`, `preference` | 요청한 방식/선호도와 일치해야 함 |
| `distanceMeters` | 0 이상 유한한 숫자, 미터 |
| `durationSeconds` | 0 이상 유한한 숫자, 초 |
| `geometry.type` | `LineString` |
| `geometry.coordinates` | `[경도, 위도]` 쌍 2~200,000개. Leaflet에 그릴 때만 `[위도, 경도]`로 변환 |
| `timeSpans[]` | `fromIndex`, `toIndex`, `durationSeconds`. 첫 좌표부터 끝 좌표까지 연결된 구간과 시간 |
| `attribution` | 출처 문자열 또는 `null`. 문자열이면 화면에 표시 |
| `warnings[]` | 정수 `code`, 문자열 `message`. HTML로 해석하지 않음 |
| `trafficApplied` | 현재 계약에서는 `false`. 실시간 정체 반영으로 표시하지 않음 |
| `cacheId` | 서버 캐시 행 UUID |
| `cached` | `true`: 유효 캐시 재사용, `false`: 이번에 새로 수집 |
| `fetchedAt`, `expiresAt` | 수집/만료 시각. 유효한 시각이고 만료가 수집보다 뒤여야 함 |

`parseLocationRoute(value, request)`가 외부 JSON을 검사한다. TypeScript 타입 선언만으로 신뢰하지 않고 숫자·좌표·구간 인덱스·시간 합계·UUID·시각 등을 확인한다. 전체 시간과 구간 시간 합계 차이는 서버와 같은 `max(2초, 구간 수 × 0.11초)`까지 반올림 오차로 허용한다.

### 클라이언트 경로 오류

| `LocationRouteError.code` | 의미 |
|---|---|
| `INVALID_ROUTE_REQUEST` | 이동 방식·선호도·좌표·지점 개수 오류. HTTP 호출 없음 |
| `INVALID_ROUTE_RESPONSE` | 성공 HTTP 응답이지만 데이터 구조/내용 오류 |
| `ROUTE_HTTP_ERROR` | 서버가 HTTP 오류 반환. `status`로 400/401/429/503 등을 확인 가능 |
| `ROUTE_TIMEOUT` | 헤더 수신과 본문 읽기를 포함해 30초 초과 |
| `ABORTED` | 사용자 취소/화면 이탈 |
| `ROUTE_UNAVAILABLE` | 네트워크 실패 또는 읽을 수 없는 JSON |

서버 오류 응답의 원문/HTML/내부 메시지는 사용자에게 그대로 표시하지 않는다. HTTP 429는 잠시 후 재시도하라는 문구로 안내한다. 서버에서 보낸 세부 `code`와 이 표의 브라우저 오류 코드는 서로 다른 계층이다.

## 6. 지도·상태 처리 규칙

- 파란 실선은 이번 경로 API의 실제 경로다. 일차별 점선은 기존 일정 방문지를 순서대로 연결한 선이며 도로 경로로 간주하지 않는다.
- 현재 위치 마커와 파란 선은 별도 Leaflet 레이어에 묶어 새 조회/취소/위치 지우기/화면 종료 시 제거한다.
- 지도 목적지 배열은 `useMemo`로 유지해 위치/경로 응답만 바뀌었다고 모든 기존 마커를 다시 생성하지 않는다.
- 요청마다 `AbortController`를 만들고, 응답 시 그 제어기가 여전히 현재 요청인지 확인한다. 취소 신호를 무시하는 늦은 대역/콜백도 새 결과를 덮어쓸 수 없다.
- 경로 요청에 실패해도 이미 확인한 출발 좌표는 유지해 재시도할 수 있다. 새 위치 확인은 이전 출발 좌표와 경로부터 지운다.
- 경로 표시의 예상시간은 분으로 올림한다. 예: `625.3초 → 11분`, `3600초 → 1시간 0분`.
- 좌표가 없는 목적지에 임의 좌표를 채우지 않는다. 해당 목적지는 길찾기 버튼이 비활성화된다. 목적지가 없어도 현재 위치 자체는 확인할 수 있다.

## 7. HTTPS·모바일 권한·배포 준비

새 프런트 API 키나 별도의 위치 서버 환경변수는 필요 없다. 기존 NestJS의 ORS 설정과 DB 캐시 테이블/권한은 필요하다.

### 로컬 PC

```powershell
cd C:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\FrontEnd\v1
npm ci
npm run start:local
```

`http://localhost`는 브라우저에서 신뢰 가능한 개발 환경으로 취급할 수 있다. 현재 개발 명령은 80번 포트를 사용하며, 다른 서비스와 충돌하면 개발 서버 포트를 따로 지정한다. `/api`의 Vite 프록시 대상은 기존 `BACKEND_URL` 설정을 따른다.

### 휴대폰 및 운영

- 정상 인증서가 적용된 **HTTPS 주소**로 접속한다. 휴대폰에서 PC의 `http://192.168.x.x`를 여는 것은 `localhost`와 같지 않으므로 위치 조회가 차단될 수 있다.
- Android Chrome/Safari 등에서 사이트 위치 권한을 허용하고 휴대폰 OS 위치 서비스도 켠다. OS가 대략적인 위치만 허용하면 정확도가 낮을 수 있다.
- 처음 허용 후 버튼을 다시 눌러도 매번 팝업이 뜨지는 않는다. 차단한 사이트는 주소창의 사이트 설정에서 권한을 바꾸고 재시도한다.
- 앱 내부 웹뷰는 호스트 앱의 권한 설정/지원 여부에 영향을 받는다. 문제가 있으면 일반 Chrome/Safari에서 먼저 확인한다.
- `Permissions-Policy: geolocation=()` 등으로 서버가 위치 기능을 막고 있거나 iframe 권한이 빠지면 HTTPS에서도 동작하지 않을 수 있다. 현재 화면은 동일 출처의 최상위 페이지에서 사용하는 구성이며, 별도 iframe 배포는 추가 점검한다.
- 프런트 Nginx에서 `/api/routes`를 기존 백엔드로 전달해야 한다. `404`라면 프록시/배포 버전을, `503 CACHE_DATABASE_ERROR`라면 서버 DB 테이블/권한을 확인한다. GPS 권한과 DB 권한은 별개다.
- 배포 명령은 기존 Compose/CI를 따른다. 이번 구현에서 운영 배포·운영 DB 변경은 수행하지 않았다.

## 8. 위치 데이터와 키 관리

**현재 위치 확인만 실행한 경우**: React 메모리에만 위치를 보관하고 이 기능은 서버 전송, localStorage/sessionStorage 저장, 좌표 로그 출력을 하지 않는다. 브라우저/OS 자체 위치 처리와 사이트 권한 보관은 별개다.

**길찾기까지 실행한 경우**: 좌표가 자체 경로 서버로 전송되고 캐시가 없으면 ORS 제공자에게도 전달된다. 기존 `ors_route_cache`는 요청 좌표와 결과 경로를 저장한다. 현재 서버 정책은 성공 수집 후 **24시간** 유효, 매분 만료 행 최대 1,000개 정리다. 이는 24시간마다 모든 경로를 재호출한다는 의미가 아니다. 만료 시 조회에서 제외하고 다음 사용자 요청에서 새로 수집한다. 실제 삭제는 정리 주기·서버 동작 상태·남은 삭제량에 영향을 받는다.

서버 캐시 유효기간과 휴대폰 위치의 최신성은 다른 개념이다. 예전 위치에서 계산한 경로가 캐시에 유효하더라도 사용자가 이동했다면 위치를 다시 확인해야 한다. 사용자가 화면에서 위치를 지워도 이미 전송된 캐시/제공자 기록을 회수하지는 않는다. 브라우저 위치 권한 철회 역시 사이트 설정에서 별도로 한다.

ORS 키와 DB 접속 정보는 서버에만 둔다. `VITE_*`, 코드, README, 응답, 브라우저 로그에 실제 키를 넣지 않는다.

브라우저 Geolocation API 자체는 별도 유료 API 키가 필요 없다. 외부 경로 제공자 및 지도 타일의 이용 조건/호출량은 별도로 적용된다. 위치 API 설명은 [W3C Geolocation](https://www.w3.org/TR/geolocation/)과 [MDN getCurrentPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)을 참조한다.

## 9. 검증과 인수 확인

Node 22에서 실행한다. CI/Docker와 같은 계열을 사용한다.

```powershell
cd C:\furiosa-miniproject\FURIOSA_BOOTCAMP_miniproject\FrontEnd\v1
npm run lint
npm run build
```

2026-10-26 검증 결과:

- 전체 TypeScript 검사와 운영 Vite 빌드 통과. Vite 설정의 향후 `__dirname` 호환성과 큰 JS 청크 경고는 기존 빌드 점검 항목이다.
- 저장소 밖의 Node 서비스 검증 64개 통과: 좌표/시각/정확도 경계, 권한 오류, 보안 환경, 선취소/진행 중 취소/늦은 응답, 15초·30초 타이머와 정리, 정확한 HTTP 본문, 잘못된 응답, 실제 NestJS 요청 검증기와의 계약 등을 확인했다.
- 브라우저 검증은 실제 React DOM/Leaflet에 **모의 위치·모의 ORS 응답**을 연결해 수행한다. 실제 장치 GPS와 운영 제공자 연결 성공을 의미하지 않는다. 세부 결과는 [프런트 검토 기록](../../../../REVIEW.md)에 기록한다.
- 검증 전용 스크립트·모의 서버는 저장소 밖에 두고 배포 파일에 추가하지 않았다. 새 테스트 프레임워크/운영 의존성도 추가하지 않았다.

실제 휴대폰 인수 확인:

1. HTTPS 운영 화면에서 위치 확인 → 권한 허용 → 좌표·정확도·시각 표시.
2. 권한 거부 → 안내 확인 → 사이트/OS 권한 허용 후 재시도.
3. 자동차/도보 각각 실제 경로와 거리·시간 표시. 실시간 정체 미반영 문구 확인.
4. 위치 확인 중 취소, 경로 조회 중 목적지 변경/일차 변경/계획 변경 후 이전 결과가 남지 않는지 확인.
5. 위치만 확인할 때 `/api/routes`가 호출되지 않고, 길찾기 버튼에서만 호출되는지 네트워크 탭 확인.
6. 화면 위치 지우기 후 좌표·실제 경로 제거. 서버 캐시가 자동 삭제되었다고 해석하지 않기.

실제 휴대폰 권한 허용/센서 측정과 AWS 배포 후의 운영 통신은 별도 인수 확인이 필요하다.

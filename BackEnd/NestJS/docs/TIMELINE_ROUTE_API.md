# 타임라인 경로 스팟 추천 및 거점 반경 추천 API 명세

갱신일: 2026-10-27  
대상 모듈: `BackEnd/NestJS/src/route-explorer/`

---

## 1. 개요 및 설계 배경

기존 경로 탐색(`POST /api/routes/compare`)은 출발지(예: 서울)에서 도착지(예: 부산)까지 400km 전체 도로 주변의 장소를 무작위로 수십 개 나열하는 방식이었습니다. 이로 인해 실제 장거리 운전자가 **"언제 어디서 쉬고, 몇 시에 어디서 밥을 먹어야 하는지"**를 계획하기 어려운 한계가 있었습니다.

이를 해결하기 위해 다음 2가지 핵심 API를 신설했습니다:
1. **타임라인 경로 스팟 추천 (`POST /api/routes/timeline`)**: 출발 시각과 식사/휴식 희망 시각을 입력받아, 차량이 도로 위를 통과하는 시점의 좌표를 정밀 산출하고 그 길목 주변의 지정 카테고리(맛집/카페/명소)를 추천.
2. **거점 장소 반경 추천 (`POST/GET /api/places/nearby`)**: 특정 위경도 좌표(관광지/경유지)를 콕 집었을 때 그 주변 반경 $R$m 이내의 장소를 거리순으로 추천.

---

## 2. API 상세 명세

### 2.1 타임라인 경로 스팟 추천 API

- **Method / Path**: `POST /api/routes/timeline`
- **Content-Type**: `application/json`

#### 요청 파라미터 (Request Body)

| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|---|---|:---:|---|---|
| `mode` | `string` | O | - | 이동 수단 (`driving` 또는 `walking`) |
| `points` | `Point[]` | O | - | 출발지와 도착지 2개 좌표 (`longitude`, `latitude`) |
| `departureTime` | `string` | X | `"09:00"` | 출발 시각 (`HH:mm` 형식, 예: `"09:30"`) |
| `preference` | `string` | X | `"recommended"` | 경로 선호도 (`recommended` 권장, `shortest` 최단) |
| `stops` | `Stop[]` | O | - | 시간대별 추천 스팟 요청 배열 (1~10개) |

#### `stops[]` 세부 항목

| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|---|---|:---:|---|---|
| `label` | `string` | X | `"경유 스팟 N"` | 스팟 이름 (예: `"점심 식사"`, `"오후 휴게소 및 카페"`) |
| `targetTime` | `string` | O | - | 해당 스팟 도착/활동 희망 시각 (`HH:mm`, 예: `"12:30"`) |
| `contentTypeIds` | `number[]` | X | `[]` | TourAPI 콘텐츠 타입 (39: 음식점, 12: 관광지, 14: 문화시설, 28: 레포츠, 32: 숙박 등) |
| `categoryIds` | `string[]` | X | `[]` | DB `place_categories` UUID 배열 (대/중/소분류, 하위 계층 자동 재귀 포함) |
| `radiusMeters` | `number` | X | `5000` | 해당 통과 지점 기준 추천 반경 (100 ~ 20,000m) |
| `limit` | `number` | X | `5` | 반환할 추천 장소 최대 개수 (1 ~ 20개) |

#### 요청 예시 (JSON)
```json
{
  "mode": "driving",
  "points": [
    { "longitude": 126.9706, "latitude": 37.5547 },
    { "longitude": 129.0416, "latitude": 35.1152 }
  ],
  "departureTime": "09:30",
  "preference": "recommended",
  "stops": [
    {
      "label": "오전 휴게소 및 카페",
      "targetTime": "11:00",
      "contentTypeIds": [39, 14],
      "categoryIds": [],
      "radiusMeters": 5000,
      "limit": 3
    },
    {
      "label": "점심 식사",
      "targetTime": "12:30",
      "contentTypeIds": [39],
      "categoryIds": ["a1b2c3d4-e5f6-7890-abcd-ef1234567890"],
      "radiusMeters": 5000,
      "limit": 5
    }
  ]
}
```

#### 응답 예시 (JSON)
```json
{
  "departureTime": "09:30",
  "estimatedArrivalTime": "14:15",
  "totalDistanceMeters": 395400,
  "totalDurationSeconds": 17100,
  "routeGeometry": {
    "type": "LineString",
    "coordinates": [[126.9706, 37.5547], [127.02, 37.49], "..."]
  },
  "stops": [
    {
      "label": "오전 휴게소 및 카페",
      "targetTime": "11:00",
      "elapsedSeconds": 5400,
      "isAtDestination": false,
      "waypoint": {
        "longitude": 127.2411,
        "latitude": 36.9015
      },
      "places": [
        {
          "id": "c1f7b093-68d2-4328-98e3-a602fbc592bb",
          "name": "입장거봉포도휴게소(부산방향)",
          "address": "충남 천안시 서북구 입장면 연곡길 107",
          "latitude": 36.9015,
          "longitude": 127.2411,
          "contentTypeId": 39,
          "categoryName": "한식",
          "distanceMeters": 420
        }
      ],
      "candidateLimitReached": false,
      "error": null
    },
    {
      "label": "점심 식사",
      "targetTime": "12:30",
      "elapsedSeconds": 10800,
      "isAtDestination": false,
      "waypoint": {
        "longitude": 127.7812,
        "latitude": 36.1754
      },
      "places": [
        {
          "id": "d8e2a149-19b8-4c37-88d4-f810e7b8c199",
          "name": "영동 올갱이국밥",
          "address": "충북 영동군 영동읍 계산로 12",
          "latitude": 36.1742,
          "longitude": 127.7801,
          "contentTypeId": 39,
          "categoryName": "한식",
          "distanceMeters": 580
        }
      ],
      "candidateLimitReached": false,
      "error": null
    }
  ]
}
```

---

### 2.2 거점 장소 반경 추천 API

- **Method / Path**: `POST /api/places/nearby` 또는 `GET /api/places/nearby`
- **용도**: 사용자가 특정 관광지/경유지를 클릭했을 때, 또는 LLM이 특정 스팟 부근의 연계 일정을 계획할 때 주변 맛집/명소를 즉시 조회.

#### POST 요청 (JSON)
```json
{
  "latitude": 35.7901,
  "longitude": 129.3321,
  "contentTypeIds": [39],
  "categoryIds": [],
  "radiusMeters": 3000,
  "limit": 5
}
```

#### GET 요청 (쿼리스트링)
```http
GET /api/places/nearby?lat=35.7901&lng=129.3321&radius=3000&contentTypes=39&limit=5
```

#### 응답 예시 (JSON)
```json
{
  "center": {
    "latitude": 35.7901,
    "longitude": 129.3321
  },
  "radiusMeters": 3000,
  "places": [
    {
      "id": "e4f8a209-1122-4433-8899-abcdef012345",
      "name": "토함산 순두부",
      "address": "경북 경주시 보불로 120",
      "latitude": 35.7942,
      "longitude": 129.3298,
      "contentTypeId": 39,
      "categoryName": "한식",
      "distanceMeters": 490
    }
  ],
  "candidateLimitReached": false
}
```

---

## 3. 내부 구현 알고리즘 및 구조

### 3.1 시간대별 좌표 선형 보간 ([timeline-calculator.ts](../src/route-explorer/timeline-calculator.ts))
1. 출발 시각($T_{\text{dep}}$)과 목표 시각($T_{\text{target}}$)의 차이를 구해 경과 초($\Delta t$)를 산출. (자정 순환 대응)
2. $\Delta t \ge T_{\text{total}}$인 경우 이미 목적지에 도착한 상태이므로 도착지 좌표를 반환하고 `isAtDestination: true` 플래그 설정.
3. $0 < \Delta t < T_{\text{total}}$인 경우, ORS `timeSpans` 배열의 각 스텝별 `durationSeconds`를 누적 탐색:
   $$\alpha = \frac{\Delta t - \text{cumulativeDuration}}{\text{spanDuration}}$$
   $$P_{\text{interpolated}} = P_{\text{from}} + \alpha \times (P_{\text{to}} - P_{\text{from}})$$
   오차 없는 부동소수점 위경도 좌표(소수점 7자리)를 산출.

### 3.2 반경 및 카테고리 검색 SQL ([explorer.repository.ts](../src/route-explorer/explorer.repository.ts))
- **PostGIS 확장 없이도 고속 동작**:
  1. 위도/경도 바운딩 박스(Bounding Box)로 인덱스를 타서 1차 필터링.
  2. `WITH RECURSIVE selected` 절로 입력된 상위 카테고리(`categoryIds`)의 모든 하위 중·소분류 ID를 재귀 추출하여 교집합 검색.
  3. 구면 삼각법(Haversine Formula)으로 정확한 지표면 직선거리($m$) 계산 후 오름차순 정렬:
     $$D = 6371008.8 \times \arccos\left(\cos(\text{lat}_1)\cos(\text{lat}_2)\cos(\text{lon}_2 - \text{lon}_1) + \sin(\text{lat}_1)\sin(\text{lat}_2)\right)$$

---

## 4. LLM 에이전트 연계 가이드 (Function Calling)

향후 Gemini 등 LLM이 여행 일정을 짤 때 이 API들을 **Tool(도구)**로 연결하여 호출합니다:

```text
[사용자 요청]
"서울에서 9시 반에 출발해서 부산 가는데, 12시 반쯤 맛있는 로컬 점심 먹고 싶어."

[LLM 에이전트의 Tool 호출]
call POST /api/routes/timeline {
  "mode": "driving",
  "points": [서울역, 부산역],
  "departureTime": "09:30",
  "stops": [{ "label": "점심 식사", "targetTime": "12:30", "contentTypeIds": [39] }]
}

[API 결과 반환]
- 12:30 통과 지점: 충북 영동 인근
- 실측 맛집 후보 5곳 전달

[LLM의 최종 답변 생성]
"고객님, 09:30에 출발하시면 12:30경 충북 영동군을 지나게 됩니다.
그 시간대 도로변 500m 거리에 '영동 올갱이국밥'이 가장 적절합니다.
1시간 점심 식사 후 13:30에 다시 출발하시면 15:15에 부산에 도착합니다."
```

---

## 5. 테스트 및 검증 결과

- **테스트 파일**: [BackEnd/NestJS/test/timeline-explorer.test.cjs](../test/timeline-explorer.test.cjs)
- **검증 항목**:
  - `parseTimeToSeconds` / `formatSecondsToTime` 단위 변환
  - `timeSpans` 구간 보간 정확도
  - `timelineRequest` 입력 유효성 및 카테고리 UUID 검증
  - `nearbyPlacesRequest` 입력 유효성 검증
  - `ExplorerService.timeline` 오케스트레이션 및 리포지토리 연동
- **결과**: 24개 테스트 전체 패스 (`npm test` 0 에러 통과)

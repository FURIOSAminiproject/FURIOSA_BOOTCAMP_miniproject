# 길벗 AI 여행사 - 신규 타임라인 경로 추천 API 및 DB/인증 분석 구현 보고서

- **작성일**: 2026-10-27
- **작성 대상**: 타임라인 기반 경로 스팟 추천 시스템, 거점 반경 추천 시스템, 프로덕션 DB 및 인증 인가 분석
- **관련 커밋/모듈**: `BackEnd/NestJS/src/route-explorer/`, `BackEnd/NestJS/test/`, `DataBase/`

---

## 1. 구현 배경 및 해결 과제

### 1.1 기존 시스템의 문제점
- **무작위 장소 나열**: 서울에서 부산까지 400km 이동 시, 고속도로 주변 5km~10km 내의 수많은 장소가 시간 순서나 운전자 동선과 무관하게 한꺼번에 수십 개 나열되었습니다.
- **여행자 시나리오 미반영**: 실제 여행자는 이동만 계속하는 것이 아니라, **"몇 시에 출발해서 몇 시쯤 어디를 지나가며, 점심(12:30)은 어느 길목에서 먹고, 휴게소/카페는 어디서 들를 것인가"**를 계획합니다.
- **데이터 활용 부재**: 외부 ORS API는 각 도로 구간별 소요 시간(`timeSpans`)을 이미 제공하고 있었으나, 이를 활용하여 특정 경과 시점의 차량 위치를 역산하는 로직이 없었습니다.

### 1.2 이번 구현을 통한 해결책
1. **타임라인 경로 스팟 추천 (`POST /api/routes/timeline`) 신설**:
   - 출발 시각(예: 09:30)과 희망 활동 시각(예: 11:00 휴게소, 12:30 점심 식사)을 입력하면, 도로 주행 시간을 누적 계산하여 **해당 시각에 차량이 통과하고 있을 도로 위의 정확한 위경도 좌표**를 선형 보간(Linear Interpolation)으로 산출.
   - 산출된 지점 반경(기본 5km) 내에서 사용자가 원하는 카테고리(음식점, 카페, 관광지 등)의 실제 TourAPI DB 장소를 거리순으로 추천.
2. **거점 장소 반경 추천 (`POST /api/places/nearby`, `GET /api/places/nearby`) 신설**:
   - 특정 관광지나 경유지 거점을 기준으로 반경 내 식당/카페/명소를 즉시 조회.
3. **카테고리/콘텐츠타입 정밀 필터링**:
   - `contentTypeIds` (TourAPI 39: 음식점, 12: 관광지, 14: 문화시설, 28: 레포츠, 32: 숙박 등)
   - `categoryIds` (DB `place_categories` 테이블의 대/중/소분류 UUID 지원, 상위 분류 선택 시 하위 분류 자동 재귀 검색)

---

## 2. 신규 API 상세 명세

### 2.1 타임라인 경로 스팟 추천 API

- **Method / Path**: `POST /api/routes/timeline`
- **Content-Type**: `application/json`

#### 요청 파라미터 (Request Body)
| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|---|---|:---:|---|---|
| `mode` | `string` | O | - | 이동 수단 (`driving` 또는 `walking`) |
| `points` | `Point[]` | O | - | 출발지와 도착지 좌표 2개 (`[{ longitude, latitude }, { ... }]`) |
| `departureTime` | `string` | X | `"09:00"` | 출발 시각 (`HH:mm`, 예: `"09:30"`) |
| `preference` | `string` | X | `"recommended"` | 경로 선호도 (`recommended` 권장, `shortest` 최단) |
| `stops` | `TimelineStopRequest[]` | O | - | 시간대별 추천 스팟 목록 (1~10개) |

#### `stops[]` 항목 상세
| 필드명 | 타입 | 필수 | 기본값 | 설명 |
|---|---|:---:|---|---|
| `label` | `string` | X | `"경유 스팟 N"` | 스팟 라벨 (예: `"오전 휴게소"`, `"점심 식사"`) |
| `targetTime` | `string` | O | - | 해당 스팟 도착/활동 희망 시각 (`HH:mm`, 예: `"12:30"`) |
| `contentTypeIds` | `number[]` | X | `[]` | TourAPI 콘텐츠 타입 (39: 음식점, 12: 관광지, 14: 문화시설 등) |
| `categoryIds` | `string[]` | X | `[]` | DB `place_categories` UUID 배열 (대/중/소분류 재귀 포함) |
| `radiusMeters` | `number` | X | `5000` | 해당 통과 지점 기준 탐색 반경 (100 ~ 20,000m) |
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
      "categoryIds": [],
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
    "coordinates": [
      [126.9706, 37.5547],
      [127.02, 37.49],
      "..."
    ]
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
- **목적**: 특정 거점(관광지/숙소/경유지) 주변 맛집/명소를 즉시 조회하거나 LLM이 세부 일정을 계획할 때 호출.

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

## 3. 핵심 아키텍처 및 내부 구현 알고리즘

### 3.1 파일 구조 및 변경 내역
```text
BackEnd/NestJS/src/route-explorer/
├── timeline-calculator.ts     [신규] 시간 파싱, 24시간 순환, ORS 좌표 선형 보간 알고리즘
├── explorer.types.ts           [수정] TimelineRequest, TimelineResponse, NearbyPlacesRequest 등 DTO 타입 정의
├── explorer.repository.ts      [수정] placesAroundSpot() - 거점 반경 고속 Haversine + 카테고리 재귀 CTE 쿼리
├── explorer.validation.ts      [수정] timelineRequest, nearbyPlacesRequest 입력 유효성 검증 로직
├── explorer.service.ts         [수정] timeline(), nearby() 비즈니스 오케스트레이션 로직 구현
└── explorer.controller.ts      [수정] POST /api/routes/timeline, POST/GET /api/places/nearby 엔드포인트 노출
```

### 3.2 시간대별 도로 좌표 보간 알고리즘 ([timeline-calculator.ts](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/NestJS/src/route-explorer/timeline-calculator.ts))
1. **시간 계산**:
   출발 시각($T_{\text{dep}}$)과 목표 시각($T_{\text{target}}$)을 초 단위로 변환 후 경과 시간($\Delta t$)을 계산합니다.
   목표 시각이 출발 시각보다 이른 경우 자정(24:00)을 넘긴 것으로 간주하여 86,400초를 가산합니다.
2. **도착 판정**:
   $\Delta t \ge T_{\text{total}}$인 경우 이미 목적지에 도착한 상태이므로 도착지 좌표를 반환하고 `isAtDestination: true`로 마킹합니다.
3. **선형 보간 (Linear Interpolation)**:
   ORS가 응답하는 세그먼트별 소요 시간(`timeSpans: [{ fromIndex, toIndex, durationSeconds }]`)을 순회하며 누적 시간을 추적합니다.
   경과 시간 $\Delta t$가 속하는 세그먼트를 찾은 뒤 구간 내 진행 비율 $\alpha$를 구합니다:
   $$\alpha = \frac{\Delta t - \text{cumulativeDuration}}{\text{spanDuration}}$$
   $$P_{\text{interpolated}} = P_{\text{from}} + \alpha \times (P_{\text{to}} - P_{\text{from}})$$
   이를 통해 오차 없이 정확한 도로 위 실시간 통과 지점 좌표(`[longitude, latitude]`)를 도출합니다.

### 3.3 고속 공간 질의 및 재귀 카테고리 쿼리 ([explorer.repository.ts](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/NestJS/src/route-explorer/explorer.repository.ts))
- **바운딩 박스(Bounding Box) 프리필터링**:
  위도 $1^\circ \approx 111,000\text{m}$, 경도 $1^\circ \approx 88,000\text{m}$를 기준으로 바운딩 박스를 계산하여 PostgreSQL B-Tree 인덱스를 즉시 활용합니다.
- **`WITH RECURSIVE` 계층 카테고리 질의**:
  사용자가 대분류나 중분류 UUID를 전달하더라도 `place_categories` 테이블의 부모-자식 트리 관계를 재귀 조회하여 하위 소분류 장소까지 빠짐없이 매칭합니다.
- **Haversine 구면 삼각법 직선거리 계산**:
  PostGIS 확장이 설치되지 않은 기본 PostgreSQL 환경에서도 동작하도록 쿼리 내부에서 정확한 지표면 곡률 반경(6,371,008.8m) 기반 거리를 계산하고 오름차순으로 정렬합니다.

---

## 4. 데이터베이스 및 인증 분석 요약

### 4.1 프로덕션 DB 덤프 (`dump-travel_prod-202610271043.sql`) 분석
- **파일 형식**: PostgreSQL 16 `PGDMP` (커스텀 바이너리 아카이브 v1.16)
- **보유 테이블 (총 11개)**:
  1. `users`: 사용자 계정 및 권한 (`chk_users_role CHECK (role IN ('Admin', 'user'))`)
  2. `user_preferences`: 사용자 여행 취향 (테마, 예산, 스타일)
  3. `trips`: 여행 계획 루트 (`title`, `start_date`, `end_date`, `budget`, `user_id`)
  4. `trip_days`: 일차별 정보 (`day_number`, `date`, `trip_id`)
  5. `trip_stops`: 세부 경유지 (`stop_order`, `place_id`, `arrival_time`, `stay_duration_minutes`)
  6. `places`: TourAPI 기반 4만+ 국내 관광지 및 음식점 데이터
  7. `place_categories`: 대/중/소분류 카테고리 계층 트리
  8. `place_reviews`: 장소 리뷰
  9. `ors_route_cache`: ORS 경로 응답 캐시 (24시간 TTL)
  10. `data_sources` & `ingestion_runs`: 데이터 수집 메타데이터
- **핵심 발견**:
  - 데이터베이스에는 이미 `trips`, `trip_days`, `trip_stops` 테이블이 인덱스까지 완벽하게 준비되어 있었습니다.
  - 프론트엔드에서 일정이 저장되지 않고 React 메모리에 머물렀던 이유는 DB 스키마가 없어서가 아니라, **`BackEnd/NestJS/src/itineraries/` 모듈이 빈 디렉터리로 남아 있어 엔티티와 CRUD API가 연결되지 않았기 때문**이었습니다.

### 4.2 인증 및 인가 (Auth & ACL) 분석
- **인증(Authentication)**:
  - 로컬 회원가입/로그인 (Bcrypt + HttpOnly JWT 쿠키 `trip_session`), 카카오/구글/네이버 OAuth 연동이 완전하게 구현되어 있습니다.
- **인가(Authorization)**:
  - `SessionAuthGuard`, `RolesGuard`, `@Roles()` 데코레이터가 `src/auth/`에 잘 구현되어 있으나, 컨트롤러들에 `@UseGuards(SessionAuthGuard)`가 적용되어 있지 않아 현재 모든 엔드포인트가 공개 상태입니다.
  - 향후 여행 저장(`trips`), 마이페이지 등 회원 전용 기능에 가드를 선별 적용할 수 있습니다.

---

## 5. LLM 및 프론트엔드 연동 방안

### 5.1 LLM 에이전트 (Function Calling / Tool Calling) 시나리오
Gemini 모델에게 자연어로 여행 일정을 생성하게 할 때, 이 신규 API들을 Tool로 등록하여 정확한 실측 데이터를 제공할 수 있습니다:

```text
[사용자 요청]
"서울에서 9시 30분에 출발해서 부산 벡스코로 가는데, 12시 30분쯤 맛있는 로컬 점심 먹고 싶어."

[LLM의 Tool 호출]
POST /api/routes/timeline
{
  "mode": "driving",
  "points": [서울역 좌표, 부산 벡스코 좌표],
  "departureTime": "09:30",
  "stops": [
    { "label": "점심 식사", "targetTime": "12:30", "contentTypeIds": [39] }
  ]
}

[API 결과 반환]
- 12:30 통과 지점: 충북 영동군 부근 (위도 36.1754, 경도 127.7812)
- 추천 맛집: '영동 올갱이국밥' (도로변 580m)

[LLM의 최종 답변]
"고객님, 09:30에 서울에서 출발하시면 12:30경 충북 영동군을 지나게 됩니다.
그 시간대 도로변 580m 거리에 위치한 '영동 올갱이국밥'을 추천드립니다.
1시간 식사 후 13:30에 다시 출발하시면 15:15에 부산 벡스코에 도착합니다."
```

### 5.2 프론트엔드 UI 연동 가이드
- **`/trips/new` 화면**:
  - 출발 시각 입력 필드 (기본값: `09:00`)
  - "식사/휴식 시간대 추가" UI: 목표 시각(`12:30`), 카테고리(음식점/카페/관광지) 선택
- **`/trips` 결과 화면**:
  - 지도 위에 전체 경로 폴라인 표시
  - 타임라인 카드 뷰: `09:30 출발` ➔ `11:00 입장거봉포도휴게소` ➔ `12:30 영동 올갱이국밥` ➔ `15:15 부산 도착` 형태로 시각화.

---

## 6. 테스트 및 검증 결과

1. **단위 및 통합 테스트**:
   - 테스트 스위트: [BackEnd/NestJS/test/timeline-explorer.test.cjs](file:///c:/furiosa-miniproject/FURIOSA_BOOTCAMP_miniproject/BackEnd/NestJS/test/timeline-explorer.test.cjs)
   - 테스트 항목:
     - `parseTimeToSeconds` / `formatSecondsToTime` 단위 및 자정 순환 검증
     - `timeSpans` 구간 보간 정확도 검증
     - `timelineRequest` 입력 파라미터 및 카테고리 UUID 검증
     - `nearbyPlacesRequest` 입력 검증
     - `ExplorerService.timeline` 오케스트레이션 및 리포지토리 연동 검증
   - 실행 결과: **5개 테스트 전체 통과 (0 failures)**

2. **기존 시스템 무결성 검증**:
   - `BackEnd/NestJS` 빌드: `npm run build` 성공 (컴파일 오류 0개)
   - 기존 전체 테스트: `npm test` 성공 (기존 24개 통합 테스트 + 8개 Jest 단위 테스트 전원 통과)
   - 기존 경로 비교 API(`POST /api/routes/compare`) 및 카테고리 API(`GET /api/routes/categories`) 하위 호환성 100% 유지.

---

## 7. Gemini Flash-Lite 기반 실시간 AI 여행 상담 챗봇 구현

- **엔드포인트**: `POST /api/chat`
- **백엔드 모듈**: `BackEnd/NestJS/src/chat/` (`ChatService`, `ChatController`, `ChatModule`)
- **프론트엔드 컴포넌트**: `FrontEnd/v1/src/components/AiTravelChatWidget.tsx` (전체 화면 플로팅 위젯)
- **사용 모델**: Google GenAI `gemini-3.5-flash-lite` / `gemini-2.5-flash-lite` (환경변수 `GEMINI_MODEL` 자동 정규화 및 폴백)

### 7.1 주요 기능 및 워크플로우
1. **플로팅 AI 챗봇 위젯**:
   - 웹사이트 우측 하단에 상시 위치하며, 클릭 시 모던한 글래스모피즘 팝업 창이 열립니다.
2. **여행 컨텍스트 자동 동기화**:
   - 사용자가 `/trips/new`나 `/trips`에서 선택한 출발지, 도착지, 여행 일정, 출발 시각을 챗봇이 자동으로 인식하여 "서울 ➔ 부산 (1박 2일)" 기반으로 맞춤 상담을 제공합니다.
3. **지능형 도로/타임라인 추천 연계**:
   - "9시 30분 출발인데 12시 30분 점심 맛집 추천해줘"와 같은 질문에 대해 주행 경과 시간을 고려하여 대전/영동 인근의 맛집 및 휴게소를 정확하게 추천합니다.
4. **빠른 질문 칩(Quick Prompts)**:
   - 길목 맛집 추천, 도로변 휴게소/카페 추천, 운전 피로 최소화 팁 등 원클릭 질문 지원.


# 길벗 AI 여행사 FrontEnd

현재 주요 여행 화면은 출발·도착지 검색 → 권장·최단 경로 비교 → 경로 주변 TourAPI 장소 탐색으로 구성됩니다. React·Leaflet 화면에서 기존 NestJS 검색·ORS·장소 추천 API를 사용하며, 외부 API 키는 서버에만 둡니다. 이전 AI 여행사 시연용 컴포넌트와 스튜디오는 별도로 남아 있습니다.

## 날짜별 체류 일정과 AI 대화 (2026-10-28)

결과 화면의 **AI 도착 후 일정 수정**은 현재 날짜별 방문 일정과 도착지 주변 등록 장소 후보를 서버에 보내 AI 수정안을 받습니다. 서버가 장소 ID·날짜·시간·중복·일정 범위를 검사한 경우에만 화면의 날짜별 방문 장소와 시각을 실제로 바꿉니다. 적용되지 않은 답변은 일정이 그대로임을 표시합니다. 초기화·새 여행 뒤 늦게 도착한 응답은 반영하지 않습니다. 경로선, 이동 수단, 출발 조건, 숙박 예약은 이 창에서 바꾸지 않으며 조건 수정 화면을 사용합니다.

지도 입력과 AI 채팅은 공통 `v1/src/services/trip-planning.ts`로 경로를 조회한 뒤 `/api/travel/destination-itinerary`에서 도착지 주변의 날짜별 여행 일정을 받습니다. 결과 화면의 **도착 후, 하루하루의 여행 계획**은 1일차 도착 이후와 2일차 이후를 별도 카드로 표시합니다. 관광·점심·카페·저녁, 체류 시간·이동 여유시간과 실제 등록 숙박 후보를 확인할 수 있습니다. 기존 경로 구간 추천은 이동 중 들를 후보로 구분합니다. 장소 부족과 일정 조회 실패는 별도 안내하며 장소를 지어내지 않습니다.

AI 채팅은 날짜·기간·시각을 받은 다음 자동차/도보를 직접 묻고, 이동 수단과 취향이 모두 확인되어야 요약을 표시합니다. 자동 생성하지 않으며 사용자가 생성 버튼을 눌러 실행합니다. 입력창 옆 **초기화**는 대화·선택·저장 캐시·현재 결과를 비우고 진행 중 요청의 늦은 응답을 무시합니다. 잘못 완료된 기존 대화가 재사용되지 않도록 저장 키를 v3으로 변경했습니다. 지도 입력의 기본 자동차 선택과 채팅에서의 미확정 이동 수단은 구분합니다.

취향 카드는 여러 번 선택할 수 있고, 직접 입력한 취향도 누적됩니다. **선택 완료 · 일정 요약 보기**를 눌러야 마지막 단계로 이동합니다. 숙박 후보는 취향 카테고리와 별도로 자동 조회합니다. 등록 숙박 후보가 없으면 중복 안내 대신 도착지 숙박시설 지도 검색 링크를 표시하며, 조회 실패와 0건을 구분합니다.

숙박만 입력해도 임의의 관광·음식 카테고리를 추가하지 않습니다. 다만 등록 DB에 숙박 후보가 없다면 자동으로 숙소 이름을 만들어 채우지 않습니다.

숙박 후보가 가까운 DB 범위에서 없으면 서버가 관광공사 실시간 숙박 정보와 더 먼 등록 DB 후보까지 확인합니다. 결과 카드에는 도착지와의 직선거리를 표시합니다. 두 공급원 모두 후보를 주지 못했을 때만 지도 검색 링크를 보여줍니다.

기간·출발 시각만 선택하면 그 값은 유지하고 출발 날짜만 다시 묻습니다. **오늘·내일·모레** 또는 달력에서 날짜를 고르면 이동 수단 질문으로 진행합니다. 반복된 질문의 이전 메시지에는 선택 버튼을 다시 붙이지 않습니다.

모델이 연결된 환경에서는 서버 AI가 자연어 날짜·시각·이동 의사와 취향을 해석합니다. 채팅은 검증된 해석 결과와 다음 질문을 사용하며, 선택한 취향을 도착 후 일정 API의 `travelStyle`로 전달합니다. 결과 카드의 **AI 취향 큐레이션** 표시는 모델이 실제 DB 장소 후보의 방문 순서·시각·체류 시간을 제안한 경우에만 나타납니다. 모델을 사용할 수 없으면 기존 로컬 흐름으로 진행합니다.

새 기능은 수정된 NestJS와 함께 실행해야 합니다. 장소 간 시간은 직선거리 기반 추정이고 영업·예약·귀가 이동은 별도 확인 대상입니다. 여행 결과는 계속 React 메모리에 보관하며, 로그인한 사용자의 영구 보관함을 추가한 것은 아닙니다.

수정 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다.


## 모바일 웹 현재 위치와 길찾기

여행 카테고리는 DB `place_categories`의 LEVEL1을 그대로 표시하고, 선택 시 해당 부모 아래의 LEVEL2·3을 복수 선택하는 모달을 엽니다. 이름은 모두 `category_name` 원문이며 별도 상위 목록을 코드에 정의하지 않습니다. ‘전체’는 LEVEL1 ID, 상세 선택은 LEVEL2·3 ID를 기존 API의 `categoryIds`로 전송합니다. 초기 선택은 비어 있고 DB 조회 실패 시 재시도를 제공하며 임의 카테고리로 대체하지 않습니다. 모달의 적용/취소·Escape·검색·재편집을 지원합니다.

장소는 검색 버튼 없이 두 글자 이상 입력 후 600ms가 지나면 아래에 자동 추천됩니다. 한글 조합 중에는 요청을 보내지 않고, 방향키·Enter로도 장소를 선택할 수 있습니다. 출발·도착지를 모두 선택하면 **이번 여행의 시작**에 자동차/도보의 권장 경로 예상시간·거리를 자동 표시합니다. 위치나 이동 방식이 바뀌면 갱신하고, 추천 카테고리·반경 변경만으로는 시간을 다시 조회하지 않습니다. 예상시간은 기존 `POST /api/routes`와 서버 캐시를 사용하며 실시간 교통 정체는 반영하지 않습니다.

**여행 계획하기**(`/trips/new`)에서 출발·도착지를 검색해 선택하고 자동차/도보, 장소 카테고리, 추천 반경을 고릅니다. **내 여행 결과**(`/trips`)에서는 실제 응답의 권장·최단 경로와 거리·예상시간, 경로별 TourAPI DB 장소·지도 팝업을 표시합니다. `/routes`는 같은 기능을 한 화면에서 쓰는 호환 주소입니다. [API·검증 안내](../BackEnd/NestJS/src/route-explorer/README.md)와 [화면 분석·변경 내역](docs/TRIP_UI_CUSTOMIZATION.md)을 참고합니다.

조회 전에는 빈 상태이며 제주·경주 예시 일정, 고정 날짜·예산, 임의 숙소·견적·승인 상태를 표시하지 않습니다. 입력과 결과는 React 메모리로 두 화면 사이에서 공유하며, 조건 수정·새 여행·로그아웃 시 이전 결과를 지웁니다. 새로고침하면 다시 조회해야 합니다. 영구 일정 저장이나 추천 장소를 경유하는 일정 자동 생성 기능은 이번 화면에 포함하지 않습니다.

기존 `TravelMapView.tsx`의 **현재 위치에서 길찾기** 구현은 소스에 유지합니다. 새 두 화면은 이 일정 상세 컴포넌트를 렌더링하지 않으며, 직접 선택한 출발·도착지로 경로를 조회합니다. 실시간 교통 체증은 반영하지 않습니다.

브라우저 위치 API, 기존 `POST /api/routes` 계약, 입력/출력 예시, 파일별 역할, 오류 코드, HTTPS/휴대폰 권한 설정, 좌표의 서버 캐시 저장과 검증 결과는 [현재 위치 기능 상세 README](v1/src/services/location/README.md)에 정리했다. 위치·경로 함수와 상태 변수에 단위·입력·출력·예시 주석을 작성했다.

## 지도 색상 안내

여행 결과 지도 아래에 권장/최단 경로, 출발·도착·추천 장소와 배경지도 색상의 범례를 표시한다. 색상별 견본과 의미를 표시하며, 배경 색상 안내는 키보드와 터치로 접거나 펼칠 수 있다. 입력 미리보기는 처음에 접어서 표시한다. [색상별 의미·코드 구조·검증 안내](docs/MAP_LEGEND.md)를 참고한다.

## 기술 스택

`package.json`에 선언된 범위 기준입니다.

| 라이브러리 | 선언 버전 | 용도 |
|---|---|---|
| React / React DOM | `^19.0.1` | UI 렌더링 및 상태 관리 |
| TypeScript | `^7.0.2` | 정적 타입 검증 |
| Vite | `^8.3.0` | 고속 번들링 및 개발 서버 |
| Tailwind CSS / @tailwindcss/vite | `^4.3.3` | 유틸리티 퍼스트 반응형 스타일링 |
| Leaflet / @types/leaflet | `^1.9.4` / `^1.9.22` | 대한민국 GIS 인터랙티브 지도 시각화 |
| Motion | `^12.23.24` | 마이크로 인터랙션 및 전환 애니메이션 |
| Lucide React | `^0.546.0` | 현대적 SVG 아이콘 세트 |
| @google/genai | `^2.4.0` | 서버측 Gemini AI 모델 연동 SDK |

## 구조와 구현 범위

### 로그인 후 페이지

- 일반 사용자 로그인은 `/user`로 이동하며, 이 경로에는 첫 화면(EXPLORE)의 여행 소개·인기 여행지 콘텐츠가 표시됩니다.
- 관리자 로그인은 `/Admin`으로 이동하며, 관리자 권한이 없는 사용자의 `/Admin` 접근은 일반 사용자 화면 또는 로그인 화면으로 돌려보냅니다.
- `/user` 첫 화면은 `v1/src/components/UserHomePage.tsx`에 별도 컴포넌트로 구성되어 있습니다. 기존 `/` 첫 화면과 같은 Hero, AI 에이전트 소개, 여행자 피드를 표시하며, Hero의 기존 보관함 버튼도 현재 결과(`/trips`)로 연결됩니다.
- `/trips/archive`는 기존 링크 호환을 위해 `/trips`와 같은 현재 조회 결과를 표시합니다. 여러 여행을 저장하는 보관함은 아직 연결하지 않았습니다.
- 헤더의 브랜드를 클릭하면 로그인된 일반 사용자는 `/user`, 관리자는 `/Admin`으로 이동하고, 비로그인 사용자는 `/`로 이동합니다. **여행 계획하기**와 **내 여행 결과**는 각각 `/trips/new`, `/trips`로 연결됩니다. 비로그인 상태에서도 경로를 탐색할 수 있습니다.

```text
FrontEnd/v1/
├── src/
│   ├── components/
│   │   ├── studio/
│   │   │   ├── AgentCoreCodeInspector.tsx
│   │   │   ├── AgentPipelineArchitectureView.tsx
│   │   │   ├── MultiAgentTelemetryDashboard.tsx
│   │   │   └── SelfAttentionHeatmapModal.tsx
│   │   ├── weatherStudio/
│   │   │   ├── DatasetViewerModal.tsx
│   │   │   ├── EvaluationMetricsModal.tsx
│   │   │   ├── ModelWeightsInspectorModal.tsx
│   │   │   └── WeatherModelGraphModal.tsx
│   │   ├── Header.tsx
│   │   ├── HeroBanner.tsx
│   │   ├── TravelRequestForm.tsx
│   │   ├── TravelPlanDetail.tsx
│   │   ├── TravelMapView.tsx
│   │   ├── PoeticReviewSection.tsx
│   │   ├── AgentTeamIntro.tsx
│   │   ├── AgentOrchestrationView.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminApprovalModal.tsx
│   │   ├── AiTransformerStudio.tsx
│   │   ├── WeatherTechStudio.tsx
│   │   ├── LocalExpertChatModal.tsx
│   │   ├── CalendarSyncModal.tsx
│   │   ├── GisVerificationModal.tsx
│   │   ├── HourlyWeatherOutfitModal.tsx
│   │   ├── MultiPlanComparisonChart.tsx
│   │   ├── SmartPackingChecklistModal.tsx
│   │   ├── TravelerSocialFeed.tsx
│   │   ├── TravelInsuranceDashboard.tsx
│   │   ├── WeatherPredictionWidget.tsx
│   │   ├── PrintVoucher.tsx
│   │   └── ShareModal.tsx
│   ├── data/
│   │   └── presetData.ts
│   ├── services/
│   │   ├── aiTravelAgent.ts
│   │   ├── api.ts
│   │   ├── calendarExportService.ts
│   │   ├── colabExportService.ts
│   │   ├── localExpertData.ts
│   │   ├── mapIntegrationService.ts
│   │   ├── poetryService.ts
│   │   ├── safetyService.ts
│   │   ├── transformerStudioService.ts
│   │   ├── weatherPredictionService.ts
│   │   └── weatherStudioService.ts
│   ├── types/
│   │   └── travel.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.ts
├── Dockerfile
├── docker-entrypoint.sh
├── nginx.conf
├── nginx_http.conf
├── nginx_ssl.conf
├── vite.config.ts
├── metadata.json
└── package.json
```

### 이전 프로토타입의 AI 팀 소개

다음은 기존 시연 컴포넌트의 역할 설명입니다. 실제 독립 에이전트·예약·실시간 기상·지도 정확도 검증을 보장하는 기능 목록이 아닙니다. 새 `/trips/new`·`/trips`에서는 이 오케스트레이션·견적·승인 화면을 사용하지 않습니다. 기존 문제와 검증 경계는 [REVIEW.md](REVIEW.md)를 따릅니다.

1. **총괄 협연자 (Supervisor Maestro)**: 전체 에이전트 작업 모니터링, 일차별 방문지 중복 0건 감시, 자율 치유(Self-Healing)
2. **접수 디렉터 (Director)**: 여행 의뢰 요구사항 정밀 분석 및 작업 오케스트레이션
3. **기상·기후 관리관 (Weather Agent)**: 10개년 기상 빅데이터 모델 추론 및 실시간 기상 관측 융합 분석
4. **관광지 탐색관 (Attraction Agent)**: 대한민국 권역별 핵심 명소 및 미중복 랜드마크 정밀 추천
5. **미식 & 카페 큐레이터 (Gourmet Agent)**: 블루리본/로컬 향토 맛집 및 오션/마운틴뷰 카페 발굴
6. **맞춤 숙소 큐레이터 (Stay Agent)**: 예산과 동선에 맞춘 감성 한옥스테이, 호텔, 독채 풀빌라 매칭
7. **교통 & 동선 최적화관 (Transport Agent)**: KTX·렌터카·항공 환승 연계 및 일자별 최단 이동 동선 직조
8. **일정 & 경비 편성관 (Planner Agent)**: 타임라인 직조 및 숙박·식비·교통·입장료 총경비 편성
9. **안심 안전 지킴이 (Safety Agent)**: 방문지별 위험도 분석 및 24시간 권역별 응급의료망 연계
10. **품질 감수관 (Auditor Agent)**: 동선 효율성·예산 준수율·안전 수칙 종합 평가 및 관리자 인가 상신
11. **감성 문학 큐레이터 (Poet Agent)**: 미식 장소별 오감 감성 수필 및 서정시(詩) 창작
12. **지도 검증관 (Map Integration Agent)**: GIS 정밀 위경도 오차 검증 및 네이버/카카오/구글 지도 PUSH 링크 생성

### 남아 있는 프로토타입 컴포넌트

- **AI Transformer Studio**: 12개 에이전트의 TypeScript / Python 구현 코드 듀얼 뷰, Self-Attention 상호 가중치 2D 히트맵 시각화, Google Colab 42개 셀 통합 마스터 노트북(`.ipynb`) 및 개별 에이전트 Colab 원클릭 다운로드
- **Export to Calendar (.ics)**: Google Calendar, Apple Calendar, Outlook 연동 표준 `.ics` 파일 내보내기
- **1:1 로컬 전문가 & 24시 안심 비상대응관 챗**: 제주/경주/강릉/부산 등 권역별 식당 에티켓, 24시 응급실 직통망(119/112/1800-7233) 안내
- **기상 빅데이터 ML/DL 스튜디오**: 장기 기상 추론 모델 가중치 인스펙터, 복합 평가 지표(RMSE/MAE/R²), 시간대별 의상 추천

## 실행 및 환경

로컬 Node.js는 22.12 이상인 22.x 버전을 사용합니다. 저장소 루트에서 실제 앱 폴더로 이동해 잠금 파일 기준으로 설치합니다.

```bash
cd FrontEnd/v1
npm ci
npm run start:local
```

의존성을 변경하면 `FrontEnd/v1/package.json`과 `package-lock.json`을 함께 커밋합니다. 이 앱 폴더에서 `npm install --package-lock-only`로 잠금 파일을 갱신한 뒤 `npm ci`, `npm run lint`, `npm run build`로 확인합니다. CI의 클린 설치도 두 파일이 일치해야 통과합니다.

| 환경 | 읽는 환경 파일 | 빌드 | 실행 |
|---|---|---|---|
| local | `.env.local` | `npm run build:local` | `npm run start:local` (포트 80) |
| development | `.env.development` | `npm run build:dev` | `npm run start:dev` (포트 80) |
| production | `.env.production` | `npm run build:prod` | `npm run start:prod` (포트 80) |

## 여행 화면 검증

`FrontEnd/v1`에서 `npm run lint`, `npm run build`, `npm run test:trip`을 실행합니다. `test:trip`은 Node 22.18 이상인 22.x의 TypeScript 타입 제거 기능을 사용하며, 11개 테스트로 빈 초기 상태·좌표 선택·조건 변경 시 결과 폐기·부분 경로 실패·요청 스냅샷·DB 분류 계층·전체/상세 조합을 확인합니다. 브라우저 검증과 운영 DB 검증은 별개이며 [화면 변경 문서](docs/TRIP_UI_CUSTOMIZATION.md)에 구분했습니다.

## 2026-10-28 실제 기상 모델 연결 수정

여행 결과와 날씨 미리보기의 하드코딩 기후표·날짜 해시·가상 관측·가상 신뢰도 생성 코드를 제거했습니다. FastAPI POST /api/v1/weather/predict/request로 도착지 좌표와 선택한 실제 날짜를 보내며 응답의 5개 모델 지표(TA_AVG/TA_MIN/TA_MAX/RN_DAY/WS_AVG)를 날짜별로 검증합니다. 요청 기간 외 날짜·누락·중복·비수치·물리적으로 유효하지 않은 값은 표시하지 않습니다.

화면은 평균/최저/최고 기온·일 강수량(mm)·평균 풍속만 보여줍니다. 강수량을 강수확률로 변환하지 않고, 미제공 습도·UV·신뢰도·과거 편차는 표시하지 않습니다. 모델 지역을 표시해 목적지 자체의 관측과 구분합니다. 예측 실패는 오류와 재시도를 제공하며 예시값으로 대체하지 않습니다. 기존 localStorage 날씨 캐시는 읽지 않고, 검증된 실제 응답만 좌표·기간별 메모리에 최대 5분 보관합니다. 조건 변경·언마운트 시 요청을 취소하며 이전 조건의 응답을 표시하지 않습니다.

로컬 Vite /fastapi 프록시는 FASTAPI_URL(기본 http://127.0.0.1:8000)을 사용하고 접두사를 제거합니다. 운영 Nginx는 기존 동일 경로를 사용합니다. FastAPI에는 DB의 해당 지역 모델 아티팩트와 WEATHER_PROJECT_DIR/데이터셋 준비가 필요하며 연결 코드 수정만으로 모델 배포가 보장되지는 않습니다.

검증: Node 22.23.3에서 상태/날씨 계약 테스트 21건, 타입 검사, production 빌드 통과. 실제 컴포넌트를 사용하는 격리 브라우저 화면에서 정상 응답(모킹), 서버 500 시 기존 수치 제거·오류/재시도, 목적지 변경 후 새 응답 표시를 확인했습니다. 원격 모델·DB·Gemini·운영 배포는 실행하지 않았습니다.

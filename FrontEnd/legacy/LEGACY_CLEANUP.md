# 프론트엔드 미사용 코드 정리 내역 (2026-11-26)

대상은 배포되는 `FrontEnd/v1`입니다. 화면에서 더 이상 쓰지 않는 파일은 지우지 않고 `FrontEnd/legacy/v1/` 아래에 **원래 경로 그대로** 옮겼습니다. 남은 코드에서는 쓰지 않는 import, 상태, props, 의존성을 정리했습니다.

## 검증 결과

| 항목 | 결과 |
|---|---|
| `npm ci` (갱신된 lock 기준) | 성공 |
| `npm run lint` (`tsc --noEmit`) | 오류 없음 |
| `npm run build` | 성공 |
| `npm run test:trip` | 27개 통과, 0개 실패 |
| `tsc --noUnusedLocals --noUnusedParameters` | 정리 전 100개 이상 → 7개 (아래 "남겨둔 것" 참고) |

미사용 탐지는 knip(파일·export·의존성)과 `tsc --noUnusedLocals --noUnusedParameters`로 했고, 라우트, 테스트 참조, 백엔드 API, Docker/npm 스크립트를 직접 확인해 오탐을 걸렀습니다. 브라우저에서 화면을 눌러보는 E2E 확인은 하지 않았습니다.

## 1. legacy로 옮긴 파일 (27개)

모두 `FrontEnd/v1/<경로>` → `FrontEnd/legacy/v1/<경로>`로 이동했습니다. legacy 폴더는 Docker 빌드(`src`만 복사)와 v1의 `tsconfig` 범위 밖이라 빌드·타입 검사 대상이 아닙니다.

| 원래 경로 | 이유 |
|---|---|
| `server.ts` | AI Studio용 Express 개발 서버. npm 스크립트·Docker 어디서도 실행하지 않음 |
| `src/components/TravelPlanDetail.tsx` | 이전 AI 일정 상세 화면. 어느 화면에서도 렌더링하지 않음 |
| `src/components/TravelMapView.tsx` | TravelPlanDetail에서만 사용 |
| `src/components/CurrentLocationRoutePanel.tsx` | TravelMapView에서만 사용 |
| `src/components/CalendarSyncModal.tsx` | TravelPlanDetail에서만 사용 |
| `src/components/HourlyWeatherOutfitModal.tsx` | TravelPlanDetail에서만 사용 |
| `src/components/LocalExpertChatModal.tsx` | TravelPlanDetail에서만 사용 |
| `src/components/SmartPackingChecklistModal.tsx` | TravelPlanDetail에서만 사용 |
| `src/components/PrintVoucher.tsx` | App에서 여는 코드가 없어 표시되지 않음 |
| `src/components/ShareModal.tsx` | App에서 여는 코드가 없어 표시되지 않음 |
| `src/components/GisVerificationModal.tsx` | App에서 여는 코드가 없어 표시되지 않음 |
| `src/components/AgentOrchestrationView.tsx` | 어디서도 import하지 않음 |
| `src/components/TravelRequestForm.tsx` | 어디서도 import하지 않음 (현재 입력은 RouteExplorerPage) |
| `src/components/TravelArchivePage.tsx` | 어디서도 import하지 않음 (`/trips/archive`는 TripResultsPage 사용) |
| `src/components/WeatherPredictionWidget.tsx` | 어디서도 import하지 않음 (현재 날씨는 ModelWeatherPanel) |
| `src/components/PoeticReviewSection.tsx` | 어디서도 import하지 않음 |
| `src/components/AgentTeamIntro.tsx` | UserHomePage가 import만 하고 렌더링하지 않음 |
| `src/components/TravelerSocialFeed.tsx` | UserHomePage가 import만 하고 렌더링하지 않음 |
| `src/data/presetData.ts` | 위 legacy 컴포넌트에서만 사용 |
| `src/services/aiTravelAgent.ts` | App이 import만 하고 호출하지 않음 |
| `src/services/api.ts` | aiTravelAgent, poetryService에서만 사용 |
| `src/services/poetryService.ts` | 백엔드에 없는 `/api/poetry`를 호출. legacy에서만 사용 |
| `src/services/mapIntegrationService.ts` | legacy 파일에서만 사용 |
| `src/services/safetyService.ts` | legacy 파일에서만 사용 |
| `src/services/calendarExportService.ts` | legacy 파일에서만 사용 |
| `src/services/localExpertData.ts` | server.ts, LocalExpertChatModal에서만 사용 |
| `src/types/travel.ts` | 위 legacy 파일에서만 사용하는 타입 |

> 되살리려면 파일을 원래 경로로 다시 옮기고, App/UserHomePage의 연결 코드와 아래 3번의 의존성을 함께 복구하면 됩니다. 이동은 `git mv`로 했기 때문에 `git log --follow`로 이력을 그대로 볼 수 있습니다.

## 2. 수정한 파일과 수정 부분

### `FrontEnd/v1/src/App.tsx`
- **import (8~16행 부근)**: `FullTravelPlan, TravelRequest, AgentLog, AgencyStats` 타입 import, `orchestrateTravelPlan`, `AgentTeamIntro`, `ShareModal`, `PrintVoucher`, `GisVerificationModal`, `TravelerSocialFeed` import 제거
- **AppContent 상태 선언 (기존 120~138행)**: 값을 바꾸는 곳이 없던 상태 제거. `plans`, `selectedPlan`, `agencyStats`, `agentLogs`, `isGenerating`, `shareModalOpen`, `printVoucherOpen`, `gisModalOpen`
- **`<UserHomePage>` props (기존 312~315행)**: 컴포넌트가 쓰지 않던 `onQuickExplore`, `onSelectPlan`, `onSelectDestination`, `onOpenStudio` 전달 제거
- **JSX 하단 (기존 332~357행)**: 항상 닫혀 있던 공유 모달, 바우처 출력, GIS 검증 모달 렌더링 블록 제거
- 라우팅, 인증 세션 복원, 토스트, AuthModal, 챗봇 위젯, 푸터는 그대로입니다.

### `FrontEnd/v1/src/components/UserHomePage.tsx`
- **import (1~19행)**: `useState`, lucide 아이콘 8개(`Sparkles, MapPin, Calendar, Clock, Car, Coffee, Utensils, Camera`), `FullTravelPlan` 타입, `AgentTeamIntro`, `TravelerSocialFeed` import 제거
- **`UserHomePageProps`와 구조분해 (기존 27~40행)**: 쓰지 않던 props `onQuickExplore`, `onSelectPlan`, `onSelectDestination`, `onOpenStudio` 제거

### `FrontEnd/v1/src/components/RouteExplorerPage.tsx`
- **1행**: 쓰지 않는 `React` 기본 import 제거
- **lucide import**: `Sparkles` 제거
- **`formatRouteDistance` (기존 57행)**: 파일 안에서만 쓰여 `export` 제거

### `FrontEnd/v1/src/services/route-explorer.ts`
- **`parseSearchPlace` (109행)**: 파일 안에서만 쓰여 `export` 제거. `parseComparison`은 테스트(`test/place-image.test.cjs`)가 사용해서 export 유지

### `FrontEnd/v1/src/components/DestinationItineraryView.tsx`
- **1행**: `React` 기본 import 제거
- **`itinerary.days.map` (기존 57행)**: 쓰지 않는 `idx` 인자 제거

### `FrontEnd/v1/src/components/TripResultsPage.tsx`
- **lucide import (7~23행)**: 쓰지 않는 `Cloud, CloudRain, RefreshCw, Sun, Thermometer, Umbrella, Wind` 제거

### `FrontEnd/v1/src/components/FullScreenAiChatPlanner.tsx`
- **1행**: `React` 기본 import 제거
- **lucide import**: `Calendar, Coffee, Utensils, Camera, CheckCircle2` 제거

### `FrontEnd/v1/src/components/AiTransformerStudio.tsx`
- **lucide import (9~21행)**: `Layers, Cpu, ShieldCheck, Zap, Globe, BrainCircuit, CheckCircle2` 제거

### `/studio` 하위 컴포넌트 (lucide import만 정리)
| 파일 | 제거한 import |
|---|---|
| `studio/AgentCoreCodeInspector.tsx` | `BookOpen, ShieldCheck, Cpu` |
| `studio/KnowledgeAgentChat.tsx` | `HelpCircle, Check` |
| `studio/LiveMatrixMathSandbox.tsx` | `Play` |
| `studio/MultiAgentNeuralDispatcher.tsx` | `Send, ArrowRight, Check, Bot` |
| `studio/PositionalEncodingSimulator.tsx` | `Sliders` |
| `studio/SelfAttentionVisualizer.tsx` | `Compass, Sliders, ArrowRight` |

### 1행의 `React` 기본 import만 제거한 파일
`jsx: react-jsx` 설정이라 JSX에 `React` import가 필요 없습니다. 훅은 이름으로 따로 import하던 것을 그대로 둡니다.

`AiTravelChatWidget.tsx`, `CategoryDetailModal.tsx`, `DestinationWeatherPreviewModal.tsx`, `ModelWeatherPanel.tsx`, `PlacePhoto.tsx`, `RouteAttribution.tsx`, `RouteExplorerMap.tsx`, `RouteMapLegend.tsx`, `TripFlowHeader.tsx`, `TripRouteEstimate.tsx`

## 3. 의존성 (`FrontEnd/v1/package.json`, `package-lock.json`)

| 제거한 패키지 | 이유 |
|---|---|
| `express`, `@types/express` | `server.ts`에서만 사용 |
| `@google/genai` | `server.ts`에서만 사용 (AI 호출은 백엔드 담당) |
| `dotenv` | 사용처 없음 (`vite.config.ts`는 `node:util`의 `parseEnv` 사용) |
| `motion` | 사용처 없음 |
| `autoprefixer` | 사용처 없음 (PostCSS 설정 없음, Tailwind v4 Vite 플러그인 사용) |

lock 파일에서는 이 패키지들과 하위 의존성 133개만 빠졌고, 남은 패키지의 버전은 하나도 바뀌지 않았습니다. `tailwindcss`는 knip이 미사용으로 잡지만 `index.css`의 `@import "tailwindcss"`와 `@tailwindcss/vite`가 사용하므로 유지했습니다.

## 4. 문서

- `FrontEnd/AGENTS.md`: 코드 지도 표에서 옮긴 파일 항목을 legacy 안내 한 줄로 바꾸고, "이전 AI 일정 컴포넌트" 설명을 legacy 위치 기준으로 수정

## 5. 남겨둔 것 (의도적으로 손대지 않음)

- **`/studio` 화면 (`AiTransformerStudio`와 `studio/` 6개 파일, `transformerStudioService`, `colabExportService`)**: 라우트가 살아 있어서 주소로 직접 들어가면 열립니다. 다만 화면의 버튼으로는 들어갈 수 없습니다(마지막 연결이던 UserHomePage의 `onOpenStudio`도 원래 쓰이지 않았음). 발표용으로 남길지 결정이 필요해서 아이콘 import만 정리했습니다.
- **`transformerStudioService.ts`의 `runDemo(input)` 7곳**: 공통 함수 형태라 쓰지 않는 `input` 인자를 그대로 둡니다. 남은 tsc 경고 7개가 이것입니다.
- **`services/location/geolocation.ts`, `route-client.ts`의 현재 위치 관련 export**: 지금은 legacy의 `CurrentLocationRoutePanel`만 쓰지만, `route-client.ts`의 다른 함수는 현재 화면이 사용하고 위치 기능을 되살릴 가능성이 있어 유지했습니다.
- **`vite.config.ts`의 `/fastapi` 프록시**: 날씨 예측(`weatherPredictionService`)이 사용 중이라 유지
- **`FrontEnd/v2/v2`, `FrontEnd/v1.zip`**: 이번 범위(v1 TypeScript) 밖이라 손대지 않았습니다.

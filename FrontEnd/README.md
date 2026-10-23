# 길벗 AI 여행사 FrontEnd

12인의 인공지능 멀티에이전트 자율운영 국내 여행사 시연 및 고객 일정 생성 UI입니다. React 기반 여행 신청·12인 에이전트 오케스트레이션·GIS 지도 연동·AI Transformer 스튜디오·날씨 스튜디오·관리자 승인 및 캘린더(.ics) 내보내기 흐름을 제공합니다.

수정 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다.

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
- `/user` 첫 화면은 `v1/src/components/UserHomePage.tsx`에 별도 컴포넌트로 구성되어 있습니다. 기존 `/` 첫 화면과 같은 Hero, AI 에이전트 소개, 여행자 피드를 표시하며, Hero의 `내 여행 보관함` 버튼은 `/trips/archive`로 이동합니다.
- `/trips/archive`는 여행 일정을 카드로 보여주는 보관함입니다. 일정 상세 카드는 `/trips`, 새 여행 의뢰 버튼은 `/trips/new`로 연결됩니다. 현재 카드는 앱 메모리에 보관된 일정 목록을 표시하며, 새로고침 후에도 유지되는 서버 저장 기능은 포함하지 않습니다.
- 헤더의 브랜드를 클릭하면 로그인된 일반 사용자는 `/user`, 관리자는 `/Admin`으로 이동하고, 비로그인 사용자는 `/`로 이동합니다. 헤더의 `내 여행`은 로그인한 일반 사용자에게 `/trips/archive`를 열고, 관리자는 기존 `/trips` 상세 화면으로 이동합니다.

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

### 12인의 AI 멀티에이전트 팀

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

### 부가 핵심 기능

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

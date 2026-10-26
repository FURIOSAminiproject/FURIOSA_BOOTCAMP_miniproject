# FrontEnd 작업 지침

이 파일은 FrontEnd/와 하위 폴더에 적용한다. [README.md](README.md), [REVIEW.md](REVIEW.md)를 먼저 읽고 현재 요청에 관련된 코드 경로를 추적한다.

## 코드 지도

| 관심사 | 기준 파일 |
|---|---|
| 현재 여행 입력·검색·요약 | components/RouteExplorerPage.tsx, MapPlaceSearch.tsx |
| 현재 여행 결과·경로·장소 | components/TripResultsPage.tsx, RouteExplorerMap.tsx |
| 두 화면 공유 상태·HTTP | components/TripWorkspaceContext.tsx, services/trip-workspace.ts, route-explorer.ts |
| 탭·일정 목록·선택·승인/반려/재작성·통계 | src/App.tsx |
| 신청 입력·프리셋 | components/TravelRequestForm.tsx, data/presetData.ts |
| 진행 로그·실제 일정 POST | services/aiTravelAgent.ts, components/AgentOrchestrationView.tsx |
| HTTP·단일 문학 리뷰 POST | services/api.ts, services/poetryService.ts |
| 상세·지도·리뷰 | components/TravelPlanDetail.tsx, TravelMapView.tsx, PoeticReviewSection.tsx |
| 관리자 화면·모달 | components/AdminDashboard.tsx, AdminApprovalModal.tsx |
| 공유·출력·표시 UI | components/ShareModal.tsx, PrintVoucher.tsx, Header.tsx, HeroBanner.tsx, AgentTeamIntro.tsx |
| 계약·진입·스타일 | types/travel.ts, main.tsx, index.css |
| 개발 프록시·빌드 | vite.config.ts, package.json, package-lock.json, tsconfig.json |
| 운영 서빙 | Dockerfile, docker-entrypoint.sh, nginx_http.conf, nginx_ssl.conf |

표의 src 하위 경로는 `FrontEnd/v1/src/` 기준이다. API 변경 시 [NestJS 지침](../BackEnd/NestJS/AGENTS.md)과 서버 validation.ts/travel.types.ts도 읽는다. 배포 설정 변경 시 [Docker 지침](../Docker/AGENTS.md), CI_CD와 .github/workflows의 지침·실제 호출 파일도 확인한다.

## 실제 기능과 상태 소유권

- 현재 `/trips/new`·`/trips`는 검색·경로 비교·TourAPI DB 장소 추천이다. 공유 입력·결과는 React 메모리에 두며 새로고침 시 빈 상태로 돌아간다. 조건 변경·새 여행·로그아웃은 이전 결과를 지우고 진행 중 요청도 취소한다. `/trips/archive`는 현재 결과의 호환 주소이며 여러 여행을 저장하지 않는다. [화면 변경 문서](docs/TRIP_UI_CUSTOMIZATION.md)를 먼저 확인한다.
- 이전 AI 일정·통계·승인 컴포넌트도 소스에 남아 있다. App의 초기 프리셋·통계 주입은 제거했으며, 기존 생성·승인 화면은 새 두 여행 화면에서 사용하지 않는다. 인증 세션 및 관리자 페이지 진입 제어와 서버의 여행·관리자 API 권한 검사를 구분한다. 일정/승인 DB 저장은 미구현이다.
- 8개 역할의 고정 진행 로그와 지연 후 NestJS `/api/travel/plans`를 호출한다. SSE/WebSocket·독립 7개 에이전트의 실시간 협업 로그가 아니다. 문구를 구현 근거로 사용하지 않는다.
- 단일 리뷰는 `/api/travel/poetic-reviews`다. FastAPI는 현재 화면의 일정·리뷰 생성에서 호출하지 않는다.
- 공유는 현재 페이지 URL 복사, 카카오 전송은 시뮬레이션이다. 일정별 영구 URL·실제 메시지 발송으로 설명하지 않는다.
- 계획 변경·재작성 시 자식 컴포넌트의 useState, 지도 일차 필터·선택, 리뷰·모달·접힌 일차가 새 계획과 맞는지 확인한다. 초기 props를 useState에 넣는 것만으로 다음 props와 동기화되지는 않는다.
- 리뷰 재생성 시 자식 상태와 상위 계획의 literaryReviews가 함께 바뀌는지 확인한다. 자식 상태만 갱신하고 상위 계획이 저장됐다고 판단하지 않는다. 현재 PrintVoucher는 문학 리뷰를 출력하지 않는다.
- ANALYZING/PENDING_APPROVAL/APPROVED/REVISING/REJECTED 상태와 예산 초과를 화면·심사·출력에서 각각 처리한다. 실패 시 loading뿐 아니라 계획 상태와 오류 안내도 확인한다.

## API·외부 데이터

- api.ts는 동일 출처 `/api` POST, 180초 타임아웃, HTTP 오류 변환을 수행한다. 제네릭 타입이 응답 JSON의 런타임 검증을 제공하지 않는다.
- 프론트와 백엔드 공통 타입은 별도 파일이다. 타입·필수 입력·서버 검사·응답 소비를 함께 확인한다. NestJS 여행 기간은 1~10일이다.
- 모델 응답의 가격·좌표·장소·문학 필드는 외부 데이터다. Leaflet HTML 문자열은 React의 텍스트 escaping 경로 밖이므로 검증·텍스트 삽입/정제가 필요하다.
- OSM 타일과 네이버/카카오 링크는 외부 의존성이다. 선으로 연결한 좌표를 실제 도로 최단 경로·예약 가능 여부 검증으로 설명하지 않는다.
- Gemini 키·DB 비밀값을 VITE_*나 번들에 넣지 않는다. AI 요청은 서버가 담당한다.

## 환경·빌드·운영 구분

- package.json의 모드 별칭과 vite.config.ts의 localdev→local 매핑을 확인한다. 선택된 `.env.*`를 직접 읽고 시스템 환경이 우선한다. envDir=false이며 직접 파싱한 값은 프록시 설정에 사용한다.
- ENABLE_TLS는 Vite의 기본 backend target 프로토콜을 고르는 값이며 Vite 서버 HTTPS를 켜지 않는다. BACKEND_URL이 있으면 그 값이 우선한다. `/fastapi` 개발 프록시는 없다.
- 개발·preview의 Vite 프록시와 배포 Nginx 프록시는 별개다. BACKEND_URL 변경으로 Nginx upstream이 바뀌지 않는다.
- Docker는 public/·로컬 .env.*·호스트 dist를 입력으로 복사하지 않고 소스를 다시 빌드한다. 인증서 감지는 컨테이너 시작 시 수행한다.
- nginx.conf는 초기 복사 파일이며 엔트리포인트가 HTTP/HTTPS 템플릿으로 교체한다. 실제 적용 경로를 따라 수정한다.
- 엔트리포인트는 같은 lineage의 cert/key를 함께 선택하고, [IP 폐기 도구](../CI_CD/certificates/README.md)가 차단한 동일 leaf는 제외한다. 차단 표시만으로 CA 폐기가 성공했다고 판단하지 않는다. 해당 로직 변경 시 폐기 도구의 오프라인 테스트도 실행한다.

## 검증

이 폴더에서 Node 22.12 이상인 22.x와 잠금 파일을 기준으로 의존성을 준비한다. CI/Docker는 Node 22다.

```powershell
npm ci
npm run lint
npm run build
```

lint는 tsc --noEmit이다. Vite build만으로 타입 검사를 대신하지 않는다. `npm run test:trip`은 Node 22.18 이상인 22.x에서 실행하는 공유 상태 테스트 7개이며 브라우저 E2E를 대신하지 않는다. 현재 여행 흐름 변경은 검색·선택·두 화면 이동·경로 전환·조건 변경·취소·오류·새로고침을 확인한다. 이전 컴포넌트 변경에는 생성·재작성·승인/반려·예산·지도 필터·리뷰·공유/출력 중 관련 경로를 확인한다. 단순 문서 수정에 새 테스트 체계를 추가하지 않는다. 정적 검사·모킹·실제 브라우저·운영 API 검증 수준을 구분하고 README와 관련 REVIEW 항목을 함께 갱신한다.

실행·빌드 작업 디렉토리는 `FrontEnd/v1/`이다. 위 표의 Vite·package·Docker/Nginx 파일도 v1 기준이다. `v2/v2`는 별도의 로그인 화면이며 현재 Compose 배포 대상과 구분한다. 서버에는 인증 기능이 있으나 v1 화면·여행 API에 권한 검사가 연결된 것은 아니다.

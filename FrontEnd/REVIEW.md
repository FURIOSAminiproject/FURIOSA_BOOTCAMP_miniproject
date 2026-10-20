# FrontEnd 구현 검토 기록

검토일: 2026-10-19. src의 컴포넌트·서비스·타입·프리셋, Vite/패키지 설정, Docker/Nginx 연결을 검토했다. 아래 문제는 미수정이다. P1은 외부 데이터의 HTML 주입 경로, P2는 특정 상태·입력에서 결과를 잘못 표시하거나 복구하지 못하는 경로다.

## 확인된 개선 항목

### F01 · P1 · 모델 응답 문자열을 Leaflet 팝업 HTML에 그대로 넣는다

- 근거: [TravelMapView.tsx](v1/src/components/TravelMapView.tsx)의 popupHtml에 place.name/categoryLabel/timeSlot/description을 직접 보간한 뒤 bindPopup에 전달한다. 설치된 Leaflet의 `src/layer/DivOverlay.js`는 문자열 콘텐츠를 innerHTML에 할당한다.
- 검증: Leaflet을 스텁으로 대체하고 장소 이름에 `<img src=x onerror="window.marker=1">`을 넣자 해당 문자열이 그대로 bindPopup 인수에 도달했다. 실제 DOM 삽입이나 스크립트 실행은 수행하지 않았다.
- 발생 조건·영향: 생성된 일정에 HTML/이벤트 속성이 포함되고 사용자가 팝업을 열면 HTML 주입과 스크립트 실행으로 이어질 수 있는 경로다. 실제 악성 모델 응답·운영 공격을 관측한 것은 아니다. 서버도 AI 응답 구조를 검증하지 않는다.
- 개선 방향: 장소 텍스트는 DOM textContent 등 텍스트 경로로 넣고 필요한 마크업만 안전하게 구성한다. HTML이 필요하면 신뢰할 수 없는 값을 정제한다. [백엔드 B01](../BackEnd/REVIEW.md)과 함께 검증한다.

### F02 · P2 · 계획 전환 시 이전 리뷰·지도 필터가 남는다

- 근거: [PoeticReviewSection.tsx](v1/src/components/PoeticReviewSection.tsx)는 초기 reviews만 useState에 넣고 후속 props를 반영하지 않는다. [TravelPlanDetail.tsx](v1/src/components/TravelPlanDetail.tsx)와 App에는 계획 ID별 key가 없고, 지도 activeDayFilter도 계획 변경 시 초기화되지 않는다.
- 검증: React 훅의 상태 보존을 모사한 컴포넌트 실행에서 A 리뷰로 초기화한 뒤 B 리뷰 props를 전달해도 A가 남았다. 지도도 유지된 3일차 필터와 새 2일 일정의 조합에서 필터 결과가 비게 되는 소스 경로를 확인했다. 실제 브라우저 전환 테스트는 아니다.
- 영향: PLAN 탭 안에서 다른 계획을 선택하거나 재작성 결과로 교체하면 일정과 리뷰·지도 표시가 어긋날 수 있다. 언마운트 후 재진입하는 경우와 구분한다.
- 개선 방향: 계획 단위 상태 소유권과 초기화 정책을 정하고 props 동기화 또는 계획별 재마운트를 적용한다. 같은 계획 내 재작성 결과도 확인한다.

### F03 · P2 · 리뷰 재생성 결과가 상위 계획에 반영되지 않는다

- 근거: PoeticReviewSection에는 onReviewsUpdated가 있지만 TravelPlanDetail은 이를 전달하지 않는다. 재생성은 해당 자식의 reviews만 변경하고 App의 selectedPlan.literaryReviews는 바꾸지 않는다.
- 영향: 리뷰 카드에서 내용을 바꾼 뒤 화면을 떠나 재마운트하면 이전 리뷰로 돌아간다. 새로고침 시 전체 초기화되는 시연 구조와 별개로 한 세션 안에서도 불일치한다.
- 검증: 렌더링 요소의 props에 갱신 콜백이 없고 상위 갱신 경로도 없음을 확인했다. 실제 API 재생성·브라우저 전환 테스트는 수행하지 않았다.
- 개선 방향: 리뷰를 계획 데이터와 함께 상위에서 관리하거나 갱신 콜백을 연결해 카드와 선택 계획의 일관성을 유지한다.

### F04 · P2 · 재작성 요청 실패 후 REVISING 상태가 남는다

- 근거: [App.tsx](v1/src/App.tsx)의 handleRevisionRequest는 먼저 REVISING으로 변경한다. catch는 console.error만 수행하며 finally는 isGenerating만 해제한다.
- 재현: 일정 오케스트레이터를 실패 스텁으로 대체하고 실제 핸들러를 실행하자 로딩은 false지만 선택 계획의 상태는 REVISING이었다. 훅 상태와 API를 모사한 격리 검증이다.
- 영향: 오류를 복구할 상태 전환·명시적 실패 안내가 없어 계속 재조율 중인 것처럼 보인다.
- 개선 방향: 실패 후 이전 상태 복구 또는 실패 상태·재시도 절차를 정하고 고객·관리자에게 결과를 알린다.

### F05 · P2 · 반려·예산 초과를 다른 상태로 표시한다

- 근거: TravelPlanDetail 배너는 APPROVED/PENDING_APPROVAL 이외를 모두 REVISING으로 표시한다. 비용은 OPTIMAL 이외를 '예산 내 집행', 예산 차액이 양수가 아니면 '예산 100% 매칭'으로 표시한다. [AdminApprovalModal.tsx](v1/src/components/AdminApprovalModal.tsx)는 초과 시 '초과 없음'을 표시한다.
- 재현: REJECTED, NEEDS_ADJUSTMENT, totalCost=budget+10,000인 계획으로 컴포넌트를 실행해 위 문구가 나오는 것을 확인했다.
- 영향: 반려된 일정이 재작성 중으로 보이고 실제 초과 견적도 예산 준수로 읽힌다.
- 개선 방향: 전체 상태를 명시적으로 처리하고 차액을 절감/동일/초과로 구분한다. 상세·심사·통계 표시를 함께 확인한다.

### F06 · P2 · 승인되지 않은 계획에도 출력 승인 도장을 표시한다

- 근거: TravelPlanDetail의 출력 버튼은 승인 상태 조건이 없고 [PrintVoucher.tsx](v1/src/components/PrintVoucher.tsx)의 '인가승인필'과 승인 확약서 문구도 조건 없이 표시된다.
- 재현: REJECTED 계획을 전달해 출력 컴포넌트의 렌더 결과에 '인가승인필'이 있음을 확인했다. 실제 PDF 인쇄는 하지 않았다.
- 영향: 미승인·반려 일정도 승인된 확정 문서처럼 출력될 수 있다. 서버 인증 구현 여부와 별개의 표시 오류다.
- 개선 방향: 미승인 출력 허용 정책을 정하고 상태에 따른 초안/반려/승인 표시와 도장을 적용한다.

## 현재 시연 기능과 검토 경계

- 관리자 초기 true, 메모리 일정·통계, 고정 역할 로그, 카카오 전송 시뮬레이션, 현재 URL 복사는 기존 구현 범위다. 서버 권한·저장·메시지 발송 기능으로 설명하지 않는다.
- OSM 지도는 장소 좌표와 직선 연결을 표시한다. 실시간 관광 데이터·가격·예약·도로 최단 경로 검증이 아니다.
- Docker public 파일 누락·인증서 선택·갱신 반영은 [Docker 검토](../Docker/REVIEW.md), AI 응답·비용·폴백 코스 문제는 [BackEnd 검토](../BackEnd/REVIEW.md)에 기록했다.
- Vite 프록시의 ENABLE_TLS는 backend target 기본 프로토콜만 선택한다. 사이트 HTTPS와 배포 환경 자동 선택을 보장하지 않는다.

## 수행한 검증과 한계

- `npm run lint`와 `npm run build` 통과. Vite 8.3.4는 __dirname의 향후 native config loader 호환성과 약 508.76kB JS 청크 크기에 대해 경고했다. 현재 빌드 실패로 분류하지 않았다.
- 프리셋 요청 3개는 서버 입력 검증기를 통과했고, 계획 2개의 비용 항목 합계는 totalCost와 같았다. 프론트·NestJS 공통 타입 선언도 주석 제거 후 일치했다.
- TypeScript를 임시 변환해 컴포넌트 함수를 실행하고 훅 상태·Leaflet·API를 스텁으로 대체해 F01~F06의 관련 분기를 확인했다. React DOM의 실제 재조정, 브라우저 지도·클립보드·출력, 네트워크 API 연동을 검증한 것은 아니다.
- Node 24.20.0과 기존 설치 의존성을 사용했다. Node 22 클린 설치, 실제 브라우저 E2E, 실제 Gemini 응답, Docker 이미지·EC2 배포는 이번 범위에서 실행하지 않았다. 현재 프론트 패키지에는 전용 UI 테스트 스크립트가 없다.

2026-10-20에는 Nginx 진입점에서 같은 lineage의 cert/key 선택과 IP 폐기 도구의 차단 해시 처리를 추가했다. [폐기 도구 테스트](../CI_CD/certificates/tests/test_revoke_ip_certificates.py) 27개가 통과했고, 그중 8개는 경로를 치환한 진입점을 실제 셸로 실행하되 nginx를 모킹한 검사다. React 코드는 변경하지 않았으며 위 F01~F06의 미수정 상태도 유지한다. 실제 Nginx·EC2·CA 폐기는 실행하지 않았다.

## 2026-10-20 병합: 버전 폴더 보존

기존 여행 UI는 v1로 이동했고 v2/v2에는 상대 브랜치의 별도 로그인 UI를 보존했다. 현재 Compose·GitHub Actions의 활성 앱은 v1이다. TLS 진입점·Nginx 템플릿과 public 파일을 같은 v1 폴더로 옮겼다. v1 타입 검사·Vite 빌드가 통과했다. 기존 500KB 번들 경고와 Vite __dirname 경고는 남아 있다. 위 F 항목이나 v1 관리자 권한 검사를 해결한 변경은 아니다.

## 2026-10-20 추가: npm ci 잠금 파일 불일치

기준 5be27b3의 FrontEnd/v1/package.json에는 @google/genai ^2.4.0이 추가됐으나 잠금 파일의 루트 의존성과 패키지 항목에 반영되지 않았다. 사용자 CI와 같은 Node 22.23.3·npm 10.9.9로 npm ci dry-run의 EUSAGE 및 SDK·전이 의존성 누락을 재현했다.

같은 버전의 npm으로 잠금 파일을 갱신해 SDK 2.30.0과 전이 의존성 38개 항목을 추가했다. 기존 잠금 항목의 버전 변경·삭제는 없다. 실제 npm ci로 앱 폴더에 183개 패키지를 클린 설치했고, 타입 검사에서 발견한 LocalExpertChatModal의 Send 아이콘 import 누락도 수정했다.

npm run lint와 production 빌드가 통과했다. 기존 Vite __dirname 경고와 500KB 이상 청크 경고는 남아 있으며, 현재 JS 청크는 약 987.52kB다. Windows에서 CI와 같은 Node/npm 버전으로 검증했으며 실제 GitHub Linux 러너 재실행·브라우저 UI·Docker 이미지·EC2 배포는 수행하지 않았다.

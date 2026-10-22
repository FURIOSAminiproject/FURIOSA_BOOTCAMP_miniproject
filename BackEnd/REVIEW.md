# BackEnd 구현 검토 기록

검토일: 2026-10-19. 소스·실행 설정을 확인하고 아래 오프라인 검증을 수행했다. 이 문서는 현재 동작과 미수정 문제를 기록하며, 문제 수정 완료를 의미하지 않는다. P1은 외부 응답 때문에 주요 화면을 사용할 수 없게 되는 경로, P2는 특정 입력·배포 조건의 기능 오류다.

## 확인된 개선 항목

### B01 · P1 · 파싱 가능한 불완전한 AI 응답이 정상 응답으로 반환된다

- 근거: [travel-engine.ts](NestJS/src/travel/travel-engine.ts)의 JSON.parse 뒤 raw.days와 raw.costs 등을 그대로 사용한다. [poetry.service.ts](NestJS/src/travel/poetry.service.ts)는 parsed.poemVerses 등 필수 필드를 검사하지 않는다. responseMimeType만 지정되어 있다.
- 재현: SDK를 스텁으로 대체해 `{"days":[],"costs":{},"selectedAccommodation":{}}`를 반환시키면 빈 일정·비용 객체를 그대로 반환했다. 문학 리뷰에 필수 문학 필드가 없는 JSON을 주면 poemVerses가 undefined였다. 실제 Gemini 요청은 하지 않았다.
- 영향: 예외가 나지 않으면 폴백으로 전환하지 않는다. 프론트가 필수 숫자·배열을 렌더링할 때 오류가 나거나 빈 일정을 정상 결과로 표시할 수 있다. API postJson에도 응답 구조 검사가 없다.
- 개선 방향: 일정·리뷰 응답 스키마와 일수·비용·좌표 등의 조건을 검증한 뒤 채택하고, 실패한 경우 명확한 오류나 검증된 폴백을 반환한다. [프론트 검토](../FrontEnd/REVIEW.md)의 지도 HTML 처리도 함께 확인한다.

### B02 · P2 · 낮은 예산에서 비용 항목 합계와 총액이 다르다

- 근거: 절차적 일정의 숙박/식비/교통/입장료 비율 합계는 약 92%다. reserveTotal은 잔여액과 30,000 중 큰 값인데 totalCost는 요청 예산을 유지한다.
- 재현: 키 없는 제주 일정, 성인 2명, 예산 100,000원에서 항목 합계는 `38,000 + 32,000 + 16,000 + 6,000 + 30,000 = 122,000원`, totalCost는 100,000원, budgetStatus는 OPTIMAL이었다. 예산 100,000원은 서버 입력 검증 범위 안이다.
- 영향: 상세 비용과 총 견적·예산 준수 표시가 불일치한다. 실제 여행 비용을 검증한 결과도 아니다.
- 개선 방향: 최소 예비비 정책과 입력 예산 정책을 정하고 항목 합계·totalCost·costPerPerson·budgetStatus의 일관성을 검증한다.

### B03 · P2 · 긴 폴백 일정에서 귀환 코스가 중간 날에도 반복된다

- 근거: 제주 분기는 1일차, 2일차, 나머지 날로 구분한다. 강릉 분기는 1일차와 나머지 날로 구분한다. 마지막 날 조건으로 귀환 코스를 선택하지 않는다.
- 재현: 키 없는 제주 4일 일정에서 3·4일차 장소 이름 목록이 동일했다. 강릉의 2일차 이후 같은 분기 반복은 소스로 확인했다.
- 영향: 허용된 1~10일 요청에서 실제 마지막 날 전에도 공항·귀환 코스가 반복될 수 있다. days 배열 길이가 맞는 것만으로 일정 품질을 보장하지 못한다.
- 개선 방향: 첫날/중간 날/마지막 날을 구분하고 제주 1/2/3/4/10일, 강릉 1/2/3일 등 분기 경계를 확인한다.

### B04 · P2 · Nginx 경유 FastAPI Swagger UI의 OpenAPI 경로가 맞지 않는다

- 근거: [main.py](FastAPI/main.py)는 기본 OpenAPI URL을 사용한다. 프론트 Nginx는 `/fastapi/`를 제거해 전달하지만 외부 `/openapi.json`을 FastAPI로 전달하는 location은 없다.
- 검증: TestClient의 `/docs` HTML에 `url: '/openapi.json'`이 있음을 확인했다. 실제 Nginx 경유 브라우저 검증은 수행하지 않았다.
- 영향: `/fastapi/docs`로 열면 브라우저가 `/fastapi/openapi.json`이 아닌 사이트 루트 경로를 요청해 명세 로딩에 실패할 수 있다. FastAPI 직접 포트의 `/docs`와 구분한다.
- 개선 방향: 하위 경로 운영 정책에 맞춰 root_path/OpenAPI URL과 프록시를 조정하고 브라우저에서 확인한다. 현재 직접 접근 안내는 FastAPI README에 있다.

## 구현 범위 및 구성 주의점

- 루트 NestJS와 하위 `NestJS/`의 src 12개, scripts 3개, test 3개 및 패키지·잠금 파일·컴파일·Docker·PM2·ignore 설정을 포함한 25개 파일이 바이트 단위로 같았다. 현재 배포 대상은 `NestJS/`이며 자동 동기화는 없다.
- DB는 기동 시 필요하다. 당시 일정·승인 저장과 서버 인증은 미구현이었다. 2026-10-20 인증 통합 범위는 아래 추가 기록을 따른다. `/api/health`의 성공 문구는 DB 쿼리·일정 생성·실제 배포 완료를 검증한 결과가 아니다.
- FastAPI는 샘플 API다. 1/2/14일 요청 모두 total_days만 달라지고 장소는 day=1 두 개였다. budget 두 값을 바꿔도 응답은 같았다. 실제 추론 미구현을 새 회귀 오류로 분류하지 않았다.
- DB_SSL, 백엔드 직접 TLS, Nginx TLS 종료는 서로 다르다. ENABLE_TLS=true이나 키/인증서가 없으면 NestJS는 HTTP로 기동하면서 리다이렉트 미들웨어를 켠다. 직접 TLS를 켜면 현재 HTTP upstream과 충돌할 수 있다.
- PM2, npm 시작 스크립트, Compose는 환경 로딩 경로가 다르다. AWS/Windows·인증서 존재를 보고 DB 환경을 자동 선택하지 않는다.
- check-db.cjs의 주석과 달리 TS 진단 실행 선택 조건은 tsx 설치 여부가 아닌 소스 파일 존재 여부다. 의존성을 설치하지 않은 소스 폴더에서도 TS 경로를 선택한다.

## 수행한 검증과 한계

| 검증 | 결과·범위 |
|---|---|
| NestJS `npm test` | NestJS 폴더에서 컴파일과 기존 5개 테스트 통과. Mock DataSource, 키 없는 폴백, 환경·DB 옵션 검사 |
| 낮은 예산·긴 일정 | 실제 컴파일된 엔진을 키 없이 호출해 B02·제주 B03 재현 |
| 불완전한 AI JSON | SDK 스텁으로 B01 재현. 실제 모델의 응답 품질·가용성 검증은 아님 |
| FastAPI | AST 구문 확인 및 TestClient로 /, /health, /openapi.json, 정상 일수 1/2/14, 잘못된 입력 3개, budget 미사용, Swagger URL 확인 |
| 프리셋·공통 타입 | 프론트 요청 프리셋 3개를 서버 검증기로 확인. 계획 프리셋 2개의 비용 항목 합계와 총액 일치. 양쪽 공통 타입 선언은 주석 제거 후 일치 |

실행 환경은 Node 24.20.0, Python 3.14.7 및 기존 설치 의존성이었다. CI/Docker의 Node 22·Python 3.12 클린 설치를 재현한 것은 아니다. 샌드박스의 루프백 접속·이벤트 루프 제한을 확인한 뒤 NestJS API 테스트와 FastAPI TestClient를 제한 밖에서 재실행해 통과했다. 운영 DB, 실제 Gemini, Docker 이미지 빌드·통합 기동, EC2 배포·브라우저 E2E는 검증하지 않았다.

## 2026-10-20 병합: 인증 기능과 배포 구성 통합

origin/jiseokLee의 AuthModule·User·회원가입·로그인·OAuth를 현재 NestJS에 연결했다. 기존 여행·진단은 /api, 인증은 /auth 경로이며 ConfigModule·쿠키·CORS를 공유 설정으로 등록했다. NestJS 12·TypeScript 6 의존성에 Google SDK와 기존 환경·배포 스크립트를 통합했다. 자동 스키마 변경은 계속 비활성화한다. 위 B01~B04와 여행·관리자 API 권한 검사는 해결된 것으로 표시하지 않는다.

운영 빌드, Node 회귀·인증 통합 6개, Jest 단위 4개, 모킹 E2E 1개가 통과했다. OAuth 토큰·프로필 응답과 사용자 저장소는 모킹했고 state 오류 시 외부 교환이 호출되지 않는 것도 확인했다. 실제 DB 스키마·사용자 저장·Google 로그인을 검증한 결과는 아니다. 신규 인증 기동에는 32자 이상의 JWT_SECRET이 필요하며 기존 users에 적용할 OAuth SQL은 수동 준비 대상이다.

병합된 tsbuildinfo가 새 소스 출력을 생략하는 문제를 확인해 운영 컴파일의 incremental을 끄고 생성 캐시를 추적 대상에서 제외했다. 현재 BackEnd 루트 NestJS 사본과 배포 대상 NestJS는 인증 기능·의존성이 다르다.

## 2026-10-20 추가: Node 22 Jest ESM 호환성

사용자가 제공한 CI 로그에서 Node 테스트 6개는 통과했으나 Jest 단위 테스트가 NestJS 12의 ESM 패키지를 CommonJS require로 불러오며 실패했다. 이전 병합 검증은 로컬 Node 24.20.0에서 수행했으며, CI Node 22 검증을 대신하지 못했다. 공식 Node 22.23.3 Windows 바이너리로 같은 오류를 재현했다.

테스트 전용 tsconfig.spec.json과 단위·E2E의 ESM 변환 설정을 추가하고 jest 객체를 명시적으로 가져오도록 수정했다. 명시적 jest import에 맞춰 mock 함수·nullable 비밀번호 해시의 타입도 보완했고 tsconfig.spec의 noEmit 타입 검사가 통과했다. 운영 컴파일·CI/Docker Node 22는 유지했다. Node 22.23.3에서 전체 npm test(6+4개), 모킹 E2E 1개 및 운영 빌드가 통과했고, Node 24.20.0에서도 Jest 단위 4개·E2E 1개가 캐시 없이 통과했다. 실제 GitHub Linux 러너 재실행·EC2 배포는 수행하지 않았다.

## 2026-10-22 추가: tsx 개발 실행의 로그인 JWT 주입 오류

`start:local` / `start:dev`는 `tsx`로 소스를 직접 실행한다. 이 경로에서 타입 메타데이터에만 의존하던 `AuthService`의 `JwtService`와 `ConfigService` 주입이 누락되어 로그인 중 `jwtService.signAsync` 호출이 실패할 수 있었다. 두 생성자 매개변수에 `@Inject()` 토큰을 명시했다.

`tsx`로 `AuthModule`을 직접 로드한 뒤 모킹 사용자 저장소로 로그인하고 발급 JWT를 검증해 통과했다. Jest 단위 4개와 인증 통합 테스트도 통과했다. 전체 `npm test`에서는 기존 로컬 환경 파일의 DB 이름 덮어쓰기 때문에 환경 테스트 1개가 기대값과 달라 실패했으며, JWT 수정과는 별개다.

# 길벗 AI 여행사 FrontEnd

React 기반 여행 신청·일정 조회·지도·관리자 승인 시연 UI입니다. 실제 일정 생성은 NestJS API에 요청합니다.

수정 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다. 검토 기록은 확인된 미수정 문제와 검증 범위를 구분합니다.

## 기술 스택

`package.json`에 선언된 범위 기준입니다. 실제 설치 버전은 `package-lock.json`을 확인합니다.

| 라이브러리 | 선언 버전 |
|---|---|
| React / React DOM | `^19.0.1` |
| TypeScript | `^7.0.2` |
| Vite | `^8.3.0` |
| Tailwind CSS / @tailwindcss/vite | `^4.3.3` |
| Leaflet / @types/leaflet | `^1.9.4` / `^1.9.22` |
| Motion | `^12.23.24` |
| Lucide React | `^0.546.0` |

## 구조와 구현 범위

```text
FrontEnd/
├── src/
│   ├── components/
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
│   │   ├── PrintVoucher.tsx
│   │   └── ShareModal.tsx
│   ├── data/presetData.ts
│   ├── services/api.ts
│   ├── services/aiTravelAgent.ts
│   ├── services/poetryService.ts
│   ├── types/travel.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── Dockerfile
├── docker-entrypoint.sh
├── nginx.conf
├── nginx_http.conf
├── nginx_ssl.conf
├── vite.config.ts
└── package.json
```

`aiTravelAgent.ts`에는 길라잡이·명소박사·미식가·안식처·동선지기·설계사·감수관·풍류시객의 8개 역할이 정의되어 있습니다. 진행 뷰는 고정 로그와 지연을 표시한 뒤 `/api/travel/plans`에 POST합니다. 서버 이벤트 스트리밍이나 역할별 독립 AI 호출은 없습니다.

`App.tsx`의 일정·통계·승인 상태는 React 메모리에 저장되며 새로고침하면 프리셋으로 초기화됩니다. 관리자 모드는 기본 `true`이고 서버 인증·권한 검사와 승인 저장 API는 없습니다. 수정 요청 시에는 일정 생성 API를 다시 호출합니다. 공유 모달은 현재 페이지 URL을 복사하며, 카카오 알림톡 전송은 UI 시뮬레이션입니다. 일정별 공유 URL이나 실제 알림톡 발송 API는 없습니다.

## 실행 및 환경

로컬 Node.js는 22.12 이상인 22.x 버전을 사용하고 이 폴더에서 명령을 실행합니다. 잠금 파일의 Vite 8.3.4가 요구하는 Node 버전은 `^20.19.0 || >=22.12.0`이며, 프로젝트 CI와 Dockerfile은 Node 22를 선택합니다.

```bash
npm install
npm run start:local
```

| 환경 | 읽는 환경 파일 | 빌드 | 실행 |
|---|---|---|---|
| 로컬 | `.env.local` | `npm run build:local` | `npm run start:local` |
| 개발 | `.env.development` | `npm run build:dev` | `npm run start:dev` 또는 `npm run dev` |
| 운영 | `.env.production` | `npm run build:prod` | `npm run start:prod` 또는 `npm run preview` |

`build:op` / `start:op`도 운영 별칭입니다. 운영 실행은 먼저 생성된 `dist/`가 필요합니다. Vite preview는 로컬 빌드 확인용이며 배포 컨테이너에서는 Nginx가 서빙합니다.

Vite는 포트 80으로 시작을 시도합니다. `strictPort`를 지정하지 않았으므로 포트 점유 시 다른 포트를 선택할 수 있습니다. 실제 접속 주소는 실행 로그를 확인합니다.

Vite 설정은 선택한 환경 파일을 직접 파싱하고 시스템 환경변수를 우선합니다. `localdev` 모드는 `.env.local`로 매핑하며 Vite 기본 환경 파일 로딩은 비활성화되어 있습니다. 직접 파싱한 값은 프록시 구성에 사용하고 클라이언트 코드에 따로 주입하지 않습니다. 단, 실행 프로세스에 이미 설정된 `VITE_*` 변수는 Vite 기본 규칙에 따라 클라이언트에 노출될 수 있습니다.

```env
BACKEND_URL=http://127.0.0.1:3001
ENABLE_TLS=false
```

`BACKEND_URL`을 생략하면 `ENABLE_TLS=true`일 때 `https://127.0.0.1:3001`, 그 외에는 HTTP를 프록시 대상으로 사용합니다. 이 설정은 Vite의 `/api` 프록시에 적용되며 개발 서버 자체의 HTTPS를 켜지 않습니다. 개발 및 preview 모두 `/fastapi` 프록시는 없습니다.

## API 및 검증

`api.ts`는 `/api` 경로에 JSON POST를 보내고 180초 타임아웃을 사용합니다. 일정 생성과 단일 장소 문학 리뷰를 요청하며, FastAPI 추천 API는 현재 사용하지 않습니다.

```bash
npm run lint
npm run build
```

`lint`는 `tsc --noEmit` 타입 검사입니다. Vite 빌드 자체와 타입 검사는 별도입니다.

## Docker

서비스명 `backend`, `fastapi`를 해석할 수 있도록 저장소 루트의 Compose로 실행합니다. NestJS DB 환경 파일이 먼저 필요합니다.

```bash
APP_ENV=development docker compose up -d --build
```

Dockerfile은 Node 22에서 소스를 빌드하고 `nginx:alpine`으로 서빙합니다. 현재 빌드에는 `src/`가 복사되며 로컬 `.env.*`와 `public/`는 복사되지 않습니다. 이미지 내부의 기본 환경 파일은 Dockerfile에서 생성합니다. `BACKEND_URL`은 실행 중인 Nginx 프록시 대상을 변경하지 않습니다.

컨테이너 시작 시 `docker-entrypoint.sh`가 마운트된 인증서를 감지해 `nginx_http.conf` 또는 `nginx_ssl.conf`를 적용합니다. `/api/`는 `http://backend:3001`, `/fastapi/`는 접두사를 제거해 `http://fastapi:8000`으로 보냅니다. 브라우저는 동일 출처로 호출할 수 있습니다. 443 포트 공개만으로 HTTPS가 활성화되지는 않습니다.

인증서·키는 동일 lineage에서 선택하며 [IP 인증서 폐기 도구](../CI_CD/certificates/README.md)가 차단한 동일 cert.pem은 제외합니다. 이 변경은 새 frontend 이미지를 반영하고 재시작해야 적용됩니다. 현재 IP·도메인·만료까지 자동 검증하거나 폐기 후 재시작을 자동 수행하는 기능은 없습니다.

단독 `docker run`으로 정적 화면을 확인할 수는 있지만 API에는 공유 네트워크와 해당 서비스명이 필요합니다. [Docker 안내](../Docker/README.md)와 [배포 안내](../CI_CD/FrontEnd/README.md)를 참고합니다.

# 🎨 길벗 AI 여행사 - FrontEnd

React 19와 Vite 8 기반의 모던 웹 프론트엔드 프로젝트입니다. 7인의 AI 멀티에이전트가 설계한 맞춤 여행 일정을 시각적으로 탐색하고 관리자가 검토/인가할 수 있는 직관적인 UI/UX를 제공합니다.

---

## 🛠️ 기술 스택 (Tech Stack)

| 구분 | 기술 / 라이브러리 | 버전 | 주요 용도 |
|---|---|---|---|
| **Core** | React | 19.0.1 | 컴포넌트 기반 UI 렌더링 |
| **Language** | TypeScript | 7.0.2 | 타입 안정성 보장 |
| **Build Tool** | Vite | 8.3.0 | 초고속 HMR 및 프로덕션 번들링 |
| **Styling** | Tailwind CSS | 4.3.3 | 유틸리티 퍼스트 CSS 프레임워크 |
| **Map** | Leaflet / @types/leaflet | 1.9.4 | 여행 동선 및 장소 마커 인터랙티브 지도 시각화 |
| **Animation** | Motion (Framer Motion) | 12.23.24 | 카드 플립, 모달 페이드인 등 마이크로 애니메이션 |
| **Icons** | Lucide React | 0.546.0 | 모던 SVG 아이콘 세트 |
| **Web Server** | Nginx (Alpine) | - | 도커 및 프로덕션 정적 서빙 & API 리버스 프록시 |

---

## 📁 디렉토리 및 컴포넌트 구조

```
FrontEnd/
├── src/
│   ├── components/                 # 주요 UI 컴포넌트
│   │   ├── Header.tsx              # 상단 네비게이션 및 환경 상태 표시
│   │   ├── HeroBanner.tsx          # 메인 랜딩 히어로 배너 및 프로모션
│   │   ├── TravelRequestForm.tsx   # 고객 여행 의뢰서 입력 폼 (예산, 동행자, 스타일 등)
│   │   ├── TravelPlanDetail.tsx    # AI 여행 일정 상세표, 일자별 코스, 비용 분석
│   │   ├── TravelMapView.tsx       # Leaflet 기반 여행지 인터랙티브 지도
│   │   ├── PoeticReviewSection.tsx # '풍류시객' 에이전트의 맛집/카페 감성 수필 & 시
│   │   ├── AgentTeamIntro.tsx      # 7인 AI 멀티에이전트 역할 소개 카드
│   │   ├── AdminDashboard.tsx      # 관리자 여행사 종합 관제 대시보드
│   │   ├── AdminApprovalModal.tsx  # 일정 승인/수정요청/반려 관리자 인가 모달
│   │   ├── PrintVoucher.tsx        # 여행 확정서 인쇄/PDF 출력 뷰
│   │   └── ShareModal.tsx          # 카카오톡/링크 공유 모달
│   ├── data/
│   │   └── presetData.ts           # 프리셋 예시 데이터 및 지역별 명소 좌표
│   ├── services/
│   │   └── api.ts                  # 백엔드 NestJS API 통신 클라이언트
│   ├── types/
│   │   └── travel.ts               # 여행 요청, 일정, 에이전트 등 TypeScript 인터페이스
│   ├── App.tsx                     # 메인 애플리케이션 상태 관리 및 라우팅
│   ├── main.tsx                    # React 진입점
│   └── index.css                   # 글로벌 스타일 및 Tailwind 지시자
├── Dockerfile                      # 프론트엔드 Nginx 멀티스테이지 도커파일
├── nginx.conf                      # 컨테이너 내부 Nginx 서빙 & API 프록시 설정
├── vite.config.ts                  # Vite 빌드 및 개발 프록시 설정
└── package.json                    # 프로젝트 의존성 및 스크립트 정의
```

---

## 🚀 환경별 실행 및 빌드 명령어

본 프로젝트는 **포트 80**을 기본 웹 포트로 사용하며, 환경변수 파일(`.env.*`)을 통해 대상을 제어합니다:

| 환경 | 환경 파일 | 개발/실행 명령어 | 빌드 명령어 | 비고 |
|---|---|---|---|---|
| **로컬 (local)** | `.env.local` | `npm run start:local` (또는 `dev:local`) | `npm run build:local` | 로컬 백엔드(`127.0.0.1:3001`) 프록시 |
| **개발 (dev)** | `.env.development` | `npm run start:dev` (또는 `dev`) | `npm run build:dev` | 개발 백엔드 연동 |
| **운영 (op/prod)** | `.env.production` | `npm run start:prod` (또는 `preview`) | `npm run build:prod` | 운영 정적 번들 빌드 (`dist/` 생성) |

```bash
# 의존성 설치
npm install

# 개발 서버 구동 (기본 포트: 80)
npm run dev

# 프로덕션 번들 빌드
npm run build:prod
```

---

## 🐳 Docker 컨테이너 구동

`Dockerfile`과 `nginx.conf`를 통해 Nginx Alpine 기반의 초경량 컨테이너로 실행됩니다:

```bash
# 프론트엔드 단독 이미지 빌드
docker build -t travel-frontend .

# 프론트엔드 컨테이너 실행 (포트 80)
docker run -d -p 80:80 --name travel-frontend travel-frontend
```

---

## 🔄 Nginx 리버스 프록시 연동 원리

브라우저는 모든 요청을 프론트엔드 웹 서버(포트 80)로 전달하며, Nginx가 URL 패턴에 따라 분기 처리합니다:
* `/` (웹 페이지 및 정적 파일): `/usr/share/nginx/html`에 번들링된 React 파일 서빙
* `/api/` (API 호출): 백엔드 NestJS 서버(`http://backend:3001` 또는 `127.0.0.1:3001`)로 리버스 프록시 포워딩
* 이 구조로 인해 브라우저 단의 **CORS 문제가 원천 차단**됩니다.

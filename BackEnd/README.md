# 🚀 BackEnd 마스터 허브 가이드 (Multi-Backend Architecture)

> **길벗 AI 여행사의 백엔드는 역할에 따라 2개의 전문 백엔드 서비스(NestJS & FastAPI)로 분리되어 유기적으로 협업합니다.**

---

## 📑 백엔드 서브시스템 구성

```
BackEnd/
├── nestjs/             # [메인 웹 & 비즈니스 로직 서버] NestJS 11 + TypeORM + PostgreSQL + Gemini Multi-Agent
│   ├── src/
│   ├── test/
│   ├── scripts/
│   ├── Dockerfile
│   └── README.md
│
└── fastapi/            # [AI 마이크로서비스] Python 3.12 + FastAPI
    ├── main.py
    ├── requirements.txt
    ├── Dockerfile
    └── README.md
```

---

## 🏛️ 마이크로서비스 역할 분담 및 통신 구조

```mermaid
flowchart TD
    Client[React FrontEnd / Nginx<br/>Port 80 / 443] -->|/api/* :3001| NestJS[NestJS 백엔드<br/>BFF & 비즈니스 로직]
    Client -->|/fastapi/* :8000| FastAPI[FastAPI AI 엔진<br/>경량 비동기 마이크로서비스]
    NestJS -->|TypeORM Connection| DB[(AWS EC2 PostgreSQL 16<br/>Port 5432)]
    NestJS -->|Gemini SDK & Fallback| Gemini[Google Gemini AI]
```

| 서브시스템 | 기술 스택 | 포트 | 주요 역할 |
|---|---|---|---|
| **`BackEnd/nestjs`** | NestJS 11, TypeScript, TypeORM, Express | `3001` | • 프론트엔드 BFF (Backend For Frontend)<br/>• 사용자 요청 검증 및 DB 연결 진단<br/>• 7인 AI 멀티에이전트 파이프라인 조율<br/>• 절차적 한국어 일정/시/수필 폴백 엔진 |
| **`BackEnd/fastapi`** | FastAPI, Python 3.12, Uvicorn, Pydantic | `8000` | • 비동기 고속 데이터 처리 마이크로서비스<br/>• 서비스 헬스체크 (`/health`)<br/>• 여행지 추천 샘플 엔드포인트 (`/api/v1/recommend`) |

---


## ⚡ 빠른 실행 명령어 (Quick Start)

### NestJS 실행
```bash
cd BackEnd/nestjs
npm install
npm run start:dev     # 핫 리로드 개발 서버 (포트 3001)
npm test               # 격리 테스트 실행
```

### FastAPI 실행
```bash
cd BackEnd/fastapi
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

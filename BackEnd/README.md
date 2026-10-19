# BackEnd 구성 안내

현재 통합 실행과 자동 배포는 `nestjs/`와 `fastapi/`를 사용합니다.

수정 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다. 서비스별 세부 지침은 [NestJS](nestjs/AGENTS.md), [FastAPI](fastapi/AGENTS.md)에 있습니다.

| 위치 | 역할 | 기본 포트 |
|---|---|---|
| `nestjs/` | 일정·문학 리뷰 생성, PostgreSQL 연결 및 진단 | 3001 |
| `fastapi/` | 별도 샘플 추천 API 및 헬스체크 | 8000 |
| `BackEnd/` 루트의 `src/`, `scripts/`, `test/`, `package.json`, `Dockerfile` | 별도로 남아 있는 NestJS 구성 | 3001 |

루트 NestJS 구성과 `nestjs/`는 자동 동기화되지 않습니다. 현재 Compose 빌드 경로는 `BackEnd/nestjs`이고 GitHub Actions 감시 경로도 `BackEnd/nestjs/**`입니다. 루트 파일만 수정하면 현재 NestJS 자동 배포가 실행되지 않습니다. `CI_CD/BackEnd/` 루트 스크립트 또한 현재 워크플로우가 호출하는 스크립트와 다릅니다.

## 처리 흐름

```text
React → /api/travel/plans → NestJS → Gemini 통합 일정 생성 / 절차적 폴백
                                 └→ 장소별 문학 리뷰 생성 / 폴백
Nginx → /fastapi/* → FastAPI 샘플 API
NestJS → TypeORM → PostgreSQL 연결 및 진단
```

일정 생성에 독립된 7개 AI 에이전트가 협업하는 구조는 없습니다. 프론트에는 문학 역할을 포함한 8개 역할과 진행 시각화가 정의되어 있습니다. FastAPI는 현재 NestJS나 프론트의 일정 생성에서 호출하지 않습니다.

DB는 기동 시 연결하지만 일정·승인 데이터 저장은 구현되지 않았습니다. 승인·반려는 프론트 메모리 상태이며 서버 인증·관리자 권한 검사도 없습니다.

## 실행

아래 경로 이동 명령은 각각 저장소 루트에서 시작합니다. NestJS는 환경 파일 또는 시스템 환경변수로 DB 접속 정보를 준비해야 합니다.

```bash
cd BackEnd/nestjs
npm install
npm run db:check -- local
npm run start:local
```

FastAPI는 별도 터미널에서 실행합니다.

```bash
cd BackEnd/fastapi
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- [NestJS 설정·API·테스트](nestjs/README.md)
- [FastAPI 샘플 API](fastapi/README.md)
- [백엔드 CI/CD](../CI_CD/BackEnd/README.md)

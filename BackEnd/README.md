# BackEnd 구성 안내

현재 통합 실행과 자동 배포는 `NestJS/`와 `FastAPI/`를 사용합니다.

수정 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다. 서비스별 세부 지침은 [NestJS](NestJS/AGENTS.md), [FastAPI](FastAPI/AGENTS.md)에 있습니다.

| 위치 | 역할 | 기본 포트 |
|---|---|---|
| `NestJS/` | 일정·문학 리뷰 생성, PostgreSQL 연결 및 진단 | 3001 |
| `FastAPI/` | 별도 샘플 추천 API 및 헬스체크 | 8000 |
| `BackEnd/` 루트의 `src/`, `scripts/`, `test/`, `package.json`, `Dockerfile` | 별도로 남아 있는 NestJS 구성 | 3001 |

루트 NestJS 구성과 `NestJS/`는 자동 동기화되지 않습니다. 현재 Compose 빌드 경로는 `BackEnd/NestJS`이고 GitHub Actions 감시 경로도 `BackEnd/NestJS/**`입니다. 루트 파일만 수정하면 현재 NestJS 자동 배포가 실행되지 않습니다. `CI_CD/BackEnd/` 루트 스크립트 또한 현재 워크플로우가 호출하는 스크립트와 다릅니다.

## 처리 흐름

```text
React → /api/travel/plans → NestJS → Gemini 통합 일정 생성 / 절차적 폴백
                                 └→ 장소별 문학 리뷰 생성 / 폴백
Nginx → /fastapi/* → FastAPI 샘플 API
NestJS → TypeORM → PostgreSQL 연결 및 진단
```

일정 생성에 독립된 7개 AI 에이전트가 협업하는 구조는 없습니다. 프론트에는 문학 역할을 포함한 8개 역할과 진행 시각화가 정의되어 있습니다. FastAPI는 현재 NestJS나 프론트의 일정 생성에서 호출하지 않습니다.

DB는 기동 시 연결하며 회원가입·로그인·OAuth 사용자를 `users`에 저장합니다. 일정·승인 데이터 저장과 여행·관리자 API 권한 검사는 구현되지 않았습니다. 승인·반려는 프론트 메모리 상태입니다. 인증은 `/auth/*`, 여행·진단은 `/api/*` 경로입니다.

TourAPI 분류·장소 수집은 NestJS의 [서버 수집 명령](NestJS/docs/TOUR_INGESTION.md)으로 실행합니다. 책임별 모듈·SOLID 적용·검증 결과는 [장소 모듈 README](NestJS/src/places/README.md)에 기록했습니다. 공개 수집 HTTP 경로는 없습니다. [매일 01:00 한국 시간 배치](NestJS/src/places/batch/README.md)는 서버가 켜지면 자동 등록되며, 기존 환경 선택 규칙으로 대상 DB를 고릅니다. 장소 조회·후기 작성 API와 기존 AI 일정 생성의 DB 연결은 이번 수집 기능에 포함하지 않습니다.

## 실행

NestJS의 [ITS·ORS DB 캐시](NestJS/src/routing-cache/README.md)는 요청한 경로/영역의 응답을 각각 24시간/5분 저장합니다. 만료 뒤 다음 요청에서 API를 다시 호출하며, 매분 만료된 DB 행을 자동 정리합니다. 필수 테이블 진단과 저장·실패·삭제 로그가 있고 기존 TourAPI 새벽 1시 배치와는 별개입니다. 운영 대상 DB에 [전용 DDL](../DataBase/routing_cache_schema_v2.sql)을 먼저 적용해야 합니다.

아래 경로 이동 명령은 각각 저장소 루트에서 시작합니다. NestJS는 환경 파일 또는 시스템 환경변수로 DB 접속 정보를 준비해야 합니다.

```bash
cd BackEnd/NestJS
npm install
npm run db:check -- local
npm run start:local
```

FastAPI는 별도 터미널에서 실행합니다.

```bash
cd BackEnd/FastAPI
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- [NestJS 설정·API·테스트](NestJS/README.md)
- [FastAPI 샘플 API](FastAPI/README.md)
- [백엔드 CI/CD](../CI_CD/BackEnd/README.md)

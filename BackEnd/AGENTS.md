# BackEnd 작업 지침

이 지침은 `BackEnd/`와 하위 폴더에 적용한다. 하위 서비스의 AGENTS.md와 사용자의 현재 요청을 함께 따른다.

## 작업 시작 시 확인

1. [README.md](README.md)에서 서비스 경계를, [REVIEW.md](REVIEW.md)에서 확인된 문제와 검증 한계를 읽는다.
2. NestJS 작업은 [nestjs/AGENTS.md](nestjs/AGENTS.md), FastAPI 작업은 [fastapi/AGENTS.md](fastapi/AGENTS.md)를 읽는다.
3. 배포 영향이 있으면 루트 [Compose](../docker-compose.yml), 해당 Dockerfile, `CI_CD/BackEnd/`와 `.github/workflows/`의 실제 호출 경로를 확인한다. 해당 폴더를 수정할 때는 그 폴더의 AGENTS.md도 읽는다.

## 배포 대상과 중복 소스

| 위치 | 현재 역할 | 연결된 배포 |
|---|---|---|
| `BackEnd/nestjs/` | 실제 일정·문학 리뷰 API, DB 연결 | deploy_backend.yml → CI_CD/BackEnd/nestjs → Compose backend |
| `BackEnd/fastapi/` | 독립 샘플 추천 API | deploy_fastapi.yml → CI_CD/BackEnd/fastapi → Compose fastapi |
| `BackEnd/src`, `scripts`, `test` 등 | 별도 NestJS 사본 | 현재 Compose backend의 빌드 대상이 아님 |

2026-10-19 검토 시 루트 NestJS와 nestjs의 구현·설정 25개 파일은 바이트 단위로 같았다. 자동 동기화는 없으므로 이후에도 같다고 가정하지 않는다. 루트만 수정하고 배포 대상까지 수정했다고 보고하지 않는다. 수정 요청의 대상이 불명확하면 실제 배포 경로를 우선 확인하고, 다른 사본에 적용할 필요와 범위를 판단해 명시한다. 중복 구조를 임의로 병합·삭제하지 않는다.

## 실제 기능 경계

- React의 일정 생성과 단일 문학 리뷰 요청은 NestJS로 간다. FastAPI 호출로 이어지지 않는다.
- NestJS는 Gemini 통합 일정 요청과 장소별 문학 리뷰 요청을 사용한다. 독립된 7개 에이전트 협업 서버가 아니다. 프론트의 8개 역할 로그와 서버 실행을 구분한다.
- Gemini 키가 없거나 요청·파싱이 실패하면 내장 폴백을 사용한다. JSON 파싱 성공만으로 응답 구조·가격·장소·동선이 검증된 것은 아니다.
- TypeORM은 기동 시 PostgreSQL에 연결한다. 일정·승인 저장 엔티티/API, 서버 로그인·관리자 권한 검사는 없다. 승인·반려는 프론트 메모리 상태다.
- FastAPI의 `model_version` 문자열과 추론 관련 주석은 실제 모델·NPU 연결의 근거가 아니다.

## 변경 영향 확인

| 변경 | 함께 읽고 확인할 곳 |
|---|---|
| 요청·응답 필드/상태/날짜·인원·예산 조건 | NestJS validation.ts와 travel.types.ts, FrontEnd/src/types/travel.ts, 폼·API 호출·상세 화면·프리셋 |
| 일정·문학 리뷰 생성 | AI 성공/실패/구조 누락, 폴백, 비용 합계, 일수별 분기, 프론트 렌더링 |
| DB | database.config.ts, 모듈, health/db, 진단 CLI, 시작 스크립트, Compose env_file |
| TLS·포트·환경 로딩 | main.ts, scripts/start.cjs, ecosystem.config.cjs, Dockerfile, Compose, 프론트 Nginx |
| FastAPI 스키마·경로 | main.py, 응답 모델, Nginx의 /fastapi 접두사 제거, Swagger OpenAPI 경로 |

프론트와 백엔드의 공통 타입은 별도 파일이다. 타입 선언을 맞추는 작업과 외부 입력·AI 응답의 런타임 검증을 구분한다.

## 검증과 기록

- 해당 서비스 폴더에서 의존성을 준비하고 검증한다. 상위 node_modules를 우연히 찾는 환경만으로 클린 설치 성공을 단정하지 않는다.
- NestJS는 `npm test`를 기본으로 사용한다. 실제 DB·Gemini 검증과 Mock DataSource·키 없는 폴백 테스트를 구분한다.
- FastAPI는 스키마 경계와 실제 응답을 확인한다. Python 구문 검사만으로 API 동작을 검증했다고 보고하지 않는다.
- 검토만 요청받은 경우 실제 DB, 유료 AI 호출, 배포·운영 컨테이너 교체를 검증 수단으로 실행하지 않는다. 비밀값은 문서·로그·커밋에 남기지 않는다.
- 구현이 바뀌면 서비스 README와 관련 REVIEW 항목을 갱신한다. 검토 기록의 미수정 문제를 이미 해결된 기능으로 설명하지 않는다.

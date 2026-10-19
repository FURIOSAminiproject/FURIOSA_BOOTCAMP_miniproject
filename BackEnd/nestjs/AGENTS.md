# NestJS 작업 지침

상위 [AGENTS.md](../AGENTS.md)에 더해 이 폴더의 세부 기준을 적용한다. [README.md](README.md)와 [백엔드 검토 기록](../REVIEW.md)을 먼저 읽는다.

## 코드를 읽는 순서

1. `src/main.ts` → `app.module.ts`: 바인딩, TLS, 전역 `/api`, DB·컨트롤러 등록.
2. `src/travel/travel.controller.ts` → `validation.ts` → `travel.service.ts` → `travel-engine.ts` / `poetry.service.ts`: 입력부터 생성·폴백·응답까지.
3. `src/database/`: DB 옵션, 연결, `/api/health/db`, CLI 진단.
4. `scripts/`, `package.json`, `Dockerfile`, `ecosystem.config.cjs`: 실행 방식별 환경 차이.

## 환경 로딩 계약

| 실행 경로 | 동작 |
|---|---|
| scripts/start.cjs | local/dev/prod/op 정규화 → 선택한 `.env.*` 한 파일 → 시스템 환경 우선 → APP_ENV/NODE_ENV는 모드로 확정 |
| scripts/build.cjs | 환경 파일 존재만 확인하고 TypeScript 컴파일; DB 환경을 번들에 주입하지 않음 |
| Docker CMD | `node dist/main.js` 직접 실행; Compose가 환경을 주입, start.cjs를 거치지 않음 |
| PM2 ecosystem | `.env.production`을 읽는 별도 경로; env 객체 마지막의 파일 값이 앞선 기본값을 덮음 |

- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`은 필수다. 직접 실행과 Compose의 DB_NAME 기본값 유무를 혼동하지 않는다.
- `DB_SSL=true`는 PostgreSQL TLS이며 인증서를 검증한다. 웹 HTTPS 설정과 별개다.
- `ENABLE_TLS=true`는 리다이렉트·헤더를 켠다. 직접 HTTPS에는 존재하는 SSL_KEY_PATH/SSL_CERT_PATH도 필요하다. production이나 AWS 여부만으로 켜지지 않는다.
- 기본 Compose Nginx upstream은 HTTP다. 백엔드 직접 TLS 변경 시 프록시와 CI 헬스체크까지 확인한다.
- `synchronize`, `migrationsRun`, `dropSchema`는 false다. 요청받지 않은 자동 스키마 변경을 추가하지 않는다.

## API와 생성 로직

- `/api/travel/plans`와 `/api/travel/poetic-reviews`는 성공 시 201, 입력 검증 실패는 400이다. 전체 타입만 보고 실제 필수 입력을 추정하지 말고 validation.ts를 확인한다.
- 일정 기간은 양끝 포함 1~10일이다. 성인 1~100, 아동 0~100, 예산 정수 1~1,000,000,000, style 최대 20개 조건을 변경할 때 프론트도 확인한다.
- `/api/health`는 상태 응답이고 `/api/health/db`는 SELECT 1이다. CLI는 current_database를 확인한다. 서로 대체 검증으로 취급하지 않는다.
- AI 응답은 외부 데이터다. 날짜·배열·좌표·비용·필수 필드 검증을 타입 캐스팅이나 responseMimeType으로 대체하지 않는다. 리뷰의 poemVerses는 프론트가 배열로 사용한다.
- 폴백 검증에는 키 없는 생성, 예산 항목 합계, 요청 일수, 제주·강릉의 마지막 날 처리 등을 포함한다. 내장 안전 점수·가격을 실측 결과로 설명하지 않는다.

## 검증 명령

이 폴더에서 실행한다. CI/Docker는 Node 22를 사용한다.

```powershell
npm ci
npm test
npm run build:prod
```

`npm test`는 컴파일과 3개 파일의 5개 테스트를 실행한다. API 테스트는 Mock DataSource를 사용하고 Gemini 키를 제거한다. 시작 스크립트의 환경 테스트는 로컬 파일의 DB_NAME에 영향을 받을 수 있으므로 실패 시 실제 설정을 노출하지 말고 원인을 구분한다. `npm run db:check -- local`은 실제 DB에 접속하므로 별도의 연동 검증이 필요한 작업에서만 사용한다.

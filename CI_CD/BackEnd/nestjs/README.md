# NestJS CI/CD

실행 기준은 [워크플로우](../../../.github/workflows/deploy_backend.yml), [build.sh](build.sh), [deploy.sh](deploy.sh), [Dockerfile](../../../BackEnd/NestJS/Dockerfile)입니다.

## 트리거와 검증

`main` push의 `BackEnd/NestJS/**`, `CI_CD/BackEnd/nestjs/**`, `.github/workflows/deploy_backend.yml` 변경 또는 수동 실행으로 시작합니다. `BackEnd/` 루트 소스나 `docker-compose.yml`만 바뀌면 자동 실행되지 않습니다.

빌드 잡은 `ubuntu-latest`, Node 22를 사용합니다.

1. `npm ci`
2. `.env.local`, `.env.development`, `.env.production`이 없고 대응하는 `.example` 파일이 있으면 복사
3. `npm test`: 컴파일 후 Mock DataSource를 사용하는 API 테스트 등 실행
4. `npm run build:prod`
5. `dist/main.js`, `dist/app.module.js` 존재 및 내용 확인
6. `backend-dist` 아티팩트 업로드 (보존 1일)

테스트는 운영 PostgreSQL 접속이나 실제 Gemini 서비스 성공을 증명하지 않습니다. 환경 예제 파일은 조건부로 복사하며 현재 저장소에 존재한다고 가정하지 않습니다.

## 배포

`[self-hosted, linux]` 러너에서 checkout하고 아티팩트를 `BackEnd/NestJS/dist`로 받은 후 deploy.sh를 실행합니다.

1. `APP_ENV` 기본값 `production` 선택
2. `BackEnd/NestJS/.env.${APP_ENV}` 확인, 없으면 외부 후보 경로에서 복사. 끝까지 없으면 실패
3. `dist/main.js`, `package.json` 검사
4. 작업 폴더 `BackEnd/`를 `backups/backend/backend_backup_*.tar.gz`로 압축. node_modules·`.env*` 제외, 최신 1개 유지
5. 저장소 루트에서 `docker compose up -d --build backend`
6. 3초 후 `/api/health` 확인, 최대 5회·실패 간격 2초

환경 파일 검색 순서는 [통합 안내](../../README.md)의 목록을 따릅니다. 파일에는 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SSL` 등 실제 연결 설정을 준비합니다.

실제 이미지는 Dockerfile에서 소스를 다시 컴파일합니다. 다운로드한 `dist/`는 배포 전 검사에 사용하지만 최종 이미지는 별도 Docker 빌드의 산출물을 사용합니다. 실행 명령은 `node dist/main.js`이며 `.env`를 시작 스크립트로 읽지 않습니다. Compose가 환경변수를 주입합니다.

Compose는 `HOST=0.0.0.0`, `PORT=3001`, `APP_ENV`, `NODE_ENV`를 지정합니다. NODE_ENV 기본값은 production입니다. 호스트 공개 주소는 `127.0.0.1:3001`이고 컨테이너 간에는 `backend:3001`로 접근합니다.

## 성공 판정과 복구 범위

헬스체크는 호스트 curl을 먼저 시도하고 실패하면 `docker exec travel-backend node -e ...`로 컨테이너 내부 fetch를 시도합니다. `/api/health`는 프로세스 응답 확인이며 DB 쿼리는 수행하지 않습니다.

```bash
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/health/db
docker compose logs --tail=100 backend
```

실패 시 최근 로그 50줄과 종료 코드 1을 반환합니다. 자동 롤백은 없습니다. 단일 컨테이너 교체 방식이어서 중단이 발생할 수 있습니다. `restart: always`는 종료된 프로세스의 재시작 정책입니다.

백업은 checkout·아티팩트 다운로드 후의 작업 폴더이며 이전 운영 버전과 같다는 보장이 없습니다. 러너 cleanup으로 사라질 수도 있습니다. 별도 보관한 정상 커밋·이미지·환경 파일로 복구합니다.

## 문제 확인

- DB 접속 실패: `DB_HOST`가 컨테이너에서 접근 가능한지, 계정·DB 이름·네트워크 허용 범위를 확인합니다. 호스트 DB에는 `host.docker.internal` 등을 사용합니다.
- 502: backend 로그와 frontend의 Nginx 설정을 확인합니다. Compose 프록시는 HTTP `backend:3001`을 사용하므로 백엔드 자체를 HTTPS 전용으로 바꾸면 설정을 맞춰야 합니다.
- Docker 권한 오류: 러너 계정의 Docker 권한과 서비스 재시작 여부를 확인합니다.

동시성 그룹은 `backend-production`, `cancel-in-progress: false`입니다. 다른 서비스의 배포와 전역 잠금을 공유하지 않습니다.

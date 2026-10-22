# FrontEnd CI/CD

실행 기준은 [워크플로우](../../.github/workflows/deploy.yml), [build.sh](build.sh), [deploy.sh](deploy.sh), [Dockerfile](../../FrontEnd/v1/Dockerfile)입니다.

## 실행 조건과 빌드

`main` push에서 `FrontEnd/**`, `CI_CD/FrontEnd/**`, `CI_CD/BackEnd/nestjs/prepare-env.sh`, `.github/workflows/deploy.yml` 변경을 감지하며 수동 실행도 지원합니다. 동시성 그룹은 `frontend-production`, 취소 정책은 `cancel-in-progress: false`입니다.

`ubuntu-latest`에서 Node 22를 설정하고 build.sh가 다음 순서로 실행됩니다.

1. Node/npm 버전 확인
2. `npm ci`
3. `npm run build` (Vite production)
4. `dist/index.html` 존재 및 비어 있지 않음 확인

타입 검사 `npm run lint`는 이 스크립트에서 별도로 실행하지 않습니다. 결과는 `frontend-dist` 아티팩트로 업로드하며 보존 기간은 1일입니다.

## EC2 배포

배포 잡은 `[self-hosted, linux]`에서 소스를 checkout하고 아티팩트를 `FrontEnd/v1/dist`로 다운로드한 뒤 deploy.sh를 실행합니다.

1. 기본 `APP_ENV=production`으로 경로 설정
2. [공통 환경 검사](../BackEnd/nestjs/prepare-env.sh)로 NestJS 환경 파일 복원과 필수 DB·JWT·포트·DB_SSL 검사. 실패하면 서비스 중지·백업 전에 종료
3. 실행 중인 호스트 Nginx를 감지하면 중지·비활성화 시도
4. 작업 폴더의 `FrontEnd/`를 `backups/frontend/frontend_backup_*.tar.gz`로 압축, `.env*`와 node_modules 제외, 최신 1개 유지
5. `APP_ENV="$APP_ENV" docker compose up -d --build frontend`
6. 3초 후 HTTP 응답 확인, 첫 시도 포함 최대 5회 시도

Compose 명령은 `--no-deps`를 사용하지 않으며 frontend의 backend/fastapi 의존 서비스도 시작 대상이 될 수 있습니다. 백엔드 DB 환경을 먼저 준비합니다. 호스트 Nginx 중지 권한이 없어도 스크립트는 진행하므로 포트 충돌 여부를 확인합니다.

실제 프론트 이미지는 EC2의 Docker 빌드에서 다시 생성됩니다. Dockerfile은 `src/`를 복사하고 Vite를 실행하며 다운로드한 `dist/`를 그대로 복사하지 않습니다. 호스트 `.env.*`, `public/`도 빌드에 복사되지 않습니다. EC2의 CPU·메모리와 패키지 다운로드 접근이 필요합니다.

## 헬스체크와 서비스 교체

다음 중 하나가 성공하면 배포 성공으로 처리합니다.

- 호스트 `http://127.0.0.1/` 요청
- 호스트 `https://127.0.0.1/` 요청 (인증서 검증 생략)
- 컨테이너 내부 `wget http://127.0.0.1/`

실패 간격은 2초이며 최종 실패 시 로그 50줄을 출력하고 종료 코드 1을 반환합니다. HTTP 301도 성공으로 취급될 수 있고, 백엔드 API·외부 도메인·인증서 유효성까지 검사하지 않습니다.

단일 `travel-frontend` 컨테이너를 교체하므로 중단이 발생할 수 있습니다. 롤링 배포·자동 롤백은 없습니다. 백업은 checkout 이후 작업 폴더 내용이므로 이전 운영 버전을 보장하지 않으며, 러너 정리로 제거될 수 있습니다. 정상 커밋이나 이미지는 별도로 보관합니다.

## Nginx 및 HTTPS

엔트리포인트는 인증서가 있으면 `nginx_ssl.conf`, 없으면 `nginx_http.conf`를 적용합니다. 443 포트를 공개하는 것만으로 HTTPS가 켜지지는 않습니다.

- `/api/` → `http://backend:3001`
- `/fastapi/` → 접두사 제거 후 `http://fastapi:8000`
- `/.well-known/acme-challenge/` → `/var/www/certbot`

현재 배포는 rsync로 호스트 웹 루트를 동기화하지 않습니다. [인프라·인증서 설정](../README.md)의 Compose 마운트와 Certbot webroot 안내를 사용합니다.

```bash
docker compose ps
docker compose logs --tail=100 frontend
docker exec travel-frontend nginx -t
```

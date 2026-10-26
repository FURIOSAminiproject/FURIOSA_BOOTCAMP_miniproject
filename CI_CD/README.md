# CI/CD 및 인프라 운영 안내

## 외부 ORS API 사용 — 2026-10-26

경로 조회는 기존 NestJS의 외부 HeiGIT ORS API 연동과 DB 캐시를 사용합니다. 자체 ORS용 파이프라인·배포 스크립트·Compose 확장을 제거했습니다. ORS는 NestJS의 일반 빌드·테스트·배포에 포함되며 별도 OSM 다운로드나 Java 경로 엔진 기동은 없습니다.

서버 환경에 `ORS_API_KEY`를 준비합니다. 키는 서버에서만 사용하며 실제 검사는 캐시 미스 때 수행합니다. [API 설정과 캐시 동작](../BackEnd/NestJS/src/routing-cache/README.md), [기존 자체 컨테이너 중지](../Docker/README.md#기존-자체-ors-중지)를 참고합니다.

현재 자동 배포는 GitHub Actions에서 검증한 뒤 EC2 Self-hosted 러너에서 Docker Compose 이미지를 다시 빌드하고 컨테이너를 교체하는 방식입니다. 단일 컨테이너 교체에 따른 일시 중단이 가능하며 자동 롤백은 없습니다.

AI가 이 폴더를 수정할 때는 [작업 지침](AGENTS.md)을 먼저 읽고, [코드 검토 기록](REVIEW.md)에서 알려진 문제와 검증 범위를 확인합니다.

## 배포 구성

```text
인터넷 :80 / :443 → travel-frontend (Nginx)
                     ├─ /          → React 정적 번들
                     ├─ /api/      → backend:3001
                     └─ /fastapi/  → fastapi:8000 (접두사 제거)
호스트 127.0.0.1:3001 → travel-backend
호스트 127.0.0.1:8000 → travel-fastapi
travel-backend        → 별도로 준비한 PostgreSQL
```

세 서비스는 Compose의 `travel-network`를 사용합니다. DB 컨테이너는 정의되어 있지 않습니다. 컨테이너에서 `127.0.0.1`은 자기 자신이므로 호스트 DB는 `host.docker.internal` 또는 접근 가능한 DB 주소를 지정합니다.

| 서비스 | 이미지/런타임 | 공개 포트 |
|---|---|---|
| frontend | Node 22 빌드 → `nginx:alpine` | 80, 443 |
| backend | `node:22-alpine`, `node dist/main.js` | 호스트 루프백 3001 |
| fastapi | `python:3.12-slim`, Uvicorn | 호스트 루프백 8000 |

모든 서비스에 `restart: always`가 적용됩니다. 프로세스 종료에 대한 재시작 정책이며, HTTP 실패 시 즉시 복구하거나 무중단을 보장하는 정책은 아닙니다. FastAPI만 Dockerfile HEALTHCHECK가 있고, Compose의 `depends_on`은 서비스 준비 상태까지 기다리도록 설정되어 있지 않습니다.

## 워크플로우

모두 `main` push의 경로 조건 또는 `workflow_dispatch`로 실행됩니다. 각 워크플로우는 자기 파일 변경도 감지합니다.

| 워크플로우 | 감시 경로 | 클라우드 검증 | EC2 스크립트 |
|---|---|---|---|
| [deploy.yml](../.github/workflows/deploy.yml) | `FrontEnd/**`, `CI_CD/FrontEnd/**`, `CI_CD/BackEnd/nestjs/prepare-env.sh` | Node 22, npm ci, Vite 빌드 | [FrontEnd/deploy.sh](FrontEnd/deploy.sh) |
| [deploy_backend.yml](../.github/workflows/deploy_backend.yml) | `BackEnd/NestJS/**`, `CI_CD/BackEnd/nestjs/**` | Node 22, npm ci, 테스트, TS 빌드 | [BackEnd/nestjs/deploy.sh](BackEnd/nestjs/deploy.sh) |
| [deploy_fastapi.yml](../.github/workflows/deploy_fastapi.yml) | `BackEnd/FastAPI/**`, `CI_CD/BackEnd/fastapi/**` | Python 3.12, 의존성, 문법·임포트 검사 | [BackEnd/fastapi/deploy.sh](BackEnd/fastapi/deploy.sh) |

루트 `docker-compose.yml`, `CI_CD/nginx_https.conf`, `BackEnd/` 루트 NestJS 파일만 바뀌면 현재 push 경로 조건으로는 배포되지 않습니다. 필요한 워크플로우를 수동 실행합니다.

빌드 잡은 `ubuntu-latest`, 배포 잡은 `[self-hosted, linux]`입니다. 프론트/NestJS는 각각 `frontend-dist`/`backend-dist`를 업로드·다운로드하지만 실제 이미지는 EC2에서 Dockerfile로 소스를 다시 빌드합니다. 다운로드한 `dist/`를 그대로 최종 이미지에 넣는 구조는 아닙니다. EC2에도 빌드 리소스와 이미지·패키지 다운로드 접근이 필요합니다.

동시성 그룹은 `frontend-production`, `backend-production`, `fastapi-production`으로 서로 다릅니다. 같은 그룹의 동시 실행을 제한하고 `cancel-in-progress: false`로 실행 중 작업의 자동 취소를 끕니다. 이 설정을 모든 push가 순서대로 배포되는 대기열로 해석하지 않습니다. 세 파이프라인 사이의 동시 실행은 막지 않습니다.

## EC2 및 Self-hosted 러너 준비

1. Git, curl, tar, Python 3, Docker Engine 및 Docker Compose 플러그인을 준비합니다. `env_file.required: false` 구문을 지원하는 Compose 2.24.0 이상을 사용합니다.
2. Docker 데몬을 시작하고 러너 실행 계정에 Docker 사용 권한을 부여합니다.
3. GitHub 저장소 Settings → Actions → Runners에서 서버 아키텍처에 맞는 러너 다운로드·등록 명령을 확인합니다. 등록 토큰은 저장소에 기록하지 않습니다.
4. 러너에 `self-hosted`, `linux` 라벨이 있는지 확인하고 서비스로 실행합니다.
5. 러너가 체크아웃하는 경로와 별개로 환경 파일·인증서를 보관합니다. 예시 작업 경로는 `/home/ec2-user/actions-runner/_work/FURIOSA_BOOTCAMP_miniproject/FURIOSA_BOOTCAMP_miniproject`이며 설치 위치에 따라 달라집니다.

```bash
docker --version
docker compose version
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

그룹 변경 후 러너 프로세스에도 새 권한이 적용되도록 세션 또는 서비스를 재시작합니다. 프론트 배포 스크립트는 호스트 Nginx가 실행 중이면 `sudo systemctl stop/disable nginx`를 시도합니다. 실패는 무시되므로 권한 부족 시 포트 충돌이 남을 수 있습니다.

## 환경 파일

Compose의 `APP_ENV` 기본값은 `production`입니다. `local`, `development`, `production`으로 지정합니다.

| 대상 | 읽는 파일 | 비고 |
|---|---|---|
| NestJS 컨테이너 | `BackEnd/NestJS/.env.${APP_ENV}` | Compose가 변수로 주입, 파일은 선택적이나 DB 값은 앱 기동에 필수 |
| FastAPI 컨테이너 | `BackEnd/FastAPI/.env` | APP_ENV별 파일 자동 선택 없음 |
| FrontEnd 이미지 | Dockerfile이 생성한 기본 `.env.${APP_ENV}` | 호스트 `.env.*`는 이미지로 복사하지 않음 |

FrontEnd와 NestJS 배포는 공통 [prepare-env.sh](BackEnd/nestjs/prepare-env.sh)를 호스트 서비스 중지·백업·컨테이너 교체 전에 실행합니다. 대상 환경 파일이 없으면 다음 순서로 찾아 권한 600으로 복사합니다. 기존 작업 폴더 파일은 덮어쓰지 않습니다. 전부 없으면 배포를 중단합니다.

1. `/home/ec2-user/.env.${APP_ENV}`
2. `/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/NestJS/.env.${APP_ENV}`
3. `/home/ec2-user/FURIOSA_BOOTCAMP_miniproject/BackEnd/.env.${APP_ENV}`
4. `$HOME/.env.${APP_ENV}`

Compose가 실제 주입할 DB_HOST·DB_NAME·DB_USER·DB_PASSWORD, 공백을 제외한 32자 이상 JWT_SECRET, DB_PORT 범위, DB_SSL 값을 검사합니다. 파일을 shell로 실행하거나 설정값을 출력하지 않습니다. Compose 해석 오류의 상세 내용도 비밀값 노출을 피하기 위해 출력하지 않으므로, 실패하면 파일 문법과 필수 항목을 별도로 확인합니다. DB 접속·OAuth 공급자 설정까지 검증하는 것은 아닙니다.

홈 경로에 보관한 파일은 권한을 제한합니다. FastAPI 배포에는 위와 같은 외부 환경 파일 자동 복사 로직이 없으므로 설정이 필요하면 배포 전에 별도로 준비합니다. 다른 워크플로우의 checkout으로 작업 폴더 파일이 정리될 수 있으므로 워크스페이스만 영구 보관 장소로 사용하지 않습니다.

Compose가 NestJS에 `HOST=0.0.0.0`, `PORT=3001`, `APP_ENV`, `NODE_ENV`를 명시하며 env_file 값보다 우선합니다. `NODE_ENV` 기본값은 APP_ENV와 별개로 `production`입니다.

## 수동 배포

저장소 루트에서 환경 파일을 준비한 후 실행합니다.

```bash
APP_ENV=production docker compose up -d --build
# 개발 환경
APP_ENV=development docker compose up -d --build
```

PowerShell:

```powershell
$env:APP_ENV="production"
docker compose up -d --build
```

## HTTPS와 인증서

현재 웹 서버는 컨테이너 Nginx입니다. 호스트 Nginx를 함께 80/443에 실행하면 충돌합니다. [nginx_https.conf](nginx_https.conf)는 호스트 Nginx용 별도 템플릿이며 현재 Compose에서는 사용하지 않습니다. 해당 템플릿은 `/api/`만 프록시하고 `/fastapi/` 경로는 포함하지 않습니다.

Compose는 아래 호스트 경로를 읽기 전용으로 마운트합니다.

| 변수 | 호스트 기본 경로 | 컨테이너 경로 |
|---|---|---|
| SSL_CERT_PATH | `/etc/letsencrypt` | `/etc/letsencrypt` |
| CERTBOT_WWW_PATH | `/var/www/certbot` | `/var/www/certbot` |

`FrontEnd/v1/docker-entrypoint.sh`가 시작 시 `live/` 아래 인증서·개인키를 찾으면 HTTPS와 HTTP→HTTPS 리다이렉트를 활성화합니다. 없으면 HTTP만 제공합니다. 여러 도메인이 있을 때 선택할 인증서를 지정하는 기능은 없으므로 감지 결과를 로그에서 확인합니다. 인증서 파일과 키는 같은 인증서 쌍이어야 합니다.

호스트에 Certbot을 준비하고 도메인 DNS와 80 포트 접근을 확인한 뒤 webroot 방식으로 발급합니다. 기본 마운트 경로 예시입니다.

```bash
sudo mkdir -p /var/www/certbot
docker compose up -d --build
sudo certbot certonly --webroot -w /var/www/certbot -d your-service-domain.com
# 최초 발급 후 시작 스크립트가 HTTPS 설정을 선택하도록 재시작
docker compose restart frontend
sudo certbot renew --dry-run
```

갱신 자동 실행과 배포 훅은 저장소가 설치하지 않습니다. 호스트에서 별도로 설정합니다. HTTPS 모드로 실행 중인 컨테이너는 갱신 후 `docker exec travel-frontend nginx -s reload`로 인증서를 다시 읽게 할 수 있습니다. 처음 HTTP에서 HTTPS로 전환하거나 인증서 경로가 달라지면 `docker compose restart frontend`로 템플릿 선택을 다시 수행합니다. 커스텀 마운트 경로를 쓰면 Certbot webroot도 해당 호스트 경로에 맞춥니다.

EC2의 이전 IP 인증서는 [IP 인증서 폐기 도구](certificates/README.md)로 점검·폐기 요청할 수 있습니다. 기본은 읽기 전용이며 `--apply`로 적용합니다. 현재 할당 IP는 유지하고, Stop/EIP 해제 전에는 `--retire-current-ip`을 명시합니다. 적용 시 해당 인증서의 자동 갱신을 끄고 로컬 차단 표시를 남깁니다. 주기 점검은 [IP·도메인 인증서 감시 설치 안내](certificates/MONITOR.md)를 따릅니다. 설치 후 systemd timer가 약 5분마다 관측하며, 반복 확인 뒤 갱신 차단·Nginx 재시작·CA 폐기 요청을 수행합니다. 신규 발급·정상 갱신·DDNS 갱신은 별도 구성입니다.

## 헬스체크·백업·복구

배포 스크립트는 기동 후 3초 대기하고 첫 시도를 포함해 최대 5회, 실패 사이 2초 간격으로 HTTP 응답을 확인합니다. 호스트 요청 실패 시 컨테이너 내부 요청도 시도합니다. 각 HTTP 요청의 최대 소요 시간을 별도로 제한하지 않으므로 전체 검증 시간이 고정되어 있지는 않습니다.

- FrontEnd: HTTP, HTTPS 또는 컨테이너 wget 응답. HTTP 리다이렉트도 성공으로 판정될 수 있어 외부 HTTPS나 API 연동까지 검증하지 않습니다.
- NestJS: `/api/health`. DB 쿼리 검증은 별도 `/api/health/db`로 수행합니다.
- FastAPI: `/health`. 실제 모델 추론을 검증하는 검사가 아닙니다.

실패 시 최근 로그 50줄을 출력하고 종료 코드 1을 반환합니다. 이전 이미지로 자동 복원하지 않습니다.

백업은 `backups/frontend`, `backups/backend`, `backups/fastapi`에 tar.gz로 생성하며 각 종류 최신 1개만 유지합니다. `.env*`와 의존성 폴더 등은 제외합니다. 백업 시점은 checkout 및 아티팩트 다운로드 이후이므로 압축 대상은 현재 작업 폴더이며 이전 운영 버전을 보장하지 않습니다. 러너 cleanup으로 백업도 제거될 수 있습니다. 확실한 복구에는 별도로 보관한 정상 커밋·이미지와 환경 파일이 필요합니다.

## 운영 점검

```bash
docker compose ps
docker compose logs --tail=100 frontend backend fastapi
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/health/db
curl http://127.0.0.1:8000/health
docker exec travel-frontend nginx -t
```

보안 그룹은 서비스 웹 포트 80/443, 관리자 SSH와 필요한 DB 접근 범위에 맞춰 설정합니다. 3001/8000은 Compose에서 호스트 루프백에만 공개합니다. 502 발생 시 컨테이너 상태·DNS·실제 DB 연결을 확인합니다. Compose가 HOST를 덮어쓰므로 환경 파일 HOST만 수정해서 Compose 바인딩을 바꾸지는 못합니다.

- [FrontEnd 배포](FrontEnd/README.md)
- [백엔드 배포 구성](BackEnd/README.md)
- [Docker 실행 및 네트워크](../Docker/README.md)

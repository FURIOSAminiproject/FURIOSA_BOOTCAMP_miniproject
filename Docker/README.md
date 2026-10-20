# Docker 및 Docker Compose 실행 안내

이 저장소는 FrontEnd Nginx, NestJS, FastAPI를 하나의 Compose 네트워크로 실행합니다. PostgreSQL은 포함하지 않으므로 별도로 준비합니다.

구성 변경 전에는 [작업 지침](AGENTS.md)과 [구현 검토 기록](REVIEW.md)을 확인합니다. 실제 설정 파일은 저장소 루트와 각 서비스 폴더에 있습니다.

## 기본 개념

- 이미지: Dockerfile로 빌드한 실행 파일·런타임 묶음입니다.
- 컨테이너: 이미지에서 시작한 격리 프로세스입니다. 로컬 소스를 수정해도 실행 중인 이미지에 자동 반영되지 않습니다.
- Dockerfile: 베이스 이미지, 복사할 파일, 설치·빌드·실행 명령을 정의합니다.
- Compose: 여러 서비스의 빌드·환경변수·네트워크·포트·마운트를 정의합니다.

컨테이너는 런타임 차이를 줄이지만 DB·인증서·네트워크·CPU 아키텍처 등 외부 조건까지 동일하게 만드는 것은 아닙니다.

## 실제 서비스 구성

기준 파일은 [docker-compose.yml](../docker-compose.yml)입니다.

| 서비스 | 컨테이너 이름 | 빌드 경로 | 호스트 포트 |
|---|---|---|---|
| frontend | travel-frontend | `FrontEnd/v1/` | `80:80`, `443:443` |
| backend | travel-backend | `BackEnd/NestJS/` | `127.0.0.1:3001:3001` |
| fastapi | travel-fastapi | `BackEnd/FastAPI/` | `127.0.0.1:8000:8000` |

Compose는 `travel-network` 브리지 네트워크를 생성합니다. 컨테이너는 `backend`, `fastapi` 서비스명으로 통신합니다. 실제 Docker 네트워크 이름에는 Compose 프로젝트 접두사가 붙을 수 있습니다.

```text
브라우저 → frontend:80 또는 :443
             ├─ /          → React 번들
             ├─ /api/      → http://backend:3001
             └─ /fastapi/  → http://fastapi:8000 (접두사 제거)
backend → 호스트 또는 외부 PostgreSQL
```

컨테이너에서 `127.0.0.1`은 해당 컨테이너 자신입니다. 프론트를 단독 `docker run`으로 띄우면 공유 네트워크와 backend/fastapi 서비스명 연결이 없어 API 요청이 실패할 수 있습니다. 전체 연동에는 Compose를 사용합니다.

모든 서비스는 `restart: always`입니다. FastAPI에는 Docker HEALTHCHECK가 있지만 frontend/backend에는 없습니다. frontend의 `depends_on`은 backend/fastapi 시작 순서만 지정하며 준비 완료를 기다리는 조건은 없습니다.

## 이미지 빌드와 실행

| 구성 | 빌드·실행 방식 |
|---|---|
| FrontEnd | Node 22 Alpine에서 npm ci와 Vite 빌드 → nginx:alpine으로 정적 서빙 |
| NestJS | Node 22 Alpine에서 TypeScript 컴파일 → 운영 의존성만 설치한 이미지에서 `node dist/main.js` |
| FastAPI | Python 3.12 Slim에 의존성과 소스 복사 → 비루트 appuser로 Uvicorn :8000 |

프론트 Dockerfile은 `src/`를 복사하며 호스트의 `public/`, `.env.*`, `dist/`를 최종 번들 입력으로 복사하지 않습니다. 이미지 내부의 기본 환경 파일은 Dockerfile에서 생성합니다. 실제 Nginx 프록시는 `nginx_http.conf`/`nginx_ssl.conf`에 지정되어 있어 `BACKEND_URL`만 바꿔도 바뀌지 않습니다.

NestJS는 소스를 다시 컴파일하고 `.env`를 이미지에 복사하지 않습니다. 실행 시 시작 스크립트를 거치지 않으므로 DB 설정은 컨테이너 환경변수로 전달해야 합니다. `.dockerignore`와 각 Dockerfile의 COPY 범위가 실제 이미지 입력을 결정합니다.

`nginx:alpine`은 특정 Nginx 버전으로 고정된 태그가 아닙니다. Node/Python 이미지도 지정된 태그 범위 내에서 변경될 수 있습니다.

## 환경 설정

`APP_ENV`는 `local`, `development`, `production`으로 지정하며 기본은 production입니다.

| 구성 | APP_ENV 적용 |
|---|---|
| FrontEnd | Docker 빌드 인수로 전달해 build:local / build:dev / build:prod 선택 |
| NestJS | 빌드 인수 및 런타임 환경변수, `BackEnd/NestJS/.env.${APP_ENV}` 선택 |
| FastAPI | 런타임 APP_ENV 표시, 파일은 항상 `BackEnd/FastAPI/.env` |

Compose env_file은 `required: false`이므로 파일 누락 자체를 막지 않습니다. 하지만 NestJS는 필수 DB 값이 없으면 시작하지 못합니다. `env_file.required`를 지원하는 Docker Compose 2.24.0 이상을 준비합니다.

예를 들어 로컬 실행은 `BackEnd/NestJS/.env.local`을 만듭니다.

```env
DB_HOST=host.docker.internal
DB_PORT=5432
DB_NAME=travel_local
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_SSL=false
ENABLE_TLS=false
```

Compose는 backend의 `HOST=0.0.0.0`, `PORT=3001`, `APP_ENV`, `NODE_ENV`를 명시해 env_file보다 우선 적용합니다. NODE_ENV 기본값은 APP_ENV와 무관하게 production입니다. Compose 직접 실행은 시작 스크립트의 DB_NAME 기본값을 적용하지 않으므로 환경 파일에 DB_NAME을 명시합니다.

backend에는 `host.docker.internal:host-gateway`가 설정되어 Linux에서도 호스트로 연결할 수 있습니다. PostgreSQL이 해당 인터페이스에서 수신하고 접근을 허용해야 합니다. 원격 DB에는 실제 접근 가능한 주소를 사용합니다.

## 실행

Docker Engine 또는 Docker Desktop과 Compose를 준비하고 저장소 루트에서 실행합니다.

```bash
docker --version
docker compose version
# 로컬 환경
APP_ENV=local docker compose up -d --build
# 개발 환경
APP_ENV=development docker compose up -d --build
# 운영 환경 (기본)
APP_ENV=production docker compose up -d --build
```

PowerShell에서는 실행할 환경을 선택합니다.

```powershell
$env:APP_ENV="local"
docker compose up -d --build
```

인증서가 없으면 `http://localhost`로 접속합니다. HTTPS가 활성화된 서버는 인증서 도메인으로 접속합니다. 호스트 80/443을 사용하는 다른 웹 서버와 충돌하지 않게 합니다.

`-d`는 백그라운드 실행, `--build`는 소스 변경을 반영한 이미지 빌드입니다. 단일 컨테이너를 교체하므로 일시 중단이 가능하며 자동 롤백은 없습니다.

## 인증서 마운트 및 HTTPS

Compose 기본 마운트:

- `${SSL_CERT_PATH:-/etc/letsencrypt}` → `/etc/letsencrypt:ro`
- `${CERTBOT_WWW_PATH:-/var/www/certbot}` → `/var/www/certbot:ro`

Windows에서는 필요에 따라 위 환경변수를 실제 호스트 디렉토리로 지정합니다. 인증서 디렉토리만 공유해도 개인키의 상대 심볼릭 링크가 끊길 수 있으므로 Let's Encrypt 전체 디렉토리를 마운트합니다.

프론트 시작 스크립트가 `live/` 아래 인증서와 키를 발견하면 HTTPS 템플릿을 적용하고 HTTP를 HTTPS로 리다이렉트합니다. 없으면 HTTP 템플릿을 적용합니다. 최초 발급 뒤에는 frontend를 재시작해 모드를 다시 선택하게 합니다. `/fastapi/`와 `/api/`는 두 모드 모두 HTTP upstream으로 연결합니다.

인증서와 키는 동일 lineage에서 함께 선택합니다. [IP 인증서 폐기 도구](../CI_CD/certificates/README.md)가 남긴 차단 해시와 같은 cert.pem은 제외합니다. 새 진입점이 포함된 이미지로 반영한 후 컨테이너를 재시작해야 적용되며, 실행 중인 Nginx를 도구가 자동 갱신하지는 않습니다. 사용 가능한 다른 쌍이 없으면 HTTP로 시작합니다. 도메인·현재 IP·만료 여부까지 검증해 선택하는 기능은 아닙니다.

인증서 발급·갱신은 호스트에서 별도로 수행하며 저장소가 스케줄이나 갱신 훅을 설치하지 않습니다. [인프라·Certbot 안내](../CI_CD/README.md)를 따릅니다. `CI_CD/nginx_https.conf`는 현재 Compose가 사용하지 않는 호스트 Nginx용 템플릿입니다.

## 상태·로그·진단

```bash
docker compose ps
docker compose logs -f
docker compose logs --tail=100 backend
docker exec travel-frontend nginx -t
curl http://127.0.0.1:3001/api/health
curl http://127.0.0.1:3001/api/health/db
curl http://127.0.0.1:8000/health
```

NestJS `/api/health`는 DB 쿼리를 수행하지 않으므로 `/api/health/db`와 구분합니다. FastAPI `/health`도 모델 추론 검사가 아닙니다.

```bash
# 최초 인증서 발급 후 HTTPS 템플릿을 다시 선택하도록 재시작
docker compose restart frontend
# 환경 파일 변경 반영: 선택한 APP_ENV로 재생성
APP_ENV=local docker compose up -d --force-recreate backend
# 전체 컨테이너 종료 및 네트워크 제거
docker compose down
```

`restart`만으로 변경된 env_file을 다시 주입하지는 않습니다. DB는 Compose 외부에 있으며 이 저장소에는 DB 볼륨이 정의되어 있지 않습니다.

## 문제 해결

- 502: backend/fastapi 상태와 로그, 서비스명 DNS, upstream HTTP 연결을 확인합니다. Compose가 HOST를 강제로 0.0.0.0으로 지정하므로 env 파일 HOST 변경만으로 해결되는 문제인지 먼저 구분합니다.
- DB 연결 실패: 컨테이너 안의 localhost 사용 여부, PostgreSQL 수신 주소, 인증·접근 허용 범위를 확인합니다.
- 포트 점유: 호스트 Nginx/IIS/다른 컨테이너를 확인합니다. HTTP만 임시 변경하려면 Compose의 frontend 매핑을 `8080:80` 등으로 바꿀 수 있으나 HTTPS 리다이렉트·443 매핑도 함께 고려합니다.
- 코드 미반영: `docker compose up -d --build`로 재빌드합니다. 캐시 문제가 확인된 경우에만 `docker compose build --no-cache`를 사용합니다.
- `unhealthy`: FastAPI 로그와 `/health` 응답을 확인합니다. 상태가 unhealthy라는 이유만으로 자동 재시작하지는 않습니다.

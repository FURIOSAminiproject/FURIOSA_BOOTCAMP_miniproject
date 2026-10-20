# Docker 문서·구성 작업 지침

이 파일의 자동 적용 범위는 `Docker/`다. 실제 Dockerfile·Nginx·Compose는 이 폴더 밖에 있으므로 연결된 파일과 해당 폴더의 AGENTS.md를 명시적으로 함께 읽는다. 이 파일을 만들었다는 이유로 다른 폴더에 자동 적용된다고 가정하지 않는다.

## 실제 기준 파일

1. [README.md](README.md), [REVIEW.md](REVIEW.md): 구성·실행 방법·확인된 문제.
2. 루트 [docker-compose.yml](../docker-compose.yml): 빌드 컨텍스트, 환경, 포트, 네트워크, 마운트, 의존성.
3. [FrontEnd/Dockerfile](../FrontEnd/Dockerfile), [BackEnd/NestJS/Dockerfile](../BackEnd/NestJS/Dockerfile), [BackEnd/FastAPI/Dockerfile](../BackEnd/FastAPI/Dockerfile) 및 각 .dockerignore.
4. `FrontEnd/docker-entrypoint.sh`, `nginx_http.conf`, `nginx_ssl.conf`, `nginx.conf`: 실제 웹 서버 설정 선택·프록시.
5. 배포 변경 시 CI_CD와 .github/workflows의 호출 경로·AGENTS.md.

`BackEnd/Dockerfile`은 현재 Compose backend 대상이 아니다. `CI_CD/nginx_https.conf`는 현재 컨테이너가 사용하지 않는 호스트 Nginx 템플릿이다.

## 유지해야 할 이해

- 서비스는 frontend/backend/fastapi이며 PostgreSQL·Certbot·모델 서버 컨테이너는 정의되어 있지 않다. 설명 주석의 NPU 문구만으로 추론 서버라고 판단하지 않는다.
- frontend는 Node 22 빌드 → Nginx 정적 서빙, backend는 Node 22 컴파일 → `node dist/main.js`, fastapi는 Python 3.12 Uvicorn이다. 호스트 dist를 그대로 사용하는 방식이 아니다.
- frontend Dockerfile은 public/와 .env.*를 복사하지 않는다. COPY와 .dockerignore를 모두 확인해야 이미지 입력을 알 수 있다.
- backend는 `.env.${APP_ENV}`를 선택적으로 주입받고 start.cjs의 환경 로딩·DB_NAME 기본값은 적용하지 않는다. Compose의 HOST/PORT/APP_ENV/NODE_ENV가 env_file 값보다 우선한다.
- APP_ENV 기본은 production이며 로컬은 명시적으로 선택한다. 인증서 존재는 frontend HTTP/HTTPS 템플릿 선택에만 쓰인다. OS나 AWS 자동 감지·환경 파일 자동 생성 기능은 없다.
- frontend 80/443은 호스트에 공개되고 backend 3001·fastapi 8000은 호스트 루프백에만 바인딩한다. 내부 통신은 서비스명과 travel-network를 사용한다.
- backend의 host.docker.internal은 호스트 DB 접근용이다. 컨테이너 localhost를 호스트로 해석하지 않는다.
- frontend depends_on은 service_started다. FastAPI에만 HEALTHCHECK가 있으며 unhealthy가 자동 재시작을 뜻하지 않는다.
- 고정 container_name과 호스트 포트 때문에 APP_ENV만 바꿔 여러 스택을 같은 호스트에 병렬 실행할 수 있다고 안내하지 않는다.

## TLS·프록시 확인

- 인증서 마운트는 Let's Encrypt 전체 디렉토리와 Certbot webroot다. 심볼릭 링크 대상까지 포함해야 한다.
- 시작 스크립트는 live 바로 아래 동일 lineage의 fullchain.pem/privkey.pem 쌍을 선택한다. 파일의 암호학적 짝 일치·만료·현재 IP까지 검증한 것으로 설명하지 않는다. IP 폐기 도구가 남긴 차단 해시와 같은 cert.pem은 제외한다.
- 양쪽 파일이 있으면 HTTPS 템플릿을 렌더링하고 nginx -t 후 시작한다. 설정 검사가 실패하면 중단하며 HTTP로 재시도하지 않는다. 파일이 없을 때의 HTTP 선택과 구분한다.
- 인증서 감지·설정 선택은 시작 시 수행한다. 발급·갱신 스케줄과 Nginx reload 훅은 설치되어 있지 않다.
- [IP 인증서 폐기 도구](../CI_CD/certificates/README.md)는 호스트에서 실행하는 별도 명령이다. 새 진입점이 포함된 이미지 배포와 폐기 후 재시작이 필요하다. 차단 표시가 성공한 CA 폐기를 뜻한다고 해석하지 않는다.
- `/api/` → backend:3001 HTTP, `/fastapi/` 접두사 제거 → fastapi:8000 HTTP다. Vite BACKEND_URL은 Nginx 대상을 바꾸지 않는다.
- HTTP/HTTPS 템플릿의 API·SPA·챌린지 경로를 함께 확인한다. 직접 백엔드 TLS를 바꾸면 upstream과 헬스체크도 검토한다.

## 검증·문서 갱신

저장소 루트에서 `docker compose config --no-env-resolution --format json`으로 구조를 확인한다. local/development/production 각각의 선택 경로·환경·포트·마운트를 확인하고 전체 설정 출력에 비밀값을 포함해 공유하지 않는다. `env_file.required`는 Compose 2.24.0 이상이 필요하다.

문법 검사, 모킹한 엔트리포인트 분기, 실제 nginx -t, 이미지 빌드, 통합 컨테이너 기동은 서로 다른 검증이다. 실제로 수행한 수준만 보고한다. 검토를 위해 운영 컨테이너 교체나 인증서 발급을 실행하지 않는다. 구현 변경 시 Docker README·REVIEW 및 영향을 받는 FrontEnd/BackEnd/CI_CD 문서를 갱신한다.

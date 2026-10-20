# CI_CD 작업 지침

이 파일은 `CI_CD/`와 하위 폴더의 코드·문서를 수정할 때 적용한다. 사용자의 현재 요청을 우선하고, 아래 실행 경로와 검증 기준을 사용한다.

## 먼저 읽을 파일

1. [README.md](README.md)에서 운영 흐름을 확인한다.
2. [REVIEW.md](REVIEW.md)에서 확인된 문제와 검증 범위를 읽고, 수정 대상 코드에서 해당 상태가 여전히 맞는지 확인한다.
3. 작업할 서비스의 README, build.sh, deploy.sh와 연결된 워크플로우·Dockerfile을 함께 읽는다.

문서나 코드 주석만으로 실제 동작을 단정하지 않는다. 워크플로우가 호출하는 스크립트와 Compose의 실제 빌드·실행 설정을 추적한다.

## 실제 실행 경로

이 표의 경로는 저장소 루트 기준이다.

| 서비스 | 워크플로우 | 호출하는 스크립트 | Compose 빌드 경로 / 서비스 |
|---|---|---|---|
| FrontEnd | `.github/workflows/deploy.yml` | `CI_CD/FrontEnd/{build,deploy}.sh` | `FrontEnd/` / `frontend` |
| NestJS | `.github/workflows/deploy_backend.yml` | `CI_CD/BackEnd/nestjs/{build,deploy}.sh` | `BackEnd/nestjs/` / `backend` |
| FastAPI | `.github/workflows/deploy_fastapi.yml` | `CI_CD/BackEnd/fastapi/{build,deploy}.sh` | `BackEnd/fastapi/` / `fastapi` |

- `CI_CD/BackEnd/build.sh`와 `deploy.sh`는 현재 워크플로우에서 호출하지 않는다. 이 파일들은 `BackEnd/` 루트의 별도 NestJS 구성을 확인하지만 Compose는 `BackEnd/nestjs/`를 배포한다. 둘을 같은 경로로 취급하지 않는다.
- `CI_CD/nginx_https.conf`는 호스트 Nginx용 별도 템플릿이다. 현재 frontend 이미지가 실제로 사용하는 파일은 `FrontEnd/nginx_http.conf`, `nginx_ssl.conf`, `docker-entrypoint.sh`이다.
- FrontEnd/NestJS 아티팩트는 EC2로 다운로드되지만 최종 이미지는 EC2에서 Dockerfile로 다시 빌드한다. 검증한 dist가 그대로 배포된다고 설명하지 않는다.

## 변경 시 함께 확인할 범위

| 변경 대상 | 함께 확인할 파일·동작 |
|---|---|
| build.sh | 대상 package.json/잠금 파일 또는 requirements.txt, 워크플로우 런타임, 산출물 경로, Docker 빌드 명령 |
| deploy.sh | 워크플로우 checkout·아티팩트 단계, Compose 서비스·의존성·환경 파일, 서비스 중지 순서, 실패 처리 |
| 배포 감시 경로 | 해당 서비스 소스, 스크립트, 워크플로우 자체, 공유 Compose 설정 변경의 영향 |
| TLS·프록시 | frontend 엔트리포인트와 두 Nginx 템플릿, Compose 마운트·포트, backend 프로토콜, HTTP-01 경로 |
| 헬스체크 | 실제 엔드포인트, 기대 HTTP 상태·응답, 리다이렉트, 타임아웃, 확인 대상 컨테이너 |
| 백업·복구 | checkout 이전/이후 중 어느 시점인지, 압축 대상, 제외 파일, 보관 위치·수명, 실패 시 복원 동작 |

워크플로우와 Compose가 다른 폴더에 있다는 이유로 연관 검토를 생략하지 않는다. 작업 범위에 필요한 변경만 수행하고 서비스 소스의 중복 구성을 임의로 합치거나 삭제하지 않는다.

## 환경과 TLS

- 배포 스크립트의 APP_ENV 기본값은 production이다. AWS·Windows 또는 인증서 유무를 보고 DB 환경을 자동 선택하지 않는다. 작업할 환경을 명시한다.
- NestJS의 Compose 환경 파일은 `BackEnd/nestjs/.env.${APP_ENV}`이다. NestJS 배포 스크립트만 외부 후보 경로에서 해당 파일을 복사한다.
- frontend 배포는 backend/fastapi 의존 서비스도 시작·재생성할 수 있다. backend 환경 파일 준비와 기존 서비스에 미칠 영향을 확인한다.
- FastAPI는 `BackEnd/fastapi/.env`를 사용하며 현재 외부 경로 자동 복사 기능은 없다.
- Compose의 명시적 environment는 env_file보다 우선한다. backend의 HOST·PORT·APP_ENV·NODE_ENV를 변경할 때 양쪽을 확인한다.
- Docker Nginx의 TLS 선택은 시작 시 마운트된 인증서·키 파일 존재에 따른다. 최초 발급 후에는 템플릿을 다시 선택하도록 재시작해야 한다.
- 정상적인 Compose 구성은 Nginx에서 TLS를 종료하고 내부 API에는 HTTP로 연결한다. 외부 HTTPS를 켜기 위해 NestJS 직접 HTTPS까지 함께 켜지 않는다.
- 환경 파일·키·비밀번호를 문서, 커밋, 터미널 출력에 포함하지 않는다. Compose 검증 결과도 필요한 구조·필드만 추려 출력한다.

## 스크립트 수정 규칙

- IP 인증서 폐기 작업은 [certificates/README.md](certificates/README.md)와 revoke_ip_certificates.py를 읽는다. 기본 읽기 전용, IMDSv2 조회 실패 시 중단, 명시된 단일 IPv4 lineage만 적용, 갱신 비활성화·실패 상태 유지·성공 기록 구분을 보존한다. 검증 중 실제 CA 폐기 요청을 보내지 않는다.

- Bash의 `set -euo pipefail`과 경로 인용을 유지한다. 저장소 루트는 현재 터미널 위치가 아니라 BASH_SOURCE 기준으로 계산한다.
- 외부 명령의 실패가 성공으로 바뀌지 않게 한다. `|| true`는 무시해도 되는 실패인지 근거를 확인한다.
- 운영 서비스 중지·백업 삭제·컨테이너 교체의 순서를 검토한다. 빌드 실패·환경 파일 누락·헬스체크 실패 경로도 확인한다.
- 단일 컨테이너 교체를 무중단·롤링 배포로 설명하지 않는다. `restart: always`, Docker HEALTHCHECK, 배포 스크립트 HTTP 검사를 구분한다.
- `/api/health` 성공을 DB 쿼리 성공으로 취급하지 않는다. frontend HTTP 301이나 `curl -k` 성공을 외부 HTTPS·인증서 검증 성공으로 취급하지 않는다.
- 백업이 있다는 이유만으로 자동 롤백이나 이전 운영 버전 복원을 보장하지 않는다.

## 검증 방법

소스 검토나 문서 작업의 검증을 위해 실제 deploy.sh를 실행하지 않는다. 이 스크립트들은 호스트 Nginx 중지·백업 삭제·운영 컨테이너 교체를 수행할 수 있다. 실제 배포를 요청받았다면 지정된 환경과 기존 사용자 승인 범위에 따라 수행한다.

변경에 해당하는 검사만 선택한다.

1. 변경한 스크립트는 Bash가 있는 환경에서 `bash -n <스크립트 경로>`로 검사한다. PowerShell 구문 검사로 대체하지 않는다.
2. Compose 관련 변경은 저장소 루트에서 APP_ENV를 local/development/production으로 각각 지정하고 `docker compose config --no-env-resolution --format json`으로 경로·환경 파일·의존성·포트를 확인한다. 설정 전체를 출력하지 않는다.
3. 제어 흐름 변경은 격리한 임시 작업 폴더에서 docker/curl/systemctl/sudo/npm/pip 등 외부 명령을 모의 처리해 성공·실패를 검증한다. 명령 모의가 확실히 적용되었는지 확인한 뒤 실행한다.
4. build.sh 변경은 연결된 실제 빌드·테스트 명령으로 검증한다. 모의 npm/pip 성공을 실제 컴파일·패키지 설치 성공으로 보고하지 않는다.
5. Nginx 변경은 환경이 준비된 경우 인증서 있음/없음 두 설정을 `nginx -t`와 실제 요청으로 확인한다. 검사하지 못했다면 미검증으로 기록한다.
6. `git diff --check`로 형식을 확인하고, 결과 보고에 실제 실행·모의 실행·정적 검토를 구분한다.

ShellCheck/actionlint가 설치되어 있다면 관련 파일의 추가 검사에 활용한다. 도구가 없거나 실행이 제한되면 사실대로 기록한다.

## 문서 유지

- README는 운영 방법, 이 파일은 AI 작업 규칙, REVIEW는 특정 시점의 검토 결과를 담당한다.
- 동작을 바꾸면 해당 README와 REVIEW의 관련 항목을 함께 갱신한다. 해결하지 않은 문제를 해결 완료로 표시하지 않는다.
- 세부 함수·설정값을 여러 문서에 반복하기보다 기준 파일을 연결한다. 행 번호는 검토 당시 위치이므로 코드가 바뀌면 다시 확인한다.

# CI_CD 코드 검토 기록

- 검토일: 2026-10-19 (Asia/Seoul)
- 기준 커밋: `d0ed908`
- 범위: CI_CD의 셸 스크립트 8개, Nginx 템플릿 1개 및 README 5개. 호출 관계 확인을 위해 GitHub Actions 3개, 루트 Compose, 연결된 Dockerfile·frontend 엔트리포인트·Nginx 설정·package scripts·백엔드 헬스체크도 검토했다.
- 이번 작업: 코드 검토와 작업 지침 작성. 실행 코드·워크플로우·Compose는 변경하지 않았다.

이 기록은 실제 서버 장애 보고가 아니다. 아래에서 정적 확인, 로컬 재현, 명령 모의 실행을 구분한다. P1은 해당 조건에서 배포 장애·서비스 중단으로 이어질 수 있는 항목, P2는 배포 반영·검증·복구의 정확성을 저해하는 항목이다.

## 확인된 개선 항목

### C01 · P1 · frontend 단독 배포가 backend 환경 파일을 준비하지 않는다

- 근거: [FrontEnd/deploy.sh](FrontEnd/deploy.sh) 52행은 `docker compose up -d --build frontend`를 실행한다. [Compose](../docker-compose.yml)의 frontend는 backend/fastapi에 의존하고, backend env_file은 `required: false`다. 환경 파일 외부 복사는 [NestJS deploy.sh](BackEnd/nestjs/deploy.sh) 21~46행에만 있다.
- 발생 조건: 새 checkout 뒤 `BackEnd/NestJS/.env.production`이 없고 영구 파일은 EC2 홈에만 있는 상태에서 frontend 파이프라인만 실행한다. 같은 조건은 기존 env 파일이 checkout 정리로 제거된 경우에도 가능하다.
- 영향: Compose가 의존 backend를 시작·재생성할 때 DB 설정이 누락될 수 있다. 정적 화면의 응답만으로 frontend 배포가 성공 처리되면 API 장애를 놓칠 수 있다.
- 검증: 환경 파일이 없는 임시 폴더의 실제 `docker compose config`에서 DB_HOST·DB_NAME·DB_USER·DB_PASSWORD 4개 누락과 frontend의 두 의존성을 확인했다. 컨테이너를 실제 시작하지는 않았다.
- 개선 방향: 의존 서비스 설정을 배포 전에 함께 준비하거나, backend가 이미 준비되어 있다는 전제를 검사한 뒤 frontend만 교체하도록 배포 계약을 명확히 한다.

### C02 · P1 · 호스트 Nginx를 중지한 뒤 빌드 실패 시 복구하지 않는다

- 근거: [FrontEnd/deploy.sh](FrontEnd/deploy.sh) 24~25행의 stop/disable이 52행의 이미지 빌드·기동보다 먼저 실행된다. 빌드 실패를 복구하는 trap이나 재시작 분기는 없다.
- 발생 조건: 호스트 Nginx가 서비스를 제공 중이고, Docker Nginx 전환 중 빌드·포트 바인딩·컨테이너 시작이 실패한다.
- 영향: 기존 호스트 웹 서버가 중지·비활성화된 상태로 남을 수 있다. stop/disable의 실패는 `|| true`로 무시되어 포트 충돌이 남을 수도 있다.
- 검증: systemctl/sudo/docker를 모의 처리한 실행에서 stop이 먼저 호출되고, Compose 실패 코드 71로 종료하며 호스트 서비스 복구 호출이 없는 것을 확인했다. 실제 서비스를 중지하지 않았다.
- 개선 방향: 이미지와 사전 조건을 먼저 검증하고, 호스트 웹 서버 전환 실패 시 이전 상태를 복구하는 절차를 정한다.

### C03 · P2 · HTTP 301만으로 frontend 배포가 성공한다

- 근거: [FrontEnd/deploy.sh](FrontEnd/deploy.sh) 64~66행은 HTTP curl, HTTPS curl, 내부 wget 중 하나의 성공으로 통과한다. 첫 요청은 리다이렉트를 따라가지 않고 HTTPS 요청에는 `-k`가 있다.
- 발생 조건: HTTP가 301을 반환하지만 리다이렉트 대상의 HTTPS 서비스·인증서·도메인 연결은 실패한다.
- 영향: HTTPS 검사와 내부 요청이 실행되지 않은 채 성공 처리될 수 있다. API·실제 배포 버전도 이 검사로 확인하지 않는다.
- 검증: 임시 localhost 서버가 실제 301을 반환했을 때 동일한 `curl -s -k -f` 옵션이 종료 코드 0을 반환했다. 모의 deploy 실행에서도 첫 요청 성공 뒤 나머지 검사가 생략되었다.
- 개선 방향: HTTP 허용 환경과 HTTPS 필수 환경을 구분해 기대 상태·내용을 검사하고, HTTPS 필수 환경은 실제 도메인과 인증서 검증을 포함한다.

### C04 · P2 · 공유 Compose 변경이 자동 배포를 시작하지 않는다

- 근거: [프론트 워크플로우](../.github/workflows/deploy.yml), [NestJS 워크플로우](../.github/workflows/deploy_backend.yml), [FastAPI 워크플로우](../.github/workflows/deploy_fastapi.yml)의 paths는 각 소스·하위 CI_CD 폴더·자기 워크플로우만 포함한다.
- 발생 조건: 루트 `docker-compose.yml`만 변경해 main에 push한다.
- 영향: 네트워크·포트·마운트·환경 파일·서비스 의존성 변경이 자동 반영되지 않는다. 현재는 수동 workflow_dispatch 등이 필요하다.
- 검증: 세 워크플로우의 paths를 정적으로 대조했다. GitHub에서 이벤트를 실제 발생시키지는 않았다.
- 개선 방향: 공유 설정 변경이 영향을 주는 파이프라인을 정의하고 감시 경로나 별도 통합 배포 경로에 반영한다.

### C05 · P2 · 작업 폴더 백업이 이전 운영 버전을 보장하지 않는다

- 근거: deploy 잡은 checkout 이후 deploy.sh를 실행한다. FrontEnd/NestJS는 아티팩트 다운로드도 먼저 수행한다. 스크립트는 그 작업 폴더를 압축하고 종류별 최신 1개만 남긴다. 백업은 저장소 아래 `backups/`에 생성된다.
- 발생 조건: 실패한 새 배포 이후 해당 백업만으로 직전 운영 버전을 복원하려 한다.
- 영향: 새 checkout과 새 dist가 압축되어 이전 운영 버전이 없을 수 있다. 이후 checkout 정리로 백업이 사라질 수도 있다. `.env*`는 제외되며 자동 롤백도 없다.
- 검증: 워크플로우 단계와 네 deploy.sh의 tar·보관·실패 분기를 정적으로 확인했다. 모의 배포는 임시 폴더 안에서 실제 tar 압축을 수행했다.
- 개선 방향: 운영 이미지/정상 커밋의 식별자와 환경 파일을 별도 보관하고, 백업을 checkout cleanup 범위 밖에 두며 복원 절차를 검증한다.

### C06 · P2 · 재시도 횟수만 제한하고 HTTP 요청 시간을 제한하지 않는다

- 근거: 네 deploy.sh의 curl·내부 fetch/urllib/wget에는 명시적인 전체 요청 제한 시간이 없다. MAX_RETRIES=5와 sleep 간격만 지정한다.
- 발생 조건: 연결은 성립하지만 응답이 완료되지 않거나 네트워크 호출이 오래 걸린다.
- 영향: 최대 5회라는 설정만으로 전체 검증 완료 시간을 계산할 수 없다. 라이브러리·OS 기본 타임아웃에 의존한다.
- 검증: HTTP 호출 인수와 재시도 루프를 정적으로 확인했다. 실패 모의 실행에서는 FastAPI의 호스트/내부 검사 각 5회 후 종료 코드 1과 로그 출력을 확인했다. 실제 지연 요청의 총 시간을 측정한 것은 아니다.
- 개선 방향: 각 요청의 제한 시간과 전체 준비 대기 시간을 정하고, 실패 원인을 구분해 기록한다.

### C07 · P2 · FrontEnd CI가 별도 타입 검사를 실행하지 않는다

- 근거: [FrontEnd/build.sh](FrontEnd/build.sh)는 `npm ci`, `npm run build`, dist 검사만 실행한다. [FrontEnd/package.json](../FrontEnd/package.json)의 build는 Vite 빌드이고 lint는 별도의 `tsc --noEmit`이다.
- 영향: 번들 생성 성공을 TypeScript 타입 검사 성공으로 취급할 수 없다. 타입 검사를 배포 조건으로 사용하려면 해당 명령을 CI에서 실행해야 한다.
- 검증: 명령 정의와 호출 순서를 정적으로 대조했다. 이번 검토에서 타입 오류가 있는 실제 소스를 만들지는 않았다.
- 개선 방향: 타입 검사를 CI 통과 조건에 넣을지 결정하고 문서·스크립트를 함께 맞춘다.

## 오류와 구분해야 할 현재 구조

- `CI_CD/BackEnd/{build,deploy}.sh`는 현재 워크플로우가 호출하지 않는다. 루트 deploy.sh의 사전 검사 경로와 실제 Compose 경로가 다르므로 현행 배포용 예제로 사용하면 안 된다. 이번 모의 성공은 환경·산출물을 준비했을 때 스크립트 분기를 통과한다는 뜻이며 올바른 소스를 배포한다는 뜻이 아니다.
- `nginx_https.conf`는 호스트용 별도 템플릿이다. 인증서 경로가 예시이고 `/fastapi/` 프록시가 없으며, HTTP-01 webroot도 현재 컨테이너 템플릿과 다르다. Compose의 활성 설정으로 혼동하지 않는다.
- EC2에서 소스를 재빌드하는 것은 현재 배포 방식이다. 아티팩트를 그대로 배포하는 방식으로 변경하려면 워크플로우와 Dockerfile을 함께 바꿔야 한다.
- concurrency 그룹은 서비스별로 다르다. 여러 러너·별도 수동 배포가 같은 Docker 호스트를 건드릴 수 있는 운영 구성이라면 충돌 방지가 필요하다. 실제 러너 수나 동시 배포 충돌은 이번 검토에서 확인하지 않았다.
- 주석의 “무중단”, “안전 롤백”, “클라우드에서 빌드해 EC2 자원을 사용하지 않음”을 구현 근거로 사용하지 않는다. 현재 코드에는 단일 컨테이너 교체·EC2 재빌드가 있으며 자동 복원은 없다.

## 수행한 검증

| 검사 | 결과 | 확인 범위 |
|---|---|---|
| `bash -n` | 스크립트 8개 통과 | 셸 문법만 확인 |
| Compose 구성 렌더링 | local/development/production 3개 통과 | 실제 CLI로 빌드 경로·환경 파일·의존성 확인, 컨테이너 미실행 |
| 환경 파일 누락 구성 | 필수 DB 키 4개 누락 확인 | 임시 폴더의 실제 Compose 구성 |
| HTTP 301 판정 | curl 종료 코드 0 | 임시 localhost 서버 요청, 외부 연결 없음 |
| 모의 제어 흐름 | 아래 15개 시나리오 통과 | 임시 폴더·모의 서비스 명령, 실제 npm/pip/Docker 빌드 아님 |

모의 실행 시나리오:

1. FrontEnd, NestJS, 루트 BackEnd, FastAPI build.sh 성공 경로 4개
2. FrontEnd 의존성 설치 실패 시 후속 빌드 중단
3. NestJS 테스트 실패 시 후속 운영 빌드 중단
4. FrontEnd, NestJS, 루트 BackEnd, FastAPI deploy.sh 성공 경로 4개
5. NestJS 호스트 검사 실패 후 내부 검사 성공
6. FastAPI 호스트·내부 검사 모두 실패, 각 5회 시도 후 로그 출력·실패 종료
7. frontend HTTP 성공 처리 후 HTTPS 검사 생략
8. 호스트 Nginx 중지 후 Compose 실패, 복구 호출 없음
9. NestJS 산출물 누락 시 Docker 실행 전 중단

Git Bash 문법·모의 실행과 localhost curl 검사는 샌드박스의 Windows 객체/프로세스 간 접근 제한 때문에 제한 밖에서 수행했다. 모의 실행 전에 Docker·curl·systemctl·sudo·npm·node·pip·python3·sleep이 모의 함수인지 검사했다. 임시 폴더는 검증 후 정리했다.

미수행: 실제 EC2 배포, Docker 이미지 빌드·컨테이너 기동, Nginx `-t`, 실제 인증서 검사, 패키지 재설치, GitHub 이벤트 실행, ShellCheck/actionlint. 해당 린터는 이 검토 환경에서 발견되지 않았다. 모의 성공을 이 검사들의 성공으로 해석하지 않는다.

## 문서의 역할

- [AGENTS.md](AGENTS.md): 다음 AI 작업에서 읽을 규칙과 검증 방법
- [README.md](README.md): 현재 배포 운영 가이드
- 이 파일: 검토 시점의 확인 결과·재현 조건·미검증 범위

코드를 수정하면 관련 항목의 상태와 검증 근거도 갱신한다.

## 2026-10-20 추가: IP 인증서 폐기 도구

[certificates/revoke_ip_certificates.py](certificates/revoke_ip_certificates.py)를 추가했다. 위의 2026-10-19 배포 코드 검토 결과는 유지하며, 이번 변경으로 C01~C07이 해결된 것은 아니다.

- 기본 읽기 전용, `--apply`에서만 명시한 lineage를 적용한다. 모든 ENI의 IMDSv2 public-ipv4s를 확인하고 현재 IP·도메인/혼합/다중 SAN은 자동 폐기하지 않는다. Stop 전 현재 IP 폐기는 별도 옵션이다.
- 폐기 의도를 leaf 해시로 기록한 뒤 대상의 자동 갱신을 끄고 기존 계정으로 CA에 요청한다. 실패·타임아웃 때 차단을 유지하며 성공 기록은 별도로 남긴다. 파일을 자동 삭제하거나 Nginx를 재시작하지 않는다.
- 새 frontend 진입점은 차단한 leaf를 다음 시작에서 제외한다. 자세한 실행·실패·운영 범위는 [도구 README](certificates/README.md)에 있다.
- 실제 EC2·CA·Docker 데몬을 호출하지 않은 27개 테스트가 통과했다. IMDS/Certbot 모킹, 원자적 상태·갱신 설정·재시도·공개 인증서 사본, 로컬 자체 서명 인증서의 실제 OpenSSL 파싱, nginx 스텁을 사용한 진입점 분기를 확인했다. 실제 폐기·EC2 배포·컨테이너 Nginx TLS 연동은 미검증이다.

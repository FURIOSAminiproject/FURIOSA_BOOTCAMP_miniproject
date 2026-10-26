# Docker·웹 서버 구성 검토 기록

## 2026-10-26 수정: 공유 서버 부하 제한

2GiB DB 공유 서버의 운영 장애 보고에 따라 ORS CPU 기본 한도를 2에서 0.5로 낮췄다.
`restart: "no"`로 재부팅/종료 후 자동 시작을 끄고 `memswap_limit`을 RAM 한도와 같게 설정했다.
전용 배포에서 호스트 자원 검사도 수행한다. 기존 실행 중 컨테이너의 설정은 자동 변경되지 않는다.
오프라인 검증 41개와 local/development/production Compose 해석으로 신규 제한을 확인했다.
원격 Docker 적용이나 실제 DB 회복·ORS 전국 경로망의 성공/성능을 검증한 것은 아니다.

## 2026-10-26 수정: ORS 최초 데이터 자동 준비

`Docker/ors/bootstrap.json`을 첫 배포의 한국 OSM 원본·검증 좌표·포트 기준으로 추가했다.
전용 배포 스크립트가 다운로드 검증과 체크아웃 밖 JSON 생성을 수행한다. 기존 설정이 있으면 재사용하며,
Compose 마운트·이미지 digest·기존 서비스는 유지한다. 오프라인 검증 31개와 세 환경 Compose 해석을 확인했다.
실제 대용량 파일 다운로드·한국 경로망 생성·운영 컨테이너 배포·서버 자원 측정은 수행하지 않았다.

## 2026-10-26 추가: 선택적 ORS 컨테이너

루트 `docker-compose.ors.yml` 확장에 `ors` 프로필을 추가했다. 기존 기본 Compose 서비스 3개는 유지한다.
고정 digest의 공식 ORS v10.0.1을 사용하고 자동차·도보, 실시간 정체/고도 미사용으로 구성했다.
원본·설정은 체크아웃 밖의 검증된 스냅샷을 읽기 전용으로 마운트하며 경로망은 자료/이미지/설정별 외부
디렉토리, 로그는 named volume에 보관한다. API는 루프백 포트와 기존 travel-network에서만 제공한다.
기존 컨테이너 안에서 Docker를 중첩 실행하지 않으며 ORS만 `up --no-deps`로 교체한다.

실제 Compose CLI로 local/development/production 해석을 확인했다. 기본 구성은 ORS를 포함하지 않고
두 파일과 ors 프로필을 사용할 때만 새 서비스가 나타난다. YAML·Bash·Python 구문과 격리 로컬 검증 15개를
통과했다. Docker/HTTP를 모킹한 배포 검증과 실제 ORS 엔진 실행은 구분한다. 현재 PC의 Docker 데몬이 없어
이미지 기동·한국 경로망 구축·CPU/RAM 측정은 하지 않았다. 위 초기 자원 제한의 충분성을 보증하지 않는다.
기존 D01/D03·TLS 검토 항목이나 배경 지도와 경로의 버전 일치를 해결한 변경은 아니다.

검토일: 2026-10-19. Docker/에는 안내 문서가 있으며 실제 검토 대상은 루트 Compose, 서비스별 Dockerfile·.dockerignore, 프론트 엔트리포인트와 세 Nginx 설정이다. 미수정 문제와 현재 설계를 구분했다. 아래 P2는 해당 입력·운영 조건에서 파일 누락 또는 서비스 기동·인증서 반영에 영향을 주는 항목이다.

## 확인된 개선 항목

### D01 · P2 · 프론트 Docker 빌드에서 public 파일이 빠진다

- 근거: [FrontEnd/v1/Dockerfile](../FrontEnd/v1/Dockerfile)은 빌드에 필요한 루트 파일과 src/만 복사한다. [public/deploy_test.json](../FrontEnd/v1/public/deploy_test.json)이 존재하지만 COPY 대상이 아니다.
- 검증: 실제 COPY 목록과 파일 존재를 확인했다. 일반 로컬 Vite 빌드와 달리 Docker builder에 public/가 전달되지 않는 경로다. 실제 Docker 이미지는 빌드하지 않았다.
- 영향: 해당 JSON은 이미지의 정적 파일로 제공되지 않는다. 누락 경로 요청이 SPA index.html로 처리될 수 있어 HTTP 200만 확인하면 파일 존재를 오판할 수 있다.
- 개선 방향: public 파일을 배포 입력으로 포함할지 정하고 COPY·이미지 산출물·응답 Content-Type/내용을 함께 검증한다. 현재 JSON만 빠지는 것을 전체 React 빌드 실패로 설명하지 않는다.

### D02 · 해결(2026-10-20) · 서로 다른 디렉토리의 인증서와 키 조합

- 최초 검토에서는 fullchain.pem과 privkey.pem을 독립적으로 검색해 `a/fullchain.pem`, `b/privkey.pem`이 조합되는 경로를 확인했다.
- 변경: [docker-entrypoint.sh](../FrontEnd/v1/docker-entrypoint.sh)가 live 아래 같은 lineage의 cert/key만 선택하도록 수정했다. IP 폐기 요청한 leaf와 차단 해시가 같으면 제외하며, 손상된 차단 표시도 보수적으로 제외한다.
- 검증: 다른 디렉토리의 파일만 있는 fixture가 HTTP로 시작하고, 같은 디렉토리의 쌍은 HTTPS를 선택했다. 차단한 leaf·잘못된 차단 표시 제외, 다른 lineage 선택과 nginx 검사 실패도 확인했다. nginx는 스텁이므로 암호학적 키 일치·실제 Nginx 검증을 뜻하지 않는다.
- 남은 범위: 도메인·현재 IP에 맞는 쌍의 명시적 선택과 만료 검증은 없다. 폐기 도구는 자동 배포·재시작하지 않는다.

### D03 · P2 · 인증서 갱신 후 반영하는 reload 경로가 없다

- 근거: 인증서 검색·템플릿 렌더링은 엔트리포인트 시작 시 한 번 수행한다. Compose·Dockerfile·CI_CD에는 Certbot 갱신 스케줄이나 frontend Nginx reload 훅을 설치하는 코드가 없다.
- 발생 조건: 외부 Certbot 등이 인증서 파일을 갱신하고 컨테이너는 계속 실행한다. 운영 호스트에 별도 훅이 없는 경우다.
- 영향: 마운트의 파일 교체만으로 실행 중인 Nginx가 새 인증서를 적용한다고 보장할 수 없다. 최초 발급 후에도 HTTP/HTTPS 모드 재선택이 필요하다.
- 개선 방향: 갱신 성공 후 구성 검사와 reload 또는 필요한 재시작 절차를 운영 경로에 연결하고 갱신 실패를 확인한다. 운영 호스트의 외부 훅 존재 여부는 조회하지 않았다.

## 구성상 확인할 조건

- depends_on은 시작 순서만 지정하며 준비 완료를 기다리지 않는다. FastAPI HEALTHCHECK는 있지만 backend/frontend에는 없다. 기동 직후에는 502가 날 수 있다. 이미 운영 장애가 발생했다고 확인한 것은 아니다.
- restart:always와 Docker health 상태는 별개다. FastAPI가 unhealthy가 된 것만으로 자동 재시작·롤백이 수행되는 구성은 아니다.
- `.env.*`는 선택 사항이지만 NestJS DB 필수 설정은 선택 사항이 아니다. frontend 시작으로 의존 서비스까지 시작하는 배포 문제는 [CI_CD 검토 C01](../CI_CD/REVIEW.md)에 기록되어 있다.
- APP_ENV를 바꿔도 고정 container_name·80/443 등 호스트 포트를 공유한다. 환경별 DB 파일 선택 기능을 환경별 스택 격리로 해석하지 않는다.
- Compose에서 backend 직접 HTTPS를 켜면 HTTP upstream과 충돌할 수 있다. DB_SSL은 이 문제와 관계없는 DB TLS다.
- 이미지 태그와 FastAPI 최소 버전 의존성은 완전히 고정되어 있지 않다. 이번 검토에서는 재현성 정책 변경을 구현하지 않았다.
- Compose만 변경할 때 자동 배포되지 않는 문제는 [워크플로우 검토 W02](../.github/workflows/REVIEW.md)를 참고한다.

## 수행한 검증과 한계

| 검증 | 결과 |
|---|---|
| Compose config | local/development/production 3개 모드에서 서비스 3개, backend 컨텍스트·환경 파일, HOST, service_started 확인 |
| 엔트리포인트 fixture 6개 | 인증서 없음, 정상 경로의 쌍, 인증서만, 키만, 다른 디렉토리의 쌍, nginx 검사 실패 분기 확인 |
| 프록시·파일 입력 | 두 활성 Nginx 템플릿의 서비스명·접두사 제거·챌린지·리다이렉트, Dockerfile COPY와 ignore 규칙 정적 대조 |

fixture는 실제 스크립트의 시스템 경로를 임시 경로로 바꾸고 nginx 명령을 스텁으로 대체했다. 설정 검사 실패 fixture에서 최종 실행 명령이 호출되지 않는 것도 확인했다. 실제 인증서 만료·체인·키 일치, 실제 Nginx 문법 검사, Docker 이미지 빌드·기동, Windows 호스트 마운트와 EC2 외부 접속은 검증하지 않았다. 인증서 감지 테스트 통과를 AWS/Windows 환경 설정 자동 선택 성공으로 설명하지 않는다.

2026-10-20에는 [폐기 도구 테스트](../CI_CD/certificates/tests/test_revoke_ip_certificates.py)의 27개 테스트를 실행했다. 진입점 8개 테스트는 nginx 스텁 호출 자체도 확인한다. 이전의 다른 디렉토리 조합 재현 결과는 변경 후 기대 결과인 HTTP로 바뀌었다. D03의 자동 갱신 스케줄·reload 미구현은 그대로다.

## 2026-10-20 병합: 활성 프론트와 인증 경로

frontend 빌드 컨텍스트를 FrontEnd/v1로 변경하고 기존 인증서 감지·폐기 leaf 차단 진입점을 같은 컨텍스트로 옮겼다. Nginx의 /auth 프록시는 경로를 제거하지 않아 OAuth state 쿠키·콜백의 /auth 경로를 유지한다. /api·/fastapi와 기존 HTTP/HTTPS 선택은 유지한다. v2 로그인 UI는 현재 이미지에 포함되지 않는다.

인증서 폐기·진입점 오프라인 테스트 27개가 통과했다. 위 D 항목은 이번 병합으로 해결된 것으로 표시하지 않는다. 실제 Nginx -t·컨테이너 요청·EC2 TLS 연결은 별도 검증 대상이다.

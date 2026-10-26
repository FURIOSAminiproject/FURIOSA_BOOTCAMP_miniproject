# GitHub Actions 코드 검토 기록

## 2026-10-26 변경: 외부 ORS API 사용으로 자체 서버 구성 제거

미니프로젝트의 자원 부담을 줄이기 위해 자체 ORS Compose 확장·설정·CI/CD·전용 테스트를 제거했다. NestJS는 기존 외부 HeiGIT ORS API 호출과 DB 캐시를 유지한다. 배경 지도와 경로의 데이터 갱신 시점 차이는 감안하며 원본 데이터 버전 동기화는 수행하지 않는다. 아래 자체 ORS 추가·자원 제한 기록은 과거 이력으로 현재 운영 구성에 적용되지 않는다.

코드 삭제는 기존 EC2 컨테이너를 중지하지 않는다. Docker README에 해당 컨테이너만 중지하고 자동 재시작을 끄는 전환 절차를 기록했다. 이번 작업에서 원격 EC2 중지·배포나 외부 API의 실제 인증 호출은 수행하지 않았다.

검증: Node 24.20.0에서 NestJS `npm test` 17개(Node 9/Jest 8)와 컴파일, 외부 ORS HTTP 모킹 6가지(자동차/도보 × 추천/최단, 키 누락, 한도 초과)를 통과했다. local/development/production의 실제 Compose 해석은 서비스 3개만 포함하며 남은 워크플로우 3개 YAML 파싱, 수정 README 7개의 상대 파일 링크와 `git diff --check`도 확인했다. 실제 제공자 호출·EC2 배포·기존 컨테이너 중지는 미수행이다.

## 2026-10-26 수정: ORS 자원 검사 연결

호출하는 deploy.sh가 다운로드/기동 전에 총/가용 RAM·JVM/CPU 예산을 검사하도록 변경했다.
작은 호스트에서는 작업을 실패로 중단하며 workflow의 main 조건·러너·이벤트는 유지했다.
모의 배포에서 자원 실패 후 bootstrap/pull/up이 호출되지 않는 것을 포함해 오프라인 검증 41개를 확인했다.
실제 Actions/EC2 배포는 수행하지 않았다.

## 2026-10-26 수정: ORS 첫 배포 자동 준비

ORS 배포에 선택 변수 `ORS_DATA_ROOT`를 전달하고, 설정 JSON이 없을 때 호출 스크립트가
한국 OSM 다운로드·검증·JSON 생성을 자동 수행하도록 바꿨다. main 가드·PR 격리·러너 조건은 유지한다.
빈 두 경로 변수는 러너 HOME 기반 기본값을 사용한다. 기존 설정을 덮어쓰거나 매 배포마다 OSM을 갱신하지 않는다.
모의 최초 배포·실패 분기 등 오프라인 검증 31개, YAML/이벤트 조건 및 Compose 해석을 검사했다.
실제 GitHub Actions 재실행·EC2 배포는 수행하지 않았다.

## 2026-10-26 추가: ORS 파이프라인

`deploy_ors.yml`의 main push/PR/수동 실행 조건을 추가했다. ORS 설정·스크립트·두 Compose 파일·자기 YAML을
감시하며 build는 GitHub-hosted에서 고정 이미지와 작은 OSM 자료로 경로를 검사하도록 정의했다.
deploy는 main이면서 PR이 아닐 때만 기존 self-hosted Linux에서 ORS만 교체한다. job 제한시간과
별도 ORS 동시성 그룹을 두고 런타임 파일은 checkout 밖에 보관한다.

YAML 중복 키·jobs/needs/runner/경로와 이벤트 조건을 로컬에서 검사했다. 모의 배포/준비·응답 검증
15개와 세 환경의 실제 Compose 해석도 통과했다. 실제 GitHub 이벤트 실행·Docker ORS 기동·EC2 배포와
actionlint는 미수행이다. W01/W02의 개선은 새 ORS 워크플로우에 적용한 것으로, 기존 세 워크플로우의
수동 ref 제한·공유 Compose 감시·다중 배포의 전역 잠금 문제를 해결한 것은 아니다.

- 검토일: 2026-10-19 (Asia/Seoul)
- 기준 커밋: `d0ed908`. 앞서 작성한 CI_CD 문서 3개의 미커밋 변경을 유지한 상태에서 검토했다.
- 범위: 이 폴더의 YAML 3개와 연결된 build/deploy 스크립트, 캐시·아티팩트 경로, Compose·Dockerfile 및 `.gitignore`의 관련 동작.
- 이번 작업: 문서 작성과 로컬 검사. YAML, 배포 스크립트, 서비스 소스는 수정하지 않았다.

실제 운영 장애나 외부 공격을 확인한 기록이 아니다. P1은 조건 충족 시 의도한 운영 배포 범위를 벗어날 수 있는 항목, P2는 배포 반영·설정 보존에 영향을 주는 항목이다. GitHub 서비스 설정과 러너 배치는 별도로 확인해야 한다.

## 확인된 개선 항목

### W01 · P1 · 수동 실행의 브랜치를 운영 배포 조건으로 제한하지 않는다

- 근거: 세 YAML 모두 workflow_dispatch가 있고 deploy 잡에 ref 조건·environment가 없다. checkout에 ref 재지정도 없다. APP_ENV를 전달하는 입력이나 env가 없고 deploy.sh 기본값은 production이다. FrontEnd/NestJS deploy 잡은 76행부터, FastAPI는 67행부터 확인한다.
- 발생 조건: 실행 권한을 가진 사용자가 기본 브랜치에 등록된 워크플로우를 main 외 브랜치로 수동 실행하고, 그 ref에도 같은 구성이 있으며 build가 성공한다. 러너의 별도 APP_ENV 지정이나 외부 정책이 없는 경우를 가정한다.
- 영향: 검증하려던 다른 브랜치가 운영 Docker 배포 경로로 이어질 수 있다. main push 필터로 수동 ref까지 막을 수는 없다.
- 검증: 세 YAML에서 가드 부재를 확인했고, 이벤트 조건 로컬 모델에서 다른 브랜치 수동 실행 3개가 build 성공 후 deploy 가능한 구성임을 확인했다. 실제 수동 실행은 하지 않았다.
- 플랫폼 근거: 수동 실행은 브랜치 선택 및 ref 지정을 지원하며 저장소 write 권한이 필요하다. 무권한 사용자의 임의 실행을 확인했다는 뜻은 아니다. [GitHub 공식 문서](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)
- 개선 방향: 운영 배포를 허용할 ref·환경을 정하고 deploy 조건 또는 environment의 정책과 연결한다. 다른 ref의 빌드 검증과 운영 배포를 구분한다.

### W02 · P2 · 공유 Compose 파일 변경은 어떤 push 경로에도 포함되지 않는다

- 근거: [deploy.yml](deploy.yml), [deploy_backend.yml](deploy_backend.yml), [deploy_fastapi.yml](deploy_fastapi.yml)의 18~21행 paths에는 루트 docker-compose.yml이 없다.
- 발생 조건: main에 Compose만 수정해 push한다.
- 영향: 서비스 포트·환경 파일·볼륨·의존성 변경이 자동 배포되지 않는다. 수동 실행이나 후속 감시 대상 변경 때까지 반영되지 않을 수 있다.
- 검증: 현재의 리터럴 및 디렉토리/** 패턴을 대상으로 한 로컬 경로 검사에서 매칭 워크플로우가 없었다. GitHub 이벤트를 발생시키지는 않았다.
- 개선 방향: 공유 설정이 영향을 주는 서비스를 정의하고, 감시 경로나 통합 배포 정책에 반영한다. [CI_CD 검토 C04](../../CI_CD/REVIEW.md)와 같은 문제를 워크플로우 관점에서 추적한 항목이다.

### W03 · P2 · checkout 이후 작업 폴더의 환경 파일·백업이 보존된다고 가정할 수 없다

- 근거: 세 deploy 잡이 먼저 `actions/checkout@v4`를 실행하고 clean 입력을 재정의하지 않는다. 프로젝트 `.gitignore`는 `.env*`와 backups/를 제외한다. 2026-10-22부터 FrontEnd/NestJS deploy.sh는 공통 prepare-env.sh로 NestJS 환경 파일을 복원·검사한다. FastAPI 환경 파일과 작업 폴더 백업은 별도로 보존해야 한다.
- 발생 조건: 기존 Self-hosted 작업 폴더에 환경 파일·백업을 저장한 뒤 새 배포를 실행한다.
- 영향: 다음 checkout에서 설정·백업이 제거 대상이 된다. frontend가 backend까지 시작하는 경우나 FastAPI의 별도 설정이 필요한 경우에는 환경 준비 순서도 문제가 된다. NestJS 외부 복원 로직만으로 모든 서비스를 보장할 수 없다.
- 검증: 비밀값 없는 임시 Git 저장소에서 동일 정리 명령의 dry-run으로 NestJS 환경 파일, FastAPI 환경 파일, 백업 파일 3개가 삭제 예정 목록에 포함됨을 확인했다. 실제 프로젝트에는 해당 정리 명령을 실행하지 않았으며 fixture 파일도 dry-run 직후 남아 있음을 확인했다.
- 플랫폼 근거: checkout@v4의 clean 기본값은 true이고 입력 설명에 `git clean -ffdx`와 reset이 명시되어 있다. [공식 Action 정의](https://github.com/actions/checkout/blob/v4/action.yml)
- 개선 방향: 환경·백업을 작업 폴더 밖에 보관하고 서비스별 복원 경로를 배포 전에 준비한다. clean을 무조건 끄면 오래된 소스가 섞일 수 있으므로 파일 보관 계약을 먼저 정한다. 관련 실행 문제는 [CI_CD 검토 C01·C05](../../CI_CD/REVIEW.md)에 기록했다.

## 운영 구성을 확인한 뒤 판단할 항목

### 러너 대상과 서비스 간 동시성

deploy 러너는 모두 `[self-hosted, linux]`이고 운영 서버 전용 라벨·그룹은 없다. 이 라벨은 특정 EC2를 보장하지 않으며, 실제 등록된 러너가 여러 대라면 배포 대상이 달라질 수 있다. [GitHub 공식 러너 선택 문서](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow)

세 concurrency 그룹은 서로 다르다. 같은 Docker 호스트에 여러 러너가 있거나 별도 수동 배포가 병행되면 동일 Compose 프로젝트·컨테이너에 영향을 줄 수 있다. 실제 등록 러너 수·서버·충돌 여부는 이번 검토에서 조회하지 않았으므로 이미 충돌했다고 단정하지 않는다.

현재 queue 설정은 없고 cancel-in-progress=false다. 기본 대기 정책에서는 새 실행이 대기 중 실행을 대체할 수 있다. 모든 push의 배포 보존이나 이벤트 발생 순서의 FIFO를 보장하는 설정으로 해석하지 않는다. [GitHub 공식 동시성 문서](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

### 배포 보호·검증 범위

- PR 트리거가 없다. main에 합쳐지기 전에 이 세 파일의 CI가 자동 수행된다고 가정하지 않는다. PR 검증 필요 여부는 팀 정책으로 결정한다.
- deploy 잡에 GitHub environment와 명시적 timeout-minutes가 없다. 환경 보호 규칙을 사용하지 않는 구성이고, timeout은 플랫폼 기본값에 의존한다. 무제한 실행이라는 뜻은 아니다.
- 권한은 contents: read로 제한되어 있다. 실제 러너 계정의 Docker·sudo 권한은 이 토큰 권한과 별개이며 확인하지 않았다.
- FrontEnd CI 타입 검사 누락은 [CI_CD 검토 C07](../../CI_CD/REVIEW.md), HTTP 요청 시간 제한은 C06에 기록했다. 같은 문제를 새로운 발견으로 중복 집계하지 않는다.

## 확인된 정상 연결과 현재 설계

| 항목 | 확인 내용 |
|---|---|
| YAML | 3개 파일 파싱 성공, 중복 키 없음 |
| 이벤트 키 | `on`을 문자열로 유지해 push와 workflow_dispatch를 확인 |
| 잡 의존성 | deploy는 같은 워크플로우의 build에 needs로 연결 |
| build 러너 | ubuntu-latest; Node 22 또는 Python 3.12 설정 |
| run 경로 | 세 서비스의 실제 하위 CI_CD 스크립트를 호출; 루트 BackEnd 스크립트 호출 없음 |
| 캐시 기준 파일 | FrontEnd·NestJS의 package-lock.json, FastAPI의 requirements.txt가 존재하고 경로 일치 |
| 권한 | 세 파일 모두 contents: read |
| FrontEnd 아티팩트 | frontend-dist; 업로드·다운로드 경로 FrontEnd/v1/dist 일치 |
| NestJS 아티팩트 | backend-dist; 업로드·다운로드 경로 BackEnd/NestJS/dist 일치 |
| 아티팩트 검사 | FrontEnd/NestJS 모두 if-no-files-found: error, retention-days: 1 |
| FastAPI 아티팩트 | 업로드·다운로드 단계 없음; 현재 소스 재빌드 방식과 일치 |

checkout에 ref 입력이 없으면 이벤트의 ref/SHA를 사용한다. 수동 실행에서도 항상 최신 main을 가져오는 구성으로 설명하지 않는다. [checkout@v4 ref 입력 정의](https://github.com/actions/checkout/blob/v4/action.yml)

FrontEnd와 NestJS는 아티팩트를 전달하지만 최종 이미지는 EC2의 Dockerfile에서 소스를 다시 빌드한다. 이는 현재 설계이며, 아티팩트 이름이 일치한다는 검사만으로 CI에서 검증한 바이너리가 그대로 배포된다고 보장할 수 없다.

프론트 YAML의 “호스트 Nginx 웹 루트 동기화”와 “EC2 빌드 자원을 사용하지 않음” 같은 주석은 현재 deploy.sh·Dockerfile과 맞지 않는다. 이번 작업은 문서 작성이므로 YAML의 주석도 변경하지 않았다.

## 수행한 검증

| 검사 | 결과·한계 |
|---|---|
| YAML 구조 | 3개 파싱, 중복 키·필수 연결·참조 파일 확인. GitHub 전체 schema 검증은 아님 |
| run·cache·artifact 계약 | 스크립트 6개, 캐시 파일 3개, 아티팩트 전달 2쌍 대조 |
| 경로 사례 | 현재 리터럴·디렉토리/** 패턴의 14개 사례 확인. GitHub 전체 glob 엔진 구현이 아님 |
| 이벤트 사례 | 워크플로우별 6개, 총 18개 로컬 모델 확인. 실제 이벤트 실행이 아님 |
| checkout cleanup | 격리 Git 저장소의 dry-run 1회, 파일 3개 삭제 예정 확인. 실제 파일 삭제 없음 |
| 공식 동작 | 수동 ref·동시성·러너 라벨·checkout@v4 입력을 GitHub 1차 자료와 대조 |

경로 사례는 각 서비스 소스·스크립트 6개, 자기 YAML 3개, Compose·호스트 Nginx 템플릿·루트 BackEnd deploy.sh·루트 README·새 AGENTS 문서 5개로 구성했다. 자기 YAML 변경은 해당 파이프라인만 매칭하고, 마지막 5개는 현재 감시 경로에 매칭되지 않는다. 호스트 Nginx 템플릿과 루트 BackEnd 스크립트는 현재 배포가 사용하지 않는 경로라는 점을 Compose 누락과 구분한다.

이벤트 사례는 main push+경로 일치/불일치, 다른 브랜치 push, main 수동 실행, 다른 브랜치 수동 실행, PR이다. 수동 실행 사례는 기본 브랜치에 워크플로우가 등록되고 선택 ref에도 같은 구성이 있다는 전제다.

PyYAML의 YAML 1.1 bool 해석에서 on 키가 바뀌는 문제를 피하도록 boolean resolver를 true/false에 한정한 로더를 사용했다. 이 검사를 GitHub의 완전한 YAML 1.2/schema 검증으로 표현하지 않는다.

임시 Git 검사에 필요한 쓰기가 샌드박스에서 제한되어 해당 dry-run은 제한 밖의 격리 저장소에서 수행했고, 검증 후 임시 폴더를 정리했다. 실제 프로젝트의 Git 인덱스·설정·환경 파일은 변경하지 않았다.

미수행: actionlint(도구 미발견), GitHub 실제 이벤트·workflow_dispatch·러너 배정·Environment 설정 조회, CI 패키지 재설치·빌드, Docker 이미지 빌드·기동, EC2 배포. CI_CD의 이전 모의 실행 결과는 연결 참고 자료이며 이번 검토에서 재실행했다고 집계하지 않는다.

## 유지 방법

동작을 수정하면 해당 W 항목의 해결 여부·검증 근거와 [README.md](README.md)를 갱신한다. [AGENTS.md](AGENTS.md)에는 계속 적용할 작업 규칙을 남기고, 이번 시점의 관찰은 이 파일에 유지한다.

## 2026-10-20 병합: 프론트 실행 경로

상대 브랜치의 v1 이동에 맞춰 frontend 캐시 파일과 아티팩트 업로드·다운로드를 FrontEnd/v1로 연결했다. 현재 브랜치의 jobs·러너·권한·동시성·CI_CD 스크립트 호출은 유지했다. v2는 별도 보존하며 자동 배포 앱은 v1이다. 실제 GitHub 이벤트나 EC2 배포는 실행하지 않았다. 위 W 항목의 상태는 이번 병합으로 해결된 것으로 변경하지 않는다.

## 2026-10-22 공유 helper 감시 경로 검토

- frontend paths에 `CI_CD/BackEnd/nestjs/prepare-env.sh`를 추가했다. NestJS 워크플로우는 기존 `CI_CD/BackEnd/nestjs/**`로 같은 파일을 감지한다.
- 공유 helper 변경의 main push 일치, 다른 브랜치 push 제외, 수동 실행 조건을 로컬에서 확인했다. GitHub Actions를 실제 실행하지 않았다. W01/W02와 FastAPI·백업에 대한 W03의 제한은 유지한다.

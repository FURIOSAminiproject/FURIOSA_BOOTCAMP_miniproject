# GitHub Actions 작업 지침

이 파일은 `.github/workflows/`의 워크플로우와 문서를 수정할 때 적용한다. 현재 사용자의 요청을 우선하고, 워크플로우가 호출하는 배포 코드까지 확인한다.

## 먼저 읽기

1. [README.md](README.md)에서 현재 파이프라인 구성을 확인한다.
2. [REVIEW.md](REVIEW.md)에서 확인된 문제·조건부 위험·미검증 범위를 구분한다.
3. 연결된 스크립트를 검토할 때 [CI_CD 작업 지침](../../CI_CD/AGENTS.md)과 [검토 기록](../../CI_CD/REVIEW.md)을 함께 읽는다. 작업 지침은 각 폴더의 범위에 맞게 적용한다.

문서·주석과 실제 YAML이 다르면 실행 키와 호출된 코드를 추적한다. 검토 기록은 특정 시점의 결과이므로 현재 소스에서 다시 확인한다.

## 현재 연결 관계

이 표의 경로는 저장소 루트 기준이다.

| 파일 | 빌드·배포 스크립트 | 소스·캐시 기준 | 아티팩트 |
|---|---|---|---|
| deploy.yml | `CI_CD/FrontEnd/{build,deploy}.sh` | `FrontEnd/v1/`, `FrontEnd/v1/package-lock.json` | frontend-dist → FrontEnd/v1/dist |
| deploy_backend.yml | `CI_CD/BackEnd/nestjs/{build,deploy}.sh` | `BackEnd/NestJS/`, 해당 package-lock.json | backend-dist → BackEnd/NestJS/dist |
| deploy_fastapi.yml | `CI_CD/BackEnd/fastapi/{build,deploy}.sh` | `BackEnd/FastAPI/`, 해당 requirements.txt | 없음 |

- 현재 워크플로우는 `CI_CD/BackEnd/` 루트 스크립트를 호출하지 않는다.
- 모든 build 잡은 GitHub-hosted ubuntu-latest, deploy 잡은 `[self-hosted, linux]`를 사용한다. 러너 라벨을 실제 서버의 신원으로 간주하지 않는다.
- Node는 22, Python은 3.12를 선택한다. Actions 자체의 Node 런타임과 애플리케이션의 setup-node 런타임을 구분한다.
- FrontEnd/NestJS 아티팩트는 전달하지만 최종 이미지는 EC2의 Docker 빌드에서 다시 생성된다. dist 전달 성공을 검증된 이미지의 동일성 보장으로 설명하지 않는다.

## 이벤트·배포 대상 변경

- push 브랜치 조건과 paths 조건을 각각 확인한다. `workflow_dispatch`에는 push의 main·paths 제한이 적용되지 않는다.
- 수동 실행의 ref, checkout의 ref/SHA, 배포 환경, 실제 Docker 호스트가 어떻게 연결되는지 확인한다. 기본 브랜치에 워크플로우가 있어야 한다는 조건과 실행 ref를 구분한다.
- 현재 deploy 잡에는 main 조건, GitHub environment, APP_ENV 입력이 없다. APP_ENV가 별도로 전달되지 않으면 스크립트 기본값 production으로 이어진다. 이 상태를 main 전용 배포라고 단정하지 않는다.
- 브랜치 가드·environment·수동 입력을 바꾸면 검증 잡과 배포 잡을 구분하고 허용된 배포 조건을 명시한다. 사용자에게 이미 승인받은 배포 범위는 존중한다.
- 공유 `docker-compose.yml` 변경 시 어떤 파이프라인이 실행되어야 하는지 검토한다. 현재는 세 paths 목록에 포함되어 있지 않다.
- 소스 폴더·스크립트 위치를 바꾸면 paths, run 명령, 캐시 파일, 업로드/다운로드 경로, Docker 빌드 경로를 함께 확인한다.

## 러너·동시성·환경 파일

- 라벨이나 그룹을 추가할 때 실제 등록 구성을 확인한다. 존재하지 않는 운영 전용 라벨을 임의로 만들어 사용하지 않는다.
- 동시성 그룹은 서비스별로 분리되어 있다. 같은 Docker 호스트·Compose 프로젝트를 공유한다면 서비스 간 잠금 범위도 검토한다. 실제 러너 수·배치는 별도 확인 사항이다.
- `cancel-in-progress: false`가 모든 실행을 보존하는 FIFO 대기열을 의미하지는 않는다. 실행 중 작업 취소와 대기 중 작업 교체 정책을 구분한다.
- `actions/checkout@v4`의 기본 정리는 ignored 파일도 대상으로 한다. `.env`, 인증서, 백업을 checkout 작업 폴더에 영구 보관하는 전제로 설계하지 않는다.
- FrontEnd와 NestJS는 공통 prepare-env.sh로 NestJS 환경 파일을 복원·검사한다. FastAPI 환경 파일은 별도 준비가 필요하다. frontend paths에는 공유 helper도 포함한다. checkout 옵션 변경이나 frontend 단독 배포 시 의존 서비스를 확인한다.
- job timeout과 스크립트의 HTTP 요청 timeout은 별개다. YAML에 timeout이 없다고 무제한이라고 설명하지 않는다.

## 권한과 실행 코드

- 현재 `permissions: contents: read`가 전역에 있다. 쓰기 권한·PAT·secrets를 추가할 때 필요한 기능과 사용 범위를 확인한다.
- checkout은 별도 ref가 없으면 이벤트의 ref/SHA를 사용한다. 수동 실행도 main을 받는다고 가정하지 않는다.
- 현재 PR 트리거는 없다. PR 검증을 추가할 때는 build 검증과 운영 배포 경로를 분리하고, 신뢰하지 않는 PR 코드를 운영 Self-hosted 러너에서 실행하지 않도록 설계한다.
- 아티팩트 이름·경로·보존 기간·누락 시 실패 조건을 함께 확인한다. 동일 실행 안의 전달과 다른 실행에서의 다운로드를 혼동하지 않는다.
- 환경 변수·토큰·키의 실제 값을 로그·문서에 남기지 않는다. 설정 전체를 출력하기보다 필요한 구조만 확인한다.
- Actions 버전을 변경할 때 해당 버전의 러너 요구사항과 입력을 공식 자료에서 확인한다. 단순히 버전 숫자가 오래됐다는 이유만으로 변경하지 않는다.

## 검증과 보고

1. YAML 문법과 중복 키를 검사한다. PyYAML의 기본 YAML 1.1 로딩은 `on`을 boolean으로 바꿀 수 있으므로 해당 키가 문자열로 유지되는지 확인한다.
2. jobs·needs 연결, runner, 권한, run 스크립트, 캐시 파일, 아티팩트 이름·경로를 정적으로 대조한다.
3. 변경한 이벤트 조건은 main push, 다른 브랜치 push, 경로 일치/불일치, 수동 main/다른 ref, PR 등 해당 사례로 검사한다. 로컬 조건 모델을 GitHub 실제 실행으로 보고하지 않는다.
4. actionlint가 있으면 활용한다. 없으면 구조 검사만 수행했음을 기록하며 GitHub의 전체 schema 검증을 통과했다고 표현하지 않는다.
5. 스크립트·Compose 변경이 필요한 작업은 CI_CD 지침의 해당 검사도 수행한다. 문서 검토를 위해 실제 workflow_dispatch나 deploy.sh를 실행하지 않는다.
6. `git diff --check`와 문서 링크를 확인하고, YAML 변경 유무·실제 실행·로컬 모의·미검증 항목을 구분해 보고한다.

README는 현재 구성, AGENTS는 작업 규칙, REVIEW는 검토 결과를 담당한다. 동작 변경 시 관련 설명과 미해결 항목도 갱신한다.

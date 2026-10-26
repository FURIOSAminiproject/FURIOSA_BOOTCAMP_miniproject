# GitHub Actions 워크플로우 안내

이 폴더에는 기본 서비스 3개와 선택적 ORS의 자동 배포 워크플로우가 있다. 변경 작업은 [AGENTS.md](AGENTS.md), 확인된 문제와 검증 범위는 [REVIEW.md](REVIEW.md)를 먼저 확인한다.

## ORS 파이프라인 — 2026-10-26

[deploy_ors.yml](deploy_ors.yml)은 ORS 설정·배포 스크립트·자기 YAML·두 Compose 파일을 감시한다.
main push/수동 실행은 작은 OSM 스냅샷의 실제 자동차·도보 경로 검사 후 ORS만 배포한다.
PR은 GitHub-hosted build만 실행하고 운영 self-hosted에는 전달하지 않는다. main 외 수동 ref도 배포하지 않는다.
이미지를 직접 다시 빌드하지 않고 공식 이미지 digest를 고정하며, 운영 지도 파일과 저장소는 러너가 읽는
외부 설정 JSON으로 지정한다. 새 서버에서는 한국 OSM 다운로드·검증과 JSON 생성을 자동 수행하고 이후 재사용한다.
`ORS_DEPLOY_CONFIG`, `ORS_DATA_ROOT` 저장소 변수는 선택 사항이다. [ORS 운영·검증 범위](../../CI_CD/BackEnd/ors/README.md)를 따른다.
아래 기존 세 파이프라인의 제한·동시성 설명은 ORS의 main 가드·PR 조건과 구분한다.

## 실행 구조

| 워크플로우 | push 감시 경로 | 클라우드 빌드 | 배포 서비스 |
|---|---|---|---|
| [deploy.yml](deploy.yml) | FrontEnd/**, CI_CD/FrontEnd/**, CI_CD/BackEnd/nestjs/prepare-env.sh, 자기 YAML | Node 22, npm ci, Vite 빌드 | frontend |
| [deploy_backend.yml](deploy_backend.yml) | BackEnd/NestJS/**, CI_CD/BackEnd/nestjs/**, 자기 YAML | Node 22, npm ci, 테스트·TS 빌드 | backend |
| [deploy_fastapi.yml](deploy_fastapi.yml) | BackEnd/FastAPI/**, CI_CD/BackEnd/fastapi/**, 자기 YAML | Python 3.12, 의존성·문법·임포트 확인 | fastapi |

자동 실행은 main push에서 해당 경로 조건이 맞을 때 시작한다. 세 워크플로우 모두 수동 workflow_dispatch도 지원한다. PR 트리거는 없다. Compose만 변경하거나 이 폴더의 Markdown만 변경하면 현재 paths에는 매칭되지 않는다.

```text
이벤트
  → GitHub-hosted ubuntu-latest: checkout → 런타임 설정 → build.sh
  → build 성공
  → Self-hosted Linux: checkout → 아티팩트 다운로드(해당 시) → deploy.sh
  → EC2에서 Docker 이미지 재빌드·컨테이너 교체·HTTP 검사
```

FrontEnd는 frontend-dist, NestJS는 backend-dist를 업로드·다운로드하고 보존 기간은 1일이다. FastAPI는 아티팩트를 전달하지 않는다. 최종 이미지는 모두 배포 서버에서 소스를 다시 빌드한다. 전달된 dist를 그대로 운영 이미지에 넣는 방식은 아니다.

## 브랜치·환경·러너

수동 실행에서는 브랜치를 선택할 수 있다. 현재 deploy 잡에는 main 제한과 환경 입력이 없으므로 다른 브랜치도 빌드 성공 후 운영 기본값으로 배포될 수 있다. `push.branches: main`은 수동 실행의 제한이 아니다. 기본 브랜치에 workflow_dispatch 구성이 있어야 하는 조건과 실행 브랜치 선택은 구분한다. [GitHub 수동 실행 문서](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow)

YAML에서 APP_ENV를 전달하지 않으므로 별도 상속 값이 없으면 각 deploy.sh의 production 기본값을 사용한다. GitHub environment는 지정되어 있지 않다. 실제 저장소의 보호 규칙과 운영 정책은 별도로 확인해야 한다.

deploy의 `[self-hosted, linux]`는 해당 라벨을 만족하는 러너를 선택하는 조건이다. 특정 EC2를 식별하는 이름은 아니다. 실제 러너 목록·서버·그룹·권한은 GitHub 설정에서 확인한다. [GitHub 러너 선택 문서](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/use-in-a-workflow)

## 동시성 및 파일 보관

concurrency 그룹은 frontend-production, backend-production, fastapi-production으로 서로 다르다. 같은 그룹의 실행은 제한하지만 서비스 간 공통 잠금은 없다. `cancel-in-progress: false`는 실행 중 작업의 자동 취소를 끄며, 기본 대기 정책은 대기 실행을 새 실행으로 교체할 수 있다. 모든 push를 순서대로 보존한다는 의미는 아니다. [GitHub 동시성 문서](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)

checkout@v4는 기본적으로 ignored 파일도 정리한다. 작업 폴더 안의 `.env`와 `backups/`는 영구 보관 장소로 삼지 않는다. [checkout v4 입력 정의](https://github.com/actions/checkout/blob/v4/action.yml)

환경 파일 복원·TLS·서비스 의존성·백업·HTTP 검사의 세부 동작은 [CI/CD 운영 안내](../../CI_CD/README.md)와 각 서비스 스크립트를 기준으로 확인한다.

## 검증 범위

YAML 파싱이나 로컬 경로 필터 모델은 GitHub 서비스의 실제 workflow 실행을 대신하지 않는다. 코드 검토만을 위해 수동 배포를 시작하지 않는다. 이번 검토에서 수행한 검사와 미수행 항목은 [검토 기록](REVIEW.md)에 구분해 적었다.

## 공통 환경 검사 변경 (2026-10-22)

[deploy.yml](deploy.yml)은 `CI_CD/BackEnd/nestjs/prepare-env.sh` 변경도 감지합니다. FrontEnd와 NestJS 배포는 호스트 Nginx 중지·백업·컨테이너 교체 전에 이 helper로 NestJS 환경 파일을 복원하고 필수 DB·JWT·포트·DB_SSL을 검사합니다. FastAPI 환경 파일 복원은 별도입니다. [환경 파일 안내](../../CI_CD/README.md#환경-파일)를 따릅니다.

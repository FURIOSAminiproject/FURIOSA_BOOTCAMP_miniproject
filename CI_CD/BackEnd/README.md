# BackEnd CI/CD 구성

현재 워크플로우는 다음 두 하위 파이프라인을 호출합니다.

| 구분 | NestJS | FastAPI |
|---|---|---|
| 소스 | `BackEnd/NestJS/` | `BackEnd/FastAPI/` |
| 워크플로우 | `.github/workflows/deploy_backend.yml` | `.github/workflows/deploy_fastapi.yml` |
| 빌드 스크립트 | `CI_CD/BackEnd/nestjs/build.sh` | `CI_CD/BackEnd/fastapi/build.sh` |
| 배포 스크립트 | `CI_CD/BackEnd/nestjs/deploy.sh` | `CI_CD/BackEnd/fastapi/deploy.sh` |
| 클라우드 런타임 | Node 22 | Python 3.12 |
| 검증 | npm test + TS 빌드 | 의존성 설치 + py_compile + 앱 임포트 |
| Compose 서비스 | backend (`travel-backend`) | fastapi (`travel-fastapi`) |
| 헬스체크 | `http://127.0.0.1:3001/api/health` | `http://127.0.0.1:8000/health` |
| 백업 | `backups/backend/backend_backup_*.tar.gz` | `backups/fastapi/fastapi_backup_*.tar.gz` |

`CI_CD/BackEnd/build.sh`와 `deploy.sh`는 별도로 남아 있는 루트 NestJS용 스크립트입니다. 현재 워크플로우는 이를 호출하지 않습니다. 특히 루트 deploy.sh가 확인하는 환경 파일·산출물 경로와 Compose의 실제 `BackEnd/NestJS` 경로가 다르므로 현재 배포 안내에는 하위 스크립트를 사용합니다.

각 파이프라인은 `main`의 해당 소스·스크립트·워크플로우 파일 변경이나 수동 실행으로 시작합니다. Compose 파일만 변경해도 자동 실행되지는 않습니다.

배포는 EC2에서 소스를 다시 빌드하고 단일 컨테이너를 교체하는 방식입니다. 일시 중단이 가능하며 자동 롤백은 없습니다. 백업은 checkout 이후 현재 작업 폴더를 압축하므로 이전 운영 버전 복원 수단으로 보장되지 않습니다. 환경 파일과 정상 커밋/이미지를 별도로 보관합니다.

- [NestJS 상세](nestjs/README.md)
- [FastAPI 상세](fastapi/README.md)
- [인프라 및 HTTPS](../README.md)

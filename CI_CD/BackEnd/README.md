# 🚀 백엔드 CI/CD 마스터 허브 가이드 (Multi-Backend CI/CD)

> **NestJS 웹 서버와 FastAPI AI 엔진의 자동 빌드, 검증 및 무중단 배포 파이프라인 허브**

---

## 📑 백엔드 CI/CD 서브시스템 구성

```
CI_CD/BackEnd/
├── nestjs/              # [NestJS 전용 배포 파이프라인]
│   ├── build.sh         # Node 22, npm ci, npm test, npm run build:prod
│   ├── deploy.sh        # NestJS tar.gz 백업, docker compose up -d backend, :3001 /api/health
│   └── README.md        # NestJS CI/CD 상세 가이드
│
└── fastapi/             # [FastAPI 전용 배포 파이프라인]
    ├── build.sh         # Python 3.12, pip install, py_compile 문법 검증
    ├── deploy.sh        # FastAPI tar.gz 백업, docker compose up -d fastapi, :8000 /health
    └── README.md        # FastAPI CI/CD 상세 가이드
```

---

## 🛠️ 파이프라인 비교 요약

| 항목 | NestJS 파이프라인 (`BackEnd/nestjs`) | FastAPI 파이프라인 (`BackEnd/fastapi`) |
|---|---|---|
| **워크플로우** | `.github/workflows/deploy_backend.yml` | `.github/workflows/deploy_fastapi.yml` |
| **감시 경로** | `BackEnd/nestjs/**`, `CI_CD/BackEnd/nestjs/**` | `BackEnd/fastapi/**`, `CI_CD/BackEnd/fastapi/**` |
| **빌드 러너** | GitHub-hosted (`ubuntu-latest`, Node 22) | GitHub-hosted (`ubuntu-latest`, Python 3.12) |
| **배포 러너** | EC2 Self-hosted (`[self-hosted, linux]`) | EC2 Self-hosted (`[self-hosted, linux]`) |
| **컨테이너 서비스** | `backend` (`travel-backend`, 포트 3001) | `fastapi` (`travel-fastapi`, 포트 8000) |
| **헬스체크 URL** | `http://127.0.0.1:3001/api/health` | `http://127.0.0.1:8000/health` |
| **백업 경로** | `backups/backend/backend_backup_*.tar.gz` | `backups/fastapi/fastapi_backup_*.tar.gz` |

---

## 📑 상세 가이드 바로가기
* [NestJS CI/CD 상세 안내서](./nestjs/README.md)
* [FastAPI CI/CD 상세 안내서](./fastapi/README.md)

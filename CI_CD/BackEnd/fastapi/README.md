# ⚡ FastAPI CI/CD 파이프라인 가이드 (FastAPI Pipeline)

> **GitHub Actions 및 EC2 Self-hosted Runner 기반 FastAPI AI 엔진 무중단 배포 파이프라인**

---

## 📑 목차
1. [워크플로우 명세 (`deploy_fastapi.yml`)](#1-워크플로우-명세-deploy_fastapiyml)
2. [빌드 단계 (`build.sh`)](#2-빌드-단계-buildsh)
3. [배포 단계 (`deploy.sh`)](#3-배포-단계-deploysh)
4. [헬스체크 및 롤백 가이드](#4-헬스체크-및-롤백-가이드)

---

## 1. 워크플로우 명세 (`.github/workflows/deploy_fastapi.yml`)

* **트리거 조건**: `main` 브랜치 push 또는 `workflow_dispatch` 수동 실행
* **감시 경로**: `BackEnd/fastapi/**`, `CI_CD/BackEnd/fastapi/**`, `.github/workflows/deploy_fastapi.yml`
* **동시성 그룹**: `group: fastapi-production`

---

## 2. 빌드 단계 (`build.sh`)

GitHub Actions 클라우드 러너(`ubuntu-latest`)에서 안전하게 실행됩니다:
1. Python 3.12 런타임 환경 구성
2. `pip install -r requirements.txt` 의존성 설치
3. `python3 -m py_compile main.py`: 바이트코드 컴파일을 통한 문법 오류 사전 검출
4. `python3 -c "from main import app..."`: 모듈 로드 및 FastAPI 앱 인스턴스 무결성 검증

---

## 3. 배포 단계 (`deploy.sh`)

EC2 Self-hosted Runner에서 실행되며 무중단 배포를 수행합니다:
1. **사전 검사**: `main.py`, `requirements.txt`, `Dockerfile` 존재 확인
2. **자동 백업**: 배포 직전 기존 소스를 `backups/fastapi/fastapi_backup_YYYYMMDD_HHMMSS.tar.gz`로 압축 보관 (최신 1개 유지)
3. **Docker 빌드 및 기동**: `APP_ENV=$APP_ENV docker compose up -d --build fastapi`
4. **5단계 헬스체크**: `http://127.0.0.1:8000/health` 응답 검증 (최대 5회)

---

## 4. 헬스체크 및 롤백 가이드

### 헬스체크 엔드포인트
```bash
curl -s http://127.0.0.1:8000/health
# 응답: {"status":"healthy","service":"fastapi-engine","environment":"production"}
```

### 긴급 롤백 명령어
```bash
cd /home/ec2-user/FURIOSA_BOOTCAMP_miniproject
tar -xzf $(ls -t backups/fastapi/fastapi_backup_*.tar.gz | head -n 1) -C .
docker compose up -d --build fastapi
```

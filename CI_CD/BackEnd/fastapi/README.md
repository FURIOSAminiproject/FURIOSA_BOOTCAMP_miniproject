# FastAPI CI/CD

실행 기준은 [워크플로우](../../../.github/workflows/deploy_fastapi.yml), [build.sh](build.sh), [deploy.sh](deploy.sh), [Dockerfile](../../../BackEnd/FastAPI/Dockerfile)입니다.

## 트리거와 빌드 검증

`main` push의 `BackEnd/FastAPI/**`, `CI_CD/BackEnd/fastapi/**`, `.github/workflows/deploy_fastapi.yml` 변경 또는 수동 실행으로 시작합니다.

`ubuntu-latest`에 Python 3.12를 준비한 뒤 다음을 실행합니다.

1. Python/pip 버전 확인
2. pip 업그레이드 및 `pip install -r requirements.txt`
3. `python3 -m py_compile main.py`
4. `from main import app` 임포트와 앱 제목 확인

현재 빌드 잡은 실제 API 요청·NPU 추론·모델 품질 테스트를 실행하지 않으며 아티팩트 업로드 단계도 없습니다.

## EC2 배포

`[self-hosted, linux]` 러너에서 checkout 후 deploy.sh를 실행합니다.

1. `main.py`, `requirements.txt`, `Dockerfile` 확인
2. 작업 폴더의 `BackEnd/FastAPI/`를 `backups/fastapi/fastapi_backup_*.tar.gz`로 압축. `__pycache__`, `.env*`, `venv` 제외, 최신 1개 유지
3. `APP_ENV="$APP_ENV" docker compose up -d --build fastapi` (기본 production)
4. 3초 후 `http://127.0.0.1:8000/health` 확인. 호스트 curl 실패 시 컨테이너 내부 Python urllib 요청 시도
5. 최대 5회, 실패 간격 2초. 최종 실패 시 최근 로그 50줄 출력 및 종료 코드 1

컨테이너는 Python 3.12 Slim에서 소스를 복사하고 비루트 appuser로 Uvicorn을 실행합니다. 포트는 명령의 `--port 8000`으로 고정됩니다. Compose는 호스트 루프백 8000에 공개하고, Nginx는 `fastapi:8000`으로 연결합니다.

Compose가 `APP_ENV`를 전달하고 `BackEnd/FastAPI/.env`를 선택적으로 주입합니다. APP_ENV에 따라 `.env.production` 등을 선택하지 않으며 NestJS와 같은 외부 환경 파일 자동 복사도 없습니다. 필요 설정은 배포 전에 준비합니다.

## 헬스체크와 복구

```bash
curl http://127.0.0.1:8000/health
docker compose logs --tail=100 fastapi
```

`/health`는 서비스 응답을 확인합니다. 현재 추천 API는 샘플 결과를 반환하며 모델 추론 성공을 의미하지 않습니다. Dockerfile 자체에도 30초 간격의 HEALTHCHECK가 있습니다. unhealthy 상태만으로 `restart: always`가 자동 재시작하는 구성은 아닙니다.

단일 컨테이너 교체 방식이라 중단이 발생할 수 있으며 자동 롤백은 없습니다. 백업은 checkout 이후 작업 폴더이므로 이전 운영 버전 복원을 보장하지 않습니다. 정상 커밋·이미지와 환경 파일을 별도로 보관해 복구합니다.

동시성 그룹은 `fastapi-production`, `cancel-in-progress: false`입니다. 다른 서비스의 배포와 동시에 실행될 수 있습니다. [인프라 안내](../../README.md)를 함께 확인합니다.

## 추론 import 검사 추가 (2026-10-29)

빌드에서 main 앱뿐 아니라 app/routers/weather_prediction의 predict_many_dates도 import한다. Docker 이미지도 같은 검사를 수행하므로 CPU 아키텍처별 누락 런타임 라이브러리가 있으면 이미지 빌드를 중단한다. DB 접속·Gemini 호출·학습/모델 추론은 수행하지 않는다. FastAPI 공통 운영 DB 환경은 현재 BackEnd/.env.<APP_ENV>를 사용한다.

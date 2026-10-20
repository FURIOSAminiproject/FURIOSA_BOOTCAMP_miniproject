# FastAPI 작업 지침

상위 [AGENTS.md](../AGENTS.md), 이 폴더의 [README.md](README.md), [백엔드 검토 기록](../REVIEW.md)을 함께 읽는다.

## 구현 기준

- 소스 진입점은 `main.py`다. 현재 실제 모델 가중치 로드·NPU 초기화·추론 코드는 없다. lifespan과 API 설명의 향후 계획을 구현된 기능으로 보고하지 않는다.
- NestJS·프론트의 일정 생성 경로와 독립되어 있다. `/api/v1/recommend`는 지역·스타일을 문자열에 넣은 샘플 2개를 반환한다.
- `duration_days`는 1~14, 기본 2다. 응답의 total_days만 요청 일수이며 places는 항상 day=1 두 개다. budget은 현재 결과 계산에 쓰이지 않는다.
- Pydantic 요청·응답 모델을 기준으로 필수 필드, 기본값, null 허용, 422 응답을 확인한다. NestJS의 1~10일 조건을 이 서비스에 그대로 적용하지 않는다.

## 실행·환경·프록시

- `load_dotenv()`는 기존 시스템 환경을 덮지 않는다. APP_ENV 기본값은 development이고 운영/로컬에 따라 `.env.*`를 자동 선택하지 않는다. Compose env_file은 `.env`다.
- `PORT`는 main.py 직접 실행 분기에서 사용한다. Docker/Uvicorn 명령은 8000을 직접 지정한다. `.env.example`의 HOST·모델 변수는 현재 사용되지 않는다.
- 브라우저 직접 접근의 CORS는 CORS_ORIGINS를 사용한다. Nginx 경유 `/fastapi/*`는 접두사를 제거한다. Vite에는 `/fastapi` 프록시가 없다.
- Swagger UI는 `/openapi.json`을 절대 경로로 요청한다. Nginx 하위 경로 배포를 수정할 때 root_path, OpenAPI URL, 실제 rewrite 결과를 함께 검증한다.
- Docker는 Python 3.12, 비루트 appuser, `/health` HEALTHCHECK를 사용한다. 건강 응답만으로 모델 추론·무중단 배포 성공을 선언하지 않는다.

## 검증

이 폴더에서 전용 가상환경을 사용한다.

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m py_compile main.py
```

API 변경 시에는 FastAPI TestClient 등으로 `/`, `/health`, 정상 추천, 필수 region 누락, duration_days 0/1/14/15, 응답 모델을 확인한다. 예산·일수 처리 개선 시 현재 샘플 동작과 변경 결과를 구분해 확인한다. 구문 검사와 의존성 설치만으로 API 검증을 대신하지 않는다. 현재 저장소에는 이 서비스의 전용 테스트 스위트가 없으며 CI의 실행 검증도 제한적이다.

requirements.txt는 최소 버전 범위다. 새 의존성·모델을 추가할 때 Python 3.12 이미지, 다운로드·가중치 준비, 기동 시간과 헬스체크 영향을 확인한다. 검토 문서를 쓰기 위해 모델이나 외부 서비스를 임의로 연결하지 않는다.

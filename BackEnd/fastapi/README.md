# FastAPI 샘플 추천 서비스

Python/FastAPI 기반 독립 샘플 서비스입니다. 현재 NPU·PyTorch 모델 추론은 연결되어 있지 않으며, NestJS와 프론트의 일정 생성에서도 이 서비스를 호출하지 않습니다.

수정 전에는 [작업 지침](AGENTS.md)과 [백엔드 구현 검토 기록](../REVIEW.md)을 확인합니다.

## 실행

Dockerfile과 CI는 Python 3.12를 사용합니다. 저장소 루트에서 폴더를 이동한 뒤 가상환경을 만듭니다.

```bash
cd BackEnd/fastapi
python -m venv venv
```

Linux/macOS에서는 `source venv/bin/activate`, PowerShell에서는 `.\venv\Scripts\Activate.ps1`로 가상환경을 활성화한 뒤 실행합니다.

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

`requirements.txt`는 FastAPI, Uvicorn, Pydantic, python-dotenv, HTTPX의 최소 버전 범위를 지정합니다.

## 환경변수

`load_dotenv()`로 `.env`를 읽으며 이미 지정된 환경변수가 우선합니다. `.env.example`은 참고용입니다.

| 변수 | 동작 |
|---|---|
| APP_ENV | 상태 응답·로그에 표시, 직접 실행 기본값 `development` |
| CORS_ORIGINS | 쉼표로 구분한 허용 출처; 기본은 localhost/127.0.0.1의 HTTP 출처 |
| PORT | `python main.py`의 포트 설정, 기본 8000 |

문서의 Uvicorn 명령과 Dockerfile은 `--port 8000`을 직접 지정하므로 `PORT`만 변경해도 해당 명령의 포트가 바뀌지는 않습니다. Compose는 `APP_ENV`를 전달하고 `.env`를 선택적으로 주입하며, `.env.production` 등으로 자동 전환하지 않습니다.

`.env.example`의 `HOST`와 주석으로 제시된 `MODEL_NAME`, `MODEL_PATH`는 현재 `main.py`에서 읽지 않습니다. 예제 파일을 복사하는 것만으로 모델이 로드되지는 않습니다.

## API

| Method | 직접 접속 경로 | 설명 |
|---|---|---|
| GET | `/` | 서비스명·환경·문서 경로 |
| GET | `/health` | `healthy` 상태와 환경 반환 |
| POST | `/api/v1/recommend` | 샘플 추천 2개 반환 |
| GET | `/docs` | Swagger UI |

```json
{
  "region": "부산",
  "duration_days": 2,
  "style": "힐링",
  "budget": "적당히"
}
```

`region`은 필수이고 `duration_days`는 기본 2, 범위 1~14입니다. `style`과 `budget` 기본값은 각각 `힐링`, `적당히`입니다. 응답의 `total_days`는 입력 여행 일수지만 장소 목록은 항상 1일차 관광·식도락 2개이며 비용은 각각 25,000원·30,000원입니다. `budget`은 추천 계산에 사용되지 않습니다. `model_version: furiosa-ai-v1`은 샘플 응답 문자열이며 실제 모델 로드를 의미하지 않습니다.

## Docker 및 프록시

저장소 루트에서 실행합니다.

```bash
docker compose up -d --build fastapi
curl http://127.0.0.1:8000/health
```

Compose는 호스트 루프백 `127.0.0.1:8000`에만 포트를 공개합니다. 프론트 Nginx가 실행 중이면 `/fastapi/health`, `/fastapi/api/v1/recommend`로 접근할 수 있습니다. Nginx가 `/fastapi/` 접두사를 제거합니다. Vite 개발 서버에는 이 프록시가 없습니다. Nginx 경유 Swagger UI는 OpenAPI URL 접두사 별도 설정이 없어 같은 호스트에서 직접 접속하는 `http://localhost:8000/docs`를 사용합니다. 원격 EC2의 Swagger UI를 로컬 브라우저에서 보려면 SSH 포트 포워딩 등 별도 접속 경로가 필요합니다.

Docker 이미지는 Python 3.12 Slim, 비루트 `appuser`로 실행하며 `/health`를 확인하는 Docker HEALTHCHECK를 포함합니다. [CI/CD 안내](../../CI_CD/BackEnd/fastapi/README.md)를 참고합니다.

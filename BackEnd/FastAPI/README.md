# FastAPI 샘플 추천 서비스

Python/FastAPI 기반 독립 샘플 서비스입니다. 현재 NPU·PyTorch 모델 추론은 연결되어 있지 않으며, NestJS와 프론트의 일정 생성에서도 이 서비스를 호출하지 않습니다.

수정 전에는 [작업 지침](AGENTS.md)과 [백엔드 구현 검토 기록](../REVIEW.md)을 확인합니다.

## 실행

Dockerfile과 CI는 Python 3.12를 사용합니다. 저장소 루트에서 폴더를 이동한 뒤 가상환경을 만듭니다.

```bash
cd BackEnd/FastAPI
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

## 현재 기상 API와 운영 배포 확인 (2026-10-29)

위 샘플 추천과 별개로 현재 소스에는 app/routers/weather.py의 기상 추론 API가 있다. POST /api/v1/weather/predict/request는 target_dates와 locality_name 또는 destination_name/latitude/longitude를 받는다. 지역명이 없으면 Gemini 지역 매핑(실패 시 관측소 거리 기준 매핑)을 수행하고 DB 모델 아티팩트를 불러 실제 추론을 실행한다. WEATHER_PROJECT_DIR와 CSV, 해당 지역 5개 모델 아티팩트가 필요하다. /resolve-locality는 지역 매핑만 제공한다.

전주·2026-10-30~31 운영 요청에서 locality_name 필수 및 destination_name/latitude/longitude 금지 오류를 재현했다. 운영 OpenAPI도 이전 스키마였으므로 모델이 해당 날짜를 거부한 증거가 아니다. 현재 소스와 운영 컨테이너가 달라 FastAPI를 최신 main으로 재배포해야 한다. 프런트나 NestJS의 성공 배포가 FastAPI 배포 성공을 의미하지 않는다. 배포 후 공개 OpenAPI에서 locality_name이 선택이고 /resolve-locality가 존재하는지 확인한 다음 동일 전주 요청으로 실제 매핑·추론을 별도 검증한다. /health만으로 이를 확인할 수 없다. 실제 운영 추론 성공은 아직 확인하지 못했다.

## 공통 DB 환경 파일 (2026-10-29 수정)

FastAPI도 BackEnd/.env.production의 DB 설정을 사용한다. APP_ENV=local/development/production으로 선택하며 기본값은 production이다. 서비스의 .env.<mode> → 상위 BackEnd/.env.<mode> → 시스템 환경 순으로 우선한다. Docker는 Compose가 같은 두 파일을 주입하고, 직접 실행은 app/config.py가 DB·지역 매핑 모듈을 읽기 전에 로드한다. 과거 FastAPI/.env나 BackEnd/.env.local을 운영 실행에서 추가로 읽지 않는다.

DB_HOST/DB_USER/DB_PASSWORD/DB_NAME이 없으면 기동 시 키 이름만 알리고 실패한다. DB_SSL=true는 인증서를 검증하며 false는 비TLS다. Docker의 host.docker.internal을 호스트 게이트웨이에 연결한다. WEATHER_PROJECT_DIR이 없으면 이미지에 포함된 app/routers/weather_prediction을 사용하며 DB 아티팩트·CSV 준비는 별도다. 기존 운영 컨테이너에 DB 환경 4개가 모두 없음을 사용자 출력으로 확인했다. 이 변경 자체가 운영 DB의 모델 등록·추론 성공을 보장하지 않는다.

## 추론 모듈 의존성 검사 (2026-10-29)

운영 DB 조회 권한을 부여한 뒤 추론 진입점의 전역 psycopg2 import에서 실패한 것을 확인했다. API는 이미 asyncpg로 모델 아티팩트를 읽으므로 psycopg2 import를 별도 CLI의 restore_model_from_db 함수 내부로 옮겼다. 동기 CLI 복원 기능을 사용할 때만 별도로 psycopg2가 필요하다. CI와 Docker 이미지 빌드에서 predict_many_dates를 실제 import해 DB 접속 없이 추론 런타임의 누락 의존성을 검사한다.

## Windows 학습 경로의 Linux 호환 (2026-10-29)

DB 메타데이터에 저장된 relative_csv_path가 Windows 역슬래시를 포함해 Linux에서 원본 CSV를 찾지 못한 오류를 수정했다. 단일·다중 날짜 추론 모두 경로 구분자를 정규화하고 데이터셋 루트 내부 파일만 허용한다. 향후 학습 메타데이터는 POSIX 상대 경로로 저장한다. 기존 DB 모델을 다시 학습하거나 수정할 필요가 없다. CI·Docker 빌드는 실제 포함된 CSV에 대해 Windows 형식의 경로 해석도 검사한다.

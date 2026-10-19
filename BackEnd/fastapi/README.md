# ⚡ FastAPI AI Engine

Python 3.12 & FastAPI 기반 마이크로서비스입니다.

## 실행 가이드

```bash
cd BackEnd/fastapi
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## API 명세
* `GET /health`: 서비스 상태 확인
* `POST /api/v1/recommend`: 여행지 추천 인터페이스
* Swagger UI: `http://localhost:8000/docs`

# ==============================================================================
# FastAPI AI 추론 엔진 Dockerfile (Python 3.12 Slim 경량화)
# ==============================================================================
FROM python:3.11.16

WORKDIR /app

# 시스템 의존성 설치 및 캐시 정리
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# requirements.txt 복사 및 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 소스코드 복사
COPY . .

# 실제 추론 모듈의 런타임 의존성을 검사한다. DB 접속과 모델 추론은 실행하지 않는다.
RUN python -c "import sys; sys.path.insert(0, 'app/routers/weather_prediction'); from predict_weather import predict_many_dates"

# 비루트 사용자 설정 (보안 강화)
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# 헬스체크 정의
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

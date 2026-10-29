"""
FastAPI AI & Model Inference Engine
길벗 AI 여행사 Python 백엔드 서비스
"""

import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from app.config import load_environment, validate_database_configuration

# DB 엔진·지역 매핑 모듈을 가져오기 전에 선택한 공통 환경을 읽는다.
load_environment()
from app.routers.weather import router as weather_router

APP_ENV = os.getenv("APP_ENV", "production")
PORT = int(os.getenv("PORT", "8000"))
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost,http://127.0.0.1,http://localhost:80,http://127.0.0.1:80",
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_database_configuration()
    # 애플리케이션 시작 시 초기화 (예: AI 모델 가중치 로드, NPU 디바이스 초기화 등)
    print(f"🚀 [FastAPI Engine] Initializing service in {APP_ENV} mode...")
    yield
    # 애플리케이션 종료 시 정리
    print("🛑 [FastAPI Engine] Shutting down service...")


app = FastAPI(
    title="길벗 AI FastAPI Engine",
    description="Python/FastAPI 기반 고성능 AI 추론 및 데이터 연산 마이크로서비스",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(weather_router)

# ------------------------------------------------------------------------------
# 데이터 모델 정의 (Pydantic Models)
# ------------------------------------------------------------------------------
class DestinationRequest(BaseModel):
    region: str = Field(..., description="여행 대상 지역 (예: 부산, 강원, 제주)")
    duration_days: int = Field(default=2, ge=1, le=14, description="여행 일수")
    style: Optional[str] = Field(default="힐링", description="여행 스타일/테마")
    budget: Optional[str] = Field(default="적당히", description="예산 수준")


class PlaceItem(BaseModel):
    day: int
    name: str
    category: str
    description: str
    estimated_cost: int


class RecommendationResponse(BaseModel):
    region: str
    total_days: int
    places: List[PlaceItem]
    model_version: str
    status: str = "success"


# ------------------------------------------------------------------------------
# API 엔드포인트
# ------------------------------------------------------------------------------
@app.get("/", tags=["System"])
async def root():
    return {
        "service": "Gilbeot-AI-FastAPI-Engine",
        "status": "online",
        "env": APP_ENV,
        "docs_url": "/docs",
    }


@app.get("/health", tags=["System"])
async def health_check():
    """헬스체크 엔드포인트 (Docker 및 CI/CD 무중단 검증용)"""
    return {
        "status": "healthy",
        "service": "fastapi-engine",
        "environment": APP_ENV,
    }


@app.post(
    "/api/v1/recommend",
    response_model=RecommendationResponse,
    status_code=status.HTTP_200_OK,
    tags=["AI Inference"],
)
async def recommend_travel(req: DestinationRequest):
    """
    AI 여행 일정 추천/추론 엔드포인트
    - 향후 Furiosa NPU 모델 또는 PyTorch/LangChain 파이프라인과 직접 연동할 수 있도록 설계된 인터페이스
    """
    try:
        # 샘플 추론 결과 반환 (추후 NPU 추론 엔진 탑재 가능)
        sample_places = [
            PlaceItem(
                day=1,
                name=f"{req.region} 대표 명소 탐방",
                category="관광",
                description=f"{req.style} 테마에 맞춘 {req.region} 추천 코스",
                estimated_cost=25000,
            ),
            PlaceItem(
                day=1,
                name=f"{req.region} 로컬 미식 거리",
                category="식도락",
                description="현지인이 추천하는 전통 맛집",
                estimated_cost=30000,
            ),
        ]

        return RecommendationResponse(
            region=req.region,
            total_days=req.duration_days,
            places=sample_places,
            model_version="furiosa-ai-v1",
            status="success",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"추론 실패: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)


from datetime import date
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.locality_mapper import resolve_destination_to_locality
from app.services.weather_prediction import (
    WeatherModelNotFoundError,
    predict_weather_for_request,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/weather",
    tags=["Weather Prediction"],
)


class ResolveLocalityRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    destination_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="목적지 이름 (예: 경포대 해수욕장, 해운대, 성산일출봉)",
    )
    latitude: float = Field(..., ge=-90.0, le=90.0, description="위도")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="경도")
    candidate_localities: Optional[list[str]] = Field(
        None,
        description="선택 가능한 모델 지역 피처 목록 (미지정 시 지원되는 전체 관측소 기준 매핑)",
    )


class WeatherPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locality_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        examples=["강릉_강원특별자치도"],
        description="기상 모델 지역명 (미입력 시 destination_name/latitude/longitude로 AI 자동 매핑)",
    )

    destination_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=200,
        description="목적지 이름 (예: 경포대 해수욕장, 해운대)",
    )
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="목적지 위도")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="목적지 경도")

    target_dates: list[date] = Field(
        ...,
        min_length=1,
        max_length=31,
        examples=[["2026-12-10", "2026-12-11"]],
    )

    @field_validator("locality_name")
    @classmethod
    def validate_locality_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        if not value or "/" in value or "\\" in value or ".." in value:
            raise ValueError("올바르지 않은 지역명입니다.")
        return value

    @field_validator("target_dates")
    @classmethod
    def validate_target_dates(cls, dates: list[date]) -> list[date]:
        if len(dates) != len(set(dates)):
            raise ValueError("target_dates에 중복 날짜가 있습니다.")
        return dates


@router.post("/resolve-locality")
async def resolve_locality_endpoint(request: ResolveLocalityRequest):
    """
    목적지 이름과 위도·경도 3가지 정보를 바탕으로
    Gemini Flash AI를 호출하여 날씨 예측 모델의 지역 피처(locality_name)와 1:1 매핑한다.
    (AI 호출 불가 또는 오류 시 Haversine 최단거리 Fallback 보장)
    """
    try:
        result = await resolve_destination_to_locality(
            destination_name=request.destination_name,
            latitude=request.latitude,
            longitude=request.longitude,
            candidate_localities=request.candidate_localities,
        )
        return {
            "status": "success",
            "destination": {
                "name": request.destination_name,
                "latitude": request.latitude,
                "longitude": request.longitude,
            },
            **result,
        }
    except Exception as exc:
        logger.exception("지역 매핑 실패")
        raise HTTPException(
            status_code=500,
            detail=f"지역 매핑 처리 중 오류가 발생했습니다: {str(exc)}",
        ) from exc


@router.post("/predict/request")
async def parse_weather_prediction_request(
    request: WeatherPredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    target_dates = [
        target_date.isoformat()
        for target_date in request.target_dates
    ]

    effective_locality_name = request.locality_name
    resolved_mapping = None

    # locality_name이 직접 지정되지 않은 경우, 목적지 3가지 정보(이름, 위도, 경도)로 AI 자동 매핑
    if not effective_locality_name:
        if not (request.destination_name and request.latitude is not None and request.longitude is not None):
            raise HTTPException(
                status_code=422,
                detail="locality_name이 누락된 경우 destination_name, latitude, longitude를 반드시 전달해야 합니다.",
            )

        resolved_mapping = await resolve_destination_to_locality(
            destination_name=request.destination_name,
            latitude=request.latitude,
            longitude=request.longitude,
        )
        effective_locality_name = resolved_mapping["locality_name"]

    try:
        results_by_code = await predict_weather_for_request(
            db=db,
            locality_name=effective_locality_name,
            target_dates=target_dates,
        )

        forecasts_by_date = {
            target_date: {}
            for target_date in target_dates
        }

        for model_code, predictions in results_by_code.items():
            for prediction in predictions:
                forecast_date = prediction["target_date"]

                forecasts_by_date[forecast_date][model_code] = (
                    prediction["predicted_y"]
                )

        forecasts = [
            {
                "target_date": target_date,
                **forecasts_by_date[target_date],
            }
            for target_date in target_dates
        ]

        response_data = {
            "status": "success",
            "locality_name": effective_locality_name,
            "forecasts": forecasts,
        }
        if resolved_mapping:
            response_data["resolved_mapping"] = resolved_mapping

        return response_data

    except WeatherModelNotFoundError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        logger.exception("기상 예측 실행 실패")
        raise HTTPException(
            status_code=500,
            detail="기상 예측 처리 중 오류가 발생했습니다.",
        ) from exc


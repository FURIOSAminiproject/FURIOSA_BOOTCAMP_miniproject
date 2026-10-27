
from datetime import date
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.weather_prediction import (
    WeatherModelNotFoundError,
    predict_weather_for_request,
)


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/v1/weather",
    tags=["Weather Prediction"],
)


class WeatherPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    locality_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        examples=["강릉_강원특별자치도"],
    )

    target_dates: list[date] = Field(
        ...,
        min_length=1,
        max_length=31,
        examples=[["2026-12-10", "2026-12-11"]],
    )

    @field_validator("locality_name")
    @classmethod
    def validate_locality_name(cls, value: str) -> str:
        value = value.strip()

        if not value or "/" in value or "\\" in value or ".." in value:
            raise ValueError("올바르지 않은 지역명입니다.")

        return value

    @field_validator("target_dates")
    @classmethod
    def validate_target_dates(
        cls,
        dates: list[date],
    ) -> list[date]:
        if len(dates) != len(set(dates)):
            raise ValueError("target_dates에 중복 날짜가 있습니다.")

        return dates


@router.post("/predict/request")
async def parse_weather_prediction_request(
    request: WeatherPredictionRequest,
    db: AsyncSession = Depends(get_db),
):
    target_dates = [
        target_date.isoformat()
        for target_date in request.target_dates
    ]

    try:
        results_by_code = await predict_weather_for_request(
            db=db,
            locality_name=request.locality_name,
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

        return {
            "status": "success",
            "locality_name": request.locality_name,
            "forecasts": forecasts,
        }

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


@router.post("/predict/request")
async def parse_weather_prediction_request(
    request: WeatherPredictionRequest,
):
    """
    요청 Body를 파싱하고 예측 대상 모델 목록을 반환한다.
    현재 단계에서는 실제 모델 추론을 실행하지 않는다.
    """

    return {
        "status": "request_validated",
        "message": "기상 예측 요청 데이터가 정상적으로 파싱되었습니다.",
        "request": {
            "locality_name": request.locality_name,
            "target_dates": [
                target_date.isoformat()
                for target_date in request.target_dates
            ],
        },
        "model_codes": WEATHER_MODEL_CODES,
    }

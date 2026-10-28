
import asyncio
import hashlib
import os
import sys
import tempfile

from pathlib import Path

from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession


MODEL_CODES = [
    "TA_AVG",
    "RN_DAY",
    "TA_MAX",
    "TA_MIN",
    "WS_AVG",
]

ARTIFACT_FILES = {
    "metadata.pkl",
    "x_model.keras",
    "y_model.keras",
    "dense_ensemble_model.keras",
    "lightgbm_model.pkl",
    "ensemble_input_scaler.pkl",
}

REQUIRED_FILES = {
    "metadata.pkl",
    "x_model.keras",
    "y_model.keras",
}


class WeatherModelNotFoundError(Exception):
    pass

def _parse_locality_name(
    composite_name: str,
) -> tuple[str, str]:
    """
    '강릉_강원특별자치도'를
    ('강릉', '강원특별자치도')로 분리한다.
    """
    if not composite_name or "_" not in composite_name:
        raise ValueError(
            "지역명은 '지역명_광역자치단체명' 형식이어야 합니다."
        )

    locality, province = composite_name.rsplit("_", 1)

    locality = locality.strip()
    province = province.strip()

    if not locality or not province:
        raise ValueError(
            "지역명 또는 광역자치단체명이 비어 있습니다."
        )

    return locality, province


def _run_prediction(
    artifacts,
    project_dir,
    locality_name,
    target_dates,
):
    project_dir = Path(project_dir).resolve()
    data_dir = Path(
        os.getenv(
            "WEATHER_DATA_DIR",
            str(project_dir / "6_dataset"),
        )
    ).resolve()

    if not project_dir.is_dir():
        raise FileNotFoundError(
            f"기상 예측 프로젝트 경로가 없습니다: {project_dir}"
        )

    if not data_dir.is_dir():
        raise FileNotFoundError(
            f"기상 데이터 경로가 없습니다: {data_dir}"
        )

    if str(project_dir) not in sys.path:
        sys.path.insert(0, str(project_dir))

    from predict_weather import predict_many_dates

    results_by_code = {}

    with tempfile.TemporaryDirectory(
        prefix="weather_prediction_"
    ) as temp_dir:
        model_root = Path(temp_dir)

        for model_type_code, files in artifacts.items():
            model_id = f"{locality_name}__{model_type_code}"
            model_path = model_root / model_id
            model_path.mkdir(parents=True, exist_ok=True)

            missing = REQUIRED_FILES - set(files)
            if missing:
                raise RuntimeError(
                    f"{model_id} 필수 아티팩트 누락: "
                    f"{sorted(missing)}"
                )

            for file_name, file_bytes in files.items():
                if file_name in ARTIFACT_FILES:
                    (model_path / file_name).write_bytes(file_bytes)

        for code in MODEL_CODES:
            model_type_code = f"LSTM_{code}"
            model_id = f"{locality_name}__{model_type_code}"

            results_by_code[code] = predict_many_dates(
                model_id=model_id,
                target_dates=target_dates,
                data_dir=data_dir,
                model_dir=model_root,
            )

    return results_by_code



async def predict_weather_for_request(
    db: AsyncSession,
    locality_name: str,
    target_dates: list[str],
):
    # API 지역명과 DB 조회용 지역명을 분리한다.
    # 예: 강릉_강원특별자치도
    #     -> locality='강릉', province='강원특별자치도'
    db_locality_name, province_name = _parse_locality_name(
        locality_name
    )

    model_type_codes = [
        f"LSTM_{code}" for code in MODEL_CODES
    ]

    query = text("""
        SELECT
            mt.model_type_code,
            ma.file_name,
            ma.artifact_data,
            ma.sha256
        FROM public.model_types AS mt
        JOIN public.localities AS l
            ON l.locality_name = mt.locality_name
        JOIN public.provinces AS p
            ON p.province_name = l.province_name
        JOIN public.model_artifacts AS ma
            ON ma.model_type_id = mt.model_type_id
        WHERE l.locality_name = :locality_name
          AND p.province_name = :province_name
          AND mt.model_type_code IN :model_type_codes
    """).bindparams(
        bindparam("model_type_codes", expanding=True)
    )

    result = await db.execute(
        query,
        {
            "locality_name": db_locality_name,
            "province_name": province_name,
            "model_type_codes": model_type_codes,
        },
    )

    rows = result.mappings().all()

    artifacts = {
        code: {} for code in model_type_codes
    }

    for row in rows:
        file_name = row["file_name"]

        if file_name not in ARTIFACT_FILES:
            continue

        file_bytes = bytes(row["artifact_data"])
        expected_hash = (row["sha256"] or "").strip()

        if expected_hash:
            actual_hash = hashlib.sha256(
                file_bytes
            ).hexdigest()

            if actual_hash != expected_hash:
                raise RuntimeError(
                    f"아티팩트 해시 검증 실패: "
                    f"{row['model_type_code']}/{file_name}"
                )

        artifacts[row["model_type_code"]][file_name] = (
            file_bytes
        )

    missing_models = [
        code for code in model_type_codes
        if not artifacts[code]
    ]

    if missing_models:
        raise WeatherModelNotFoundError(
            f"{locality_name}의 모델을 찾을 수 없습니다: "
            f"{missing_models}"
        )

    project_dir = os.getenv("WEATHER_PROJECT_DIR") or str(
        Path(__file__).resolve().parents[1] / "routers" / "weather_prediction"
    )

    # 모델 ID에는 DB용 지역명이 아닌 기존 합성 지역명을 사용한다.
    return await asyncio.to_thread(
        _run_prediction,
        artifacts,
        project_dir,
        locality_name,
        target_dates,
    )


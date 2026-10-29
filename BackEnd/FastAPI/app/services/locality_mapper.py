"""
목적지 정보(이름, 위도, 경도)를 날씨 예측 모델의 지역 피처(locality_name)로 매핑하는 서비스.
Gemini Flash를 활용한 지리/행정구역 의미론적 1:1 매칭 및 Haversine 거리 기반 Fallback 지원.
"""

import json
import logging
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
import pandas as pd
from app.config import load_environment

logger = logging.getLogger(__name__)

# 지역 매핑도 DB와 동일한 선택 환경만 사용한다.
load_environment()

METADATA_FILE = Path(__file__).resolve().parent.parent / "routers" / "weather_prediction" / "META_관측지점정보.csv"
DATASET_DIR = Path(__file__).resolve().parent.parent / "routers" / "weather_prediction" / "6_dataset"

# 전역 관측소 캐시
_STATIONS_CACHE: Optional[List[Dict[str, Any]]] = None


def get_available_trained_localities() -> List[str]:
    """
    현재 실제 학습/데이터셋이 존재하는 지역 목록을 반환한다.
    (예: 6_dataset 디렉터리의 하위 폴더명)
    """
    if DATASET_DIR.is_dir():
        localities = [
            d.name for d in DATASET_DIR.iterdir()
            if d.is_dir() and "_" in d.name and not d.name.startswith(".")
        ]
        if localities:
            return sorted(localities)
    # 기본 폴백 목록
    return ["강릉_강원특별자치도"]


def load_all_station_metadata() -> List[Dict[str, Any]]:
    """
    META_관측지점정보.csv에서 한국 ASOS 지점 목록을 파싱하여 반환한다.
    결과 항목: { station_id, station_name, province, locality_name, latitude, longitude, address }
    """
    global _STATIONS_CACHE
    if _STATIONS_CACHE is not None:
        return _STATIONS_CACHE

    stations = []
    if not METADATA_FILE.exists():
        logger.warning(f"관측 지점 메타데이터 파일이 없습니다: {METADATA_FILE}")
        return stations

    try:
        df = pd.read_csv(
            METADATA_FILE,
            encoding="cp949",
            dtype={"지점": "string"},
        )
        df = df.dropna(subset=["지점", "지점명", "지점주소", "위도", "경도"]).drop_duplicates("지점")

        for _, row in df.iterrows():
            station_id = str(row["지점"]).strip()
            station_name = str(row["지점명"]).strip()
            raw_address = str(row["지점주소"]).strip().replace("(산지)", "").replace("(도서)", "").strip()
            parts = raw_address.split()
            province = parts[0] if parts else "미등록"

            locality_name = f"{station_name}_{province}"
            try:
                lat = float(row["위도"])
                lng = float(row["경도"])
            except (ValueError, TypeError):
                continue

            stations.append({
                "station_id": station_id,
                "station_name": station_name,
                "province": province,
                "locality_name": locality_name,
                "latitude": lat,
                "longitude": lng,
                "address": raw_address,
            })

        _STATIONS_CACHE = stations
        logger.info(f"총 {len(stations)}개 기상 관측소 메타데이터 로드 완료.")
    except Exception as e:
        logger.exception(f"관측 지점 메타데이터 로드 실패: {e}")

    return stations


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """두 위경도 좌표 간의 구면 거리(km)를 계산한다."""
    r = 6371.0  # 지구 반경 (km)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def resolve_locality_with_haversine(
    latitude: float,
    longitude: float,
    candidate_localities: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    단순 유클리드/하버사인 거리를 기준으로 가장 가까운 관측소 지역을 찾는다. (Fallback 용도)
    """
    stations = load_all_station_metadata()

    # 후보 지역이 제한된 경우 필터링
    if candidate_localities:
        target_set = set(candidate_localities)
        stations = [s for s in stations if s["locality_name"] in target_set]

    if not stations:
        # 등록된 관측소가 없거나 필터 후 비어있으면 기본값 반환
        fallback_name = candidate_localities[0] if candidate_localities else "강릉_강원특별자치도"
        return {
            "locality_name": fallback_name,
            "station_name": fallback_name.split("_")[0],
            "province": fallback_name.split("_")[1] if "_" in fallback_name else "",
            "distance_km": None,
            "method": "haversine_default",
            "reason": "등록된 관측소 목록이 없거나 필터 매칭 실패로 기본값을 적용했습니다.",
        }

    closest = None
    min_dist = float("inf")
    for s in stations:
        dist = haversine_distance(latitude, longitude, s["latitude"], s["longitude"])
        if dist < min_dist:
            min_dist = dist
            closest = s

    return {
        "locality_name": closest["locality_name"],
        "station_name": closest["station_name"],
        "province": closest["province"],
        "distance_km": round(min_dist, 2),
        "method": "haversine_closest",
        "reason": f"위경도 좌표 기준 최단거리 관측소 매핑 (거리: 약 {min_dist:.1f}km)",
    }


async def resolve_locality_with_gemini(
    destination_name: str,
    latitude: float,
    longitude: float,
    candidate_localities: List[str],
    api_key: Optional[str] = None,
    model_name: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Gemini Flash 모델을 호출하여 목적지 이름과 위경도에 가장 적합한 모델 피처(locality_name)를 1:1 매핑한다.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        logger.info("GEMINI_API_KEY가 설정되지 않아 Gemini Flash 매핑을 건너뜁니다.")
        return None

    raw_model = model_name or os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    model = raw_model.strip().lower().replace(" ", "-")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

    # 후보군이 너무 많을 경우 좌표 기반 상위 15개를 추려 프롬프트 효율 극대화
    stations = load_all_station_metadata()
    if len(candidate_localities) > 20:
        scored = []
        target_set = set(candidate_localities)
        for s in stations:
            if s["locality_name"] in target_set:
                d = haversine_distance(latitude, longitude, s["latitude"], s["longitude"])
                scored.append((d, s["locality_name"]))
        scored.sort(key=lambda x: x[0])
        prompt_candidates = [item[1] for item in scored[:15]]
    else:
        prompt_candidates = candidate_localities

    system_instruction = (
        "당신은 지리 공간 분석 및 기상 관측소 매핑 AI 어시스턴트입니다.\n"
        "사용자가 제공한 여행 목적지 정보(목적지명, 위도, 경도)를 분석하여, "
        "당사의 날씨 예측 모델이 지원하는 [후보 지역 목록] 중에서 "
        "가장 지리적으로 인접하고 행정구역상 타당한 1곳을 1:1 매칭하세요.\n\n"
        "반드시 오직 다음과 같은 JSON 포맷으로만 응답해야 합니다:\n"
        "{\n"
        '  "locality_name": "후보 지역 목록 중 정확히 1개",\n'
        '  "confidence": 0.0 ~ 1.0,\n'
        '  "reason": "선택 사유 요약 (1문장)"\n'
        "}"
    )

    user_prompt = (
        f"목적지명: {destination_name}\n"
        f"위도: {latitude}\n"
        f"경도: {longitude}\n\n"
        f"[후보 지역 목록]:\n{json.dumps(prompt_candidates, ensure_ascii=False)}"
    )

    payload = {
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "contents": [{"parts": [{"text": user_prompt}]}],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json",
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini API 호출 실패 (상태 코드: {resp.status_code}): {resp.text}")
                return None

            data = resp.json()
            candidates = data.get("candidates", [])
            if not candidates:
                return None

            content_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
            if not content_text:
                return None

            # JSON 파싱
            parsed = json.loads(content_text)
            selected_locality = parsed.get("locality_name", "").strip()

            if selected_locality in prompt_candidates or selected_locality in candidate_localities:
                station_part = selected_locality.split("_")[0]
                province_part = selected_locality.split("_")[1] if "_" in selected_locality else ""
                return {
                    "locality_name": selected_locality,
                    "station_name": station_part,
                    "province": province_part,
                    "confidence": float(parsed.get("confidence", 0.9)),
                    "method": "gemini_flash",
                    "reason": parsed.get("reason", "Gemini Flash AI를 통한 지명 및 공간 매핑"),
                }
            else:
                logger.warning(f"Gemini가 후보에 없는 지역명을 반환함: {selected_locality}")
                return None

    except Exception as e:
        logger.warning(f"Gemini Flash 지역 매핑 처리 중 오류 발생: {e}")
        return None


async def resolve_destination_to_locality(
    destination_name: str,
    latitude: float,
    longitude: float,
    candidate_localities: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    목적지 이름, 위도, 경도를 받아 Gemini Flash로 최적의 관측소 지역 피처를 매핑하고,
    실패 시 Haversine 최단거리 기반으로 안정적으로 Fallback한다.
    """
    candidates = candidate_localities or get_available_trained_localities()

    # 1. Gemini Flash 호출 시도
    gemini_result = await resolve_locality_with_gemini(
        destination_name=destination_name,
        latitude=latitude,
        longitude=longitude,
        candidate_localities=candidates,
    )
    if gemini_result is not None:
        return gemini_result

    # 2. 실패 시 Haversine 거리 기반 Fallback
    logger.info(f"Gemini 매핑 불가로 Haversine 거리 매핑 적용: {destination_name} ({latitude}, {longitude})")
    fallback_result = resolve_locality_with_haversine(
        latitude=latitude,
        longitude=longitude,
        candidate_localities=candidates,
    )
    return fallback_result

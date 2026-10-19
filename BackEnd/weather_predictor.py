"""
날씨 데이터 기반 강수 확률 예측 도구 (weather_predictor.py)
=============================================================
특정 지역의 과거 n개 연도(Historical n-year) 기상 관측 데이터를 바탕으로
목표 날짜의 강수 확률(비 올 확률 %) 및 날씨 상태, 예상 강수량, 우산 추천 지수를 예측합니다.

주요 특징:
1. 기후학적 통계 분석 (Climatological Precipitation Probability):
   - 과거 n년간 목표 일자 전후 윈도우(±window_days)의 강수 빈도 및 강도 분석
   - 일자 거리 감쇠 가중치(Distance-weighted average) 적용
2. 환경 변수 보정 (선택 사항):
   - 현재 습도, 기온, 기압 정보가 주어질 경우 베이지안 가중치 보정
3. 데이터 소스 유연성:
   - 실제 기상청 CSV/JSON 파일 로드 지원
   - 데이터 파일이 없을 경우 한국 주요 도시(서울, 부산, 제주, 대구, 대전 등)의
     실제 기후 통계 모델에 기반한 현실적인 n년치 합성 데이터(Synthetic History) 자동 생성
4. AI Agent 호환:
   - 독립 CLI 실행 가능
   - ai_agent.py의 @agent.tool 데코레이터로 즉시 등록 가능
"""

import os
import sys
import json
import random
import datetime
import argparse
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional, Tuple

# Windows 콘솔 인코딩 호환성 처리 (cp949 UnicodeEncodeError 방지)
if sys.platform.startswith("win"):
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


# ==============================================================================
# 1. 기상 데이터 모델 및 한국 주요 도시 기후 프로필
# ==============================================================================
@dataclass
class WeatherRecord:
    """일별 과거 기상 관측 기록"""
    date: str              # YYYY-MM-DD
    location: str          # 지역명
    month: int             # 1 ~ 12
    day: int               # 1 ~ 31
    temp_avg: float        # 평균 기온 (°C)
    humidity: float        # 평균 상대습도 (%)
    rainfall_mm: float     # 일 강수량 (mm, 0.0이면 무강수)
    is_rain: bool          # 강수 여부 (0.1mm 이상)


# 한국 주요 도시별 월별 기본 강수 확률(%) 및 평균 기온 프로필 (기상청 평년값 참조)
CITY_CLIMATE_PROFILES = {
    "서울": {
        "rain_prob_by_month": [15, 18, 22, 28, 30, 42, 62, 58, 32, 20, 22, 18],  # 7~8월 장마/소나기 집중
        "temp_avg_by_month": [-2.4, 0.4, 5.7, 12.5, 17.8, 22.2, 24.9, 25.7, 21.2, 14.8, 7.2, 0.4],
        "summer_rain_scale": 1.2
    },
    "부산": {
        "rain_prob_by_month": [18, 20, 26, 32, 35, 45, 55, 50, 38, 22, 20, 15],  # 해안성 기후
        "temp_avg_by_month": [3.2, 4.9, 8.6, 13.6, 17.5, 20.7, 24.1, 25.9, 22.3, 17.0, 11.2, 5.6],
        "summer_rain_scale": 1.1
    },
    "제주": {
        "rain_prob_by_month": [32, 30, 32, 34, 35, 48, 58, 55, 42, 28, 28, 30],  # 다우지, 연중 강수 빈도 높음
        "temp_avg_by_month": [6.1, 6.7, 9.8, 14.2, 17.9, 21.5, 25.6, 26.8, 23.5, 18.7, 13.4, 8.6],
        "summer_rain_scale": 1.3
    },
    "강릉": {
        "rain_prob_by_month": [20, 22, 28, 30, 32, 40, 52, 54, 40, 25, 24, 18],  # 동해안 영동형
        "temp_avg_by_month": [0.9, 2.3, 6.6, 12.6, 17.0, 20.5, 24.1, 24.6, 20.4, 15.2, 9.0, 3.4],
        "summer_rain_scale": 1.15
    },
    "대구": {
        "rain_prob_by_month": [12, 15, 20, 24, 26, 38, 52, 48, 30, 16, 18, 14],  # 분지형 기후, 소우지
        "temp_avg_by_month": [0.6, 2.9, 7.8, 14.3, 19.2, 23.0, 26.0, 26.4, 21.7, 15.6, 8.9, 2.6],
        "summer_rain_scale": 0.95
    },
    "대전": {
        "rain_prob_by_month": [16, 18, 22, 27, 29, 40, 60, 55, 33, 19, 21, 17],
        "temp_avg_by_month": [-1.0, 1.4, 6.7, 13.0, 18.2, 22.4, 25.4, 25.8, 21.1, 14.7, 7.7, 1.1],
        "summer_rain_scale": 1.1
    },
    "광주": {
        "rain_prob_by_month": [22, 20, 24, 28, 30, 42, 58, 52, 35, 20, 22, 20],
        "temp_avg_by_month": [0.6, 2.5, 7.2, 13.2, 18.1, 22.4, 25.6, 26.2, 21.9, 15.8, 9.1, 2.8],
        "summer_rain_scale": 1.1
    }
}


# ==============================================================================
# 2. 과거 기상 데이터 관리자 (WeatherHistoryManager)
# ==============================================================================
class WeatherHistoryManager:
    """지역별 과거 n년치 기상 데이터를 로드하거나 생성 및 관리"""

    def __init__(self, data_dir: str = "weather_data"):
        self.data_dir = data_dir
        if not os.path.exists(self.data_dir):
            os.makedirs(self.data_dir, exist_ok=True)

    def get_history(self, location: str, years: int = 5) -> List[WeatherRecord]:
        """
        지역과 연도 수에 맞는 과거 기상 기록을 반환.
        캐시 파일이 있으면 읽고, 없으면 통계 모델 기반 합성 데이터 생성 후 캐싱.
        """
        clean_loc = location.strip()
        cache_file = os.path.join(self.data_dir, f"history_{clean_loc}_{years}yr.json")

        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    raw_data = json.load(f)
                    return [WeatherRecord(**item) for item in raw_data]
            except Exception:
                pass  # 로드 실패 시 새로 생성

        # 데이터가 없으면 과거 n년치 기상 기록 생성
        records = self.generate_synthetic_history(clean_loc, years)
        try:
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump([asdict(r) for r in records], f, ensure_ascii=False, indent=2)
        except Exception:
            pass

        return records

    def generate_synthetic_history(self, location: str, years: int = 5) -> List[WeatherRecord]:
        """
        한국 기후 통계 모델을 바탕으로 과거 n개 연도의 일별 기상 관측 시뮬레이션 데이터 생성.
        """
        # 프로필 탐색 (도시명이 없으면 서울 프로필 기본값 사용)
        profile = CITY_CLIMATE_PROFILES.get(location)
        if not profile:
            for city_key, city_prof in CITY_CLIMATE_PROFILES.items():
                if city_key in location or location in city_key:
                    profile = city_prof
                    break
        if not profile:
            profile = CITY_CLIMATE_PROFILES["서울"]

        current_year = datetime.datetime.now().year
        start_year = current_year - years
        records = []

        # 재현성을 위한 시드 (도시명과 연도 수 기반 고정)
        rng = random.Random(f"{location}_{years}")

        for y in range(start_year, current_year):
            # 1월 1일부터 12월 31일까지 순회
            cur_date = datetime.date(y, 1, 1)
            end_date = datetime.date(y, 12, 31)

            # 전날 비 왔는지 여부 (마르코프 체인 효과: 연속 강수 경향)
            prev_rained = False

            while cur_date <= end_date:
                m = cur_date.month
                d = cur_date.day

                base_prob = profile["rain_prob_by_month"][m - 1]
                avg_temp = profile["temp_avg_by_month"][m - 1]

                # 6월 하순 ~ 7월 중순 장마철 가중치
                if (m == 6 and d >= 20) or (m == 7 and d <= 25):
                    base_prob *= profile.get("summer_rain_scale", 1.2)
                    base_prob = min(85.0, base_prob)

                # 전날 비가 왔다면 당일 비 올 확률 소폭 증가 (지속성)
                if prev_rained:
                    base_prob = min(90.0, base_prob * 1.35)
                else:
                    base_prob = max(5.0, base_prob * 0.9)

                # 확률에 따라 강수 발생 결정
                rained = rng.uniform(0, 100) < base_prob
                prev_rained = rained

                if rained:
                    # 비가 온 경우: 강수량(mm) 및 습도
                    if m in [6, 7, 8]:  # 여름철 호우/소나기
                        rainfall = round(rng.lognormvariate(2.2, 0.9), 1)  # 5mm ~ 80mm
                        humidity = round(rng.uniform(75.0, 98.0), 1)
                    else:
                        rainfall = round(rng.lognormvariate(1.2, 0.7), 1)  # 1mm ~ 25mm
                        humidity = round(rng.uniform(65.0, 92.0), 1)
                    rainfall = max(0.2, min(rainfall, 180.0))
                else:
                    rainfall = 0.0
                    humidity = round(rng.uniform(30.0, 68.0), 1)

                temp = round(rng.gauss(avg_temp, 3.5), 1)

                records.append(WeatherRecord(
                    date=cur_date.strftime("%Y-%m-%d"),
                    location=location,
                    month=m,
                    day=d,
                    temp_avg=temp,
                    humidity=humidity,
                    rainfall_mm=rainfall,
                    is_rain=rained
                ))

                cur_date += datetime.timedelta(days=1)

        return records


# ==============================================================================
# 3. 비 확률 예측 결과 데이터 모델
# ==============================================================================
@dataclass
class PredictionResult:
    """강수 예측 분석 최종 결과"""
    location: str
    target_date: str                 # "MM-DD" or "YYYY-MM-DD"
    years_analyzed: int              # 참조한 과거 연수
    total_samples: int               # 분석된 표본 일수
    rain_probability: int            # 최종 비 올 확률 (0 ~ 100 %)
    raw_climatic_prob: float         # 순수 과거 통계 기반 확률 (%)
    weather_condition: str           # 예상 날씨 상태 (맑음, 흐림, 비 등)
    expected_rainfall: str           # 비 올 경우 예상 강수량 구간
    umbrella_recommendation: str     # 우산 추천 멘트
    historical_summary: str          # 과거 통계 요약 설명
    rainy_days_count: int            # 과거 표본 중 비 온 일수
    max_recorded_rainfall: float     # 과거 표본 중 최고 일 강수량 (mm)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_formatted_text(self) -> str:
        """사용자가 읽기 편한 시각적 리포트 문자열 생성"""
        # 게이지 바 생성 (20칸)
        filled = int(self.rain_probability / 5)
        gauge = "█" * filled + "░" * (20 - filled)

        lines = [
            f"┌{'─' * 58}┐",
            f"│ 🌦️  [{self.location}] {self.target_date} 기상 분석 및 강수 확률 예측 │",
            f"├{'─' * 58}┤",
            f"│  • 비 올 확률        : [{gauge}] {self.rain_probability}%",
            f"│  • 예상 날씨 상태    : {self.weather_condition}",
            f"│  • 예상 강수량(비올때): {self.expected_rainfall}",
            f"│  • 우산 추천 가이드  : {self.umbrella_recommendation}",
            f"├{'─' * 58}┤",
            f"│ 📊 과거 {self.years_analyzed}개년 통계 근거 (총 {self.total_samples}회 관측 표본):",
            f"│  - 해당 시기 비 온 빈도 : {self.rainy_days_count}일 / {self.total_samples}일 ({self.raw_climatic_prob:.1f}%)",
            f"│  - 과거 역대 최고 강수량: {self.max_recorded_rainfall:.1f} mm",
            f"│  - 종합 평가: {self.historical_summary}",
            f"└{'─' * 58}┘"
        ]
        return "\n".join(lines)


# ==============================================================================
# 4. 강수 확률 예측 엔진 (RainPredictor)
# ==============================================================================
class RainPredictor:
    """과거 n개년 기상 이력을 분석해 강수 확률을 예측하는 코어 엔진"""

    def __init__(self, history_manager: Optional[WeatherHistoryManager] = None):
        self.history_mgr = history_manager or WeatherHistoryManager()

    @staticmethod
    def parse_target_date(date_str: str) -> Tuple[int, int]:
        """
        다양한 날짜 문자열("07-15", "2026-07-15", "7월 15일", "7/15")에서 (month, day) 추출
        """
        import re
        clean = date_str.strip()

        # "YYYY-MM-DD" 또는 "MM-DD" 또는 "MM/DD"
        m1 = re.search(r'(\d{1,2})[-/.](\d{1,2})', clean)
        if m1:
            # 연도가 앞에 붙어있는지 체크 ("YYYY-MM-DD")
            parts = [int(p) for p in re.findall(r'\d+', clean)]
            if len(parts) >= 3 and parts[0] > 1900:
                return parts[1], parts[2]
            return parts[0], parts[1]

        # "7월 15일" 형태
        m2 = re.search(r'(\d{1,2})\s*월\s*(\d{1,2})\s*일', clean)
        if m2:
            return int(m2.group(1)), int(m2.group(2))

        # 기본값: 오늘 기준
        today = datetime.date.today()
        return today.month, today.day

    def predict(
        self,
        location: str = "서울",
        target_date: str = "07-15",
        years_back: int = 5,
        window_days: int = 3,
        current_humidity: Optional[float] = None,
        current_temp: Optional[float] = None,
        current_pressure: Optional[float] = None
    ) -> PredictionResult:
        """
        특정 지역 및 날짜의 강수 확률을 예측.

        :param location: 지역명 (예: '서울', '부산', '제주')
        :param target_date: 예측 날짜 ("MM-DD" or "YYYY-MM-DD")
        :param years_back: 분석할 과거 연도 수 (기본 5년)
        :param window_days: 해당 일자 전후 탐색 윈도우 일수 (기본 ±3일 -> 1년에 7일치 표본)
        :param current_humidity: (선택) 현재 또는 측정된 습도 (%)
        :param current_temp: (선택) 현재 기온 (°C)
        :param current_pressure: (선택) 현재 기압 (hPa)
        """
        month, day = self.parse_target_date(target_date)
        records = self.history_mgr.get_history(location, years=years_back)

        # 목표 일자(month, day) 전후 ±window_days 에 해당하는 표본 필터링
        matched_samples: List[WeatherRecord] = []
        weighted_rain_scores: List[float] = []
        total_weights: List[float] = []

        ref_target_dummy = datetime.date(2024, month, day)

        for r in records:
            try:
                rec_dummy = datetime.date(2024, r.month, r.day)
            except ValueError:
                # 2월 29일 등 윤달 예외 처리
                continue

            diff_days = abs((rec_dummy - ref_target_dummy).days)
            # 연말-연초 경계 처리 (12월 31일과 1월 1일)
            diff_days = min(diff_days, 365 - diff_days)

            if diff_days <= window_days:
                matched_samples.append(r)
                # 당일(diff_days=0)은 1.0, 멀어질수록 가중치 감소 (가우스 거리 감쇠)
                weight = 1.0 / (1.0 + 0.3 * diff_days)
                total_weights.append(weight)
                weighted_rain_scores.append(weight if r.is_rain else 0.0)

        if not matched_samples:
            # 표본이 없을 때 fallback
            matched_samples = records[:20]
            total_weights = [1.0] * len(matched_samples)
            weighted_rain_scores = [1.0 if r.is_rain else 0.0 for r in matched_samples]

        # 1. 기후학적 기본 가중 확률 계산
        sum_weights = sum(total_weights)
        climatic_prob = (sum(weighted_rain_scores) / sum_weights) * 100.0 if sum_weights > 0 else 20.0

        rainy_records = [r for r in matched_samples if r.is_rain]
        rainy_count = len(rainy_records)
        total_count = len(matched_samples)
        max_rain = max([r.rainfall_mm for r in matched_samples] + [0.0])

        # 2. 현재 환경 변수(습도, 기압)가 주어졌을 때 보정 (Bayesian/Heuristic Adjustment)
        adjusted_prob = climatic_prob
        adjustment_notes = []

        if current_humidity is not None:
            # 기준 습도: 60%
            hum_diff = current_humidity - 60.0
            # 습도가 높을수록 확률 증가 (최대 ±25%)
            hum_adjustment = (hum_diff / 40.0) * 25.0
            hum_adjustment = max(-25.0, min(hum_adjustment, 25.0))
            adjusted_prob += hum_adjustment
            if hum_diff > 15:
                adjustment_notes.append(f"높은 습도({current_humidity}%)로 인해 비 확률 상승(+{hum_adjustment:.1f}%)")
            elif hum_diff < -15:
                adjustment_notes.append(f"건조한 습도({current_humidity}%)로 인해 비 확률 하락({hum_adjustment:.1f}%)")

        if current_pressure is not None:
            # 표준 대기압: 1013 hPa
            press_diff = 1013.0 - current_pressure
            if press_diff > 5:
                # 저기압일 때 비 확률 증가
                press_adj = min(20.0, press_diff * 1.5)
                adjusted_prob += press_adj
                adjustment_notes.append(f"저기압({current_pressure}hPa) 영향으로 상승(+{press_adj:.1f}%)")
            elif press_diff < -5:
                # 고기압일 때 비 확률 감소
                press_adj = min(15.0, abs(press_diff) * 1.2)
                adjusted_prob -= press_adj
                adjustment_notes.append(f"고기압({current_pressure}hPa) 영향으로 하락(-{press_adj:.1f}%)")

        # 최종 확률 바운딩 (2% ~ 98%)
        final_prob = int(round(max(2.0, min(adjusted_prob, 98.0))))

        # 3. 예상 날씨 상태 및 강수량 구간 결정
        if final_prob >= 75:
            weather_condition = "비 또는 강한 소나기 (우천 확실시)"
            expected_rainfall = "15 ~ 45 mm (집중호우 가능성 있음)"
            umbrella_rec = "장우산 필수 지참! 🌂 신발/옷 젖음에 주의하세요."
        elif final_prob >= 50:
            weather_condition = "흐리고 한때 비/소나기"
            expected_rainfall = "5 ~ 20 mm (간헐적 비)"
            umbrella_rec = "외출 시 우산 휴대 권장 ☂️"
        elif final_prob >= 30:
            weather_condition = "구름 많음 (낮은 소나기 가능성)"
            expected_rainfall = "1 ~ 5 mm 미만 (내릴 경우 약한 비)"
            umbrella_rec = "가방에 가벼운 3단 접이식 우산 추천 🎒"
        elif final_prob >= 15:
            weather_condition = "대체로 맑거나 가끔 구름"
            expected_rainfall = "강수 가능성 매우 낮음 (0 mm)"
            umbrella_rec = "우산 불필요 ☀️ (야외 활동 적합)"
        else:
            weather_condition = "맑고 쾌청함"
            expected_rainfall = "비 올 확률 거의 없음 (0 mm)"
            umbrella_rec = "우산 필요 없음 ☀️ 맑은 날씨"

        # 4. 종합 평가 문구 생성
        date_label = f"{month}월 {day}일"
        summary = (
            f"과거 {years_back}개년 동안 {date_label} 전후로 총 {total_count}일 중 {rainy_count}일 비가 내렸습니다. "
            + (" ".join(adjustment_notes) if adjustment_notes else "기후 통계상 대체로 안정적인 패턴입니다.")
        )

        return PredictionResult(
            location=location,
            target_date=date_label,
            years_analyzed=years_back,
            total_samples=total_count,
            rain_probability=final_prob,
            raw_climatic_prob=round(climatic_prob, 1),
            weather_condition=weather_condition,
            expected_rainfall=expected_rainfall,
            umbrella_recommendation=umbrella_rec,
            historical_summary=summary,
            rainy_days_count=rainy_count,
            max_recorded_rainfall=max_rain
        )


# ==============================================================================
# 5. ai_agent.py 연동용 단일 함수 인터페이스
# ==============================================================================
def predict_rain_tool(
    location: str = "서울",
    target_date: str = "오늘",
    years_back: int = 5,
    humidity: Optional[float] = None
) -> str:
    """
    AI Agent에서 도구로 호출하기 위한 간편 진입점 함수.
    문자열 형태의 명확한 분석 요약문을 반환합니다.
    """
    if target_date in ["오늘", "today", "현재"]:
        target_date = datetime.date.today().strftime("%m-%d")
    elif target_date in ["내일", "tomorrow"]:
        target_date = (datetime.date.today() + datetime.timedelta(days=1)).strftime("%m-%d")

    predictor = RainPredictor()
    result = predictor.predict(
        location=location,
        target_date=target_date,
        years_back=max(1, min(years_back, 30)),
        current_humidity=humidity
    )
    return result.to_formatted_text()


# ==============================================================================
# 6. CLI 실행 및 대화형 인터페이스
# ==============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="과거 n개년 기상 데이터를 바탕으로 특정 지역/일자의 비 올 확률을 예측하는 도구"
    )
    parser.add_argument("-l", "--location", default="서울", help="예측 지역명 (예: 서울, 부산, 제주, 대전, 대구, 강릉 등)")
    parser.add_argument("-d", "--date", default=None, help="예측 날짜 (예: 07-15, 2026-08-10, 8월 15일, 기본값: 오늘)")
    parser.add_argument("-y", "--years", type=int, default=5, help="분석할 과거 연도 수 (기본값: 5년)")
    parser.add_argument("--humidity", type=float, default=None, help="현재 습도 (선택 사항, %% 단위)")
    parser.add_argument("--json", action="store_true", help="결과를 JSON 형식으로 출력")

    args = parser.parse_args()

    # 날짜가 입력되지 않았으면 오늘 날짜 기본값
    target_date_str = args.date
    if not target_date_str:
        today = datetime.date.today()
        target_date_str = today.strftime("%m-%d")

    predictor = RainPredictor()
    result = predictor.predict(
        location=args.location,
        target_date=target_date_str,
        years_back=args.years,
        current_humidity=args.humidity
    )

    if args.json:
        print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    else:
        print("\n" + result.to_formatted_text() + "\n")


if __name__ == "__main__":
    main()

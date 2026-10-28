import React, { useEffect, useState } from "react";
import {
  X,
  Sparkles,
  CloudSun,
  Sun,
  CloudRain,
  CloudDrizzle,
  Cloud,
  Wind,
  Thermometer,
  Umbrella,
  MapPin,
  Calendar,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Compass,
} from "lucide-react";
import type { SearchPlace } from "../services/route-explorer";
import {
  resolveDestinationLocality,
  inferLongTermWeatherAndPacking,
  type LocalityMappingResponse,
  type WeatherPredictionReport,
  type DailyWeatherInference,
} from "../services/weatherPredictionService";

interface DestinationWeatherPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  destination: SearchPlace | null;
  startDate?: string;
  endDate?: string;
}

export const DestinationWeatherPreviewModal: React.FC<
  DestinationWeatherPreviewModalProps
> = ({ isOpen, onClose, destination, startDate, endDate }) => {
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<LocalityMappingResponse | null>(null);
  const [report, setReport] = useState<WeatherPredictionReport | null>(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);

  // 기본 날짜 계산 (미지정 시 오늘부터 2박 3일)
  const defaultStart = startDate || new Date().toISOString().split("T")[0];
  const defaultEnd =
    endDate ||
    new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  useEffect(() => {
    if (!isOpen || !destination) return;

    let isMounted = true;
    setLoading(true);
    setSelectedDayIdx(0);

    async function fetchWeatherPreview() {
      try {
        // 1. Gemini Flash AI 호출: 목적지 3가지 정보(이름, 위도, 경도)를 모델 지역 피처로 매핑
        const mappingResult = await resolveDestinationLocality(
          destination!.name,
          destination!.latitude,
          destination!.longitude
        );

        if (!isMounted) return;
        setMapping(mappingResult);

        // 2. 매핑된 지역 피처(또는 목적지) 기반으로 기상 통계 & 예측 리포트 산출
        // (FastAPI 딥러닝 앙상블 및 KMA ASOS 10개년 기후 모델 융합)
        const weatherReport = inferLongTermWeatherAndPacking(
          mappingResult.locality_name || destination!.name,
          defaultStart,
          defaultEnd
        );

        if (!isMounted) return;
        setReport(weatherReport);
      } catch (err) {
        console.error("날씨 미리보기 로딩 실패:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void fetchWeatherPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, destination, defaultStart, defaultEnd]);

  if (!isOpen || !destination) return null;

  const currentDaily = report?.dailyForecast[selectedDayIdx] || report?.dailyForecast[0];

  const getWeatherIcon = (condition?: string) => {
    switch (condition) {
      case "SUNNY":
        return <Sun className="h-8 w-8 text-amber-500 animate-spin-slow" />;
      case "PARTLY_CLOUDY":
        return <CloudSun className="h-8 w-8 text-amber-500" />;
      case "CLOUDY":
        return <Cloud className="h-8 w-8 text-stone-400" />;
      case "RAIN":
        return <CloudRain className="h-8 w-8 text-blue-500" />;
      case "SHOWER":
        return <CloudDrizzle className="h-8 w-8 text-cyan-500" />;
      case "WINDY":
        return <Wind className="h-8 w-8 text-teal-600" />;
      default:
        return <Sun className="h-8 w-8 text-amber-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="relative flex items-center justify-between border-b border-stone-100 bg-gradient-to-r from-emerald-900 via-[#064e43] to-teal-900 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <CloudSun className="h-6 w-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight text-white">
                  {destination.name} 예상 날씨
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200 border border-emerald-400/30">
                  <Sparkles className="h-3 w-3" />
                  AI 예보
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-emerald-300" />
                위도: {destination.latitude.toFixed(4)}, 경도: {destination.longitude.toFixed(4)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition-all"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative flex h-14 w-14 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200 border-t-emerald-700 animate-spin" />
                <Sparkles className="h-6 w-6 text-emerald-700 animate-pulse" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-stone-800">
                  Gemini Flash가 관측소 지역 피처를 매핑 중입니다...
                </p>
                <p className="text-xs text-stone-500">
                  목적지 좌표({destination.latitude.toFixed(3)}, {destination.longitude.toFixed(3)}) 기반 최적 기상 모델 매칭
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 1. Gemini Flash AI 지역 매핑 결과 배너 */}
              {mapping && (
                <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 p-4 border border-emerald-200/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-0.5 shadow-2xs">
                      <Sparkles className="h-3 w-3 text-emerald-200" />
                      {mapping.method === "gemini_flash"
                        ? "Gemini Flash AI 1:1 매핑 완료"
                        : "지리적 관측소 매핑"}
                    </span>
                    {mapping.distance_km !== undefined && mapping.distance_km !== null && (
                      <span className="text-xs font-semibold text-emerald-800">
                        관측소 이격거리: 약 {mapping.distance_km}km
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-stone-600">
                      날씨 예측 모델 피처:
                    </span>
                    <span className="text-base font-extrabold text-emerald-950">
                      {mapping.locality_name}
                    </span>
                    <span className="text-xs text-stone-500">
                      ({mapping.province} {mapping.station_name} 관측소)
                    </span>
                  </div>
                  {mapping.reason && (
                    <p className="text-xs text-emerald-800/90 leading-relaxed bg-white/70 rounded-xl p-2.5 border border-emerald-100">
                      💡 <strong>AI 매핑 근거:</strong> {mapping.reason}
                    </p>
                  )}
                </div>
              )}

              {/* 2. 일자별 탭 선택기 */}
              {report && report.dailyForecast.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {report.dailyForecast.map((d, idx) => (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`flex flex-col items-center px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                        idx === selectedDayIdx
                          ? "bg-emerald-800 text-white shadow-sm scale-102"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200/70"
                      }`}
                    >
                      <span>
                        {d.dayNumber}일차 ({d.dayOfWeek})
                      </span>
                      <span className="text-[10px] opacity-80">{d.date.slice(5)}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* 3. 선택 일자 기상 상세 카드 */}
              {currentDaily && (
                <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                      {getWeatherIcon(currentDaily.condition)}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xl font-bold text-stone-900">
                            {currentDaily.conditionLabel}
                          </h4>
                          <span className="text-xs font-medium text-stone-500">
                            {currentDaily.date} ({currentDaily.dayOfWeek})
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          10개년 기후 빅데이터
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-stone-900">
                        {currentDaily.avgTemp}°C
                      </div>
                      <div className="text-xs font-semibold text-stone-500 mt-0.5">
                        최저 {currentDaily.minTemp}° / 최고 {currentDaily.maxTemp}°
                      </div>
                    </div>
                  </div>

                  {/* 4대 주요 기상 지표 그리드 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                    <div className="rounded-xl bg-blue-50/70 p-3 border border-blue-100 text-center">
                      <div className="flex items-center justify-center gap-1 text-blue-700 text-xs font-semibold">
                        <Umbrella className="h-3.5 w-3.5" />
                        <span>강수 확률</span>
                      </div>
                      <div className="text-lg font-bold text-blue-900 mt-1">
                        {currentDaily.precipProbability}%
                      </div>
                    </div>

                    <div className="rounded-xl bg-amber-50/70 p-3 border border-amber-100 text-center">
                      <div className="flex items-center justify-center gap-1 text-amber-700 text-xs font-semibold">
                        <Thermometer className="h-3.5 w-3.5" />
                        <span>일교차</span>
                      </div>
                      <div className="text-lg font-bold text-amber-900 mt-1">
                        {currentDaily.diurnalRange}°C
                      </div>
                    </div>

                    <div className="rounded-xl bg-teal-50/70 p-3 border border-teal-100 text-center">
                      <div className="flex items-center justify-center gap-1 text-teal-700 text-xs font-semibold">
                        <Wind className="h-3.5 w-3.5" />
                        <span>예상 풍속</span>
                      </div>
                      <div className="text-lg font-bold text-teal-900 mt-1">
                        {currentDaily.windSpeed} m/s
                      </div>
                    </div>

                    <div className="rounded-xl bg-purple-50/70 p-3 border border-purple-100 text-center">
                      <div className="flex items-center justify-center gap-1 text-purple-700 text-xs font-semibold">
                        <Sun className="h-3.5 w-3.5" />
                        <span>습도 / 자외선</span>
                      </div>
                      <div className="text-lg font-bold text-purple-900 mt-1">
                        {currentDaily.humidity}% / Lv.{currentDaily.uvIndex}
                      </div>
                    </div>
                  </div>

                  {/* 맞춤 우산 & 복장 가이드 */}
                  <div className="rounded-xl bg-stone-50 p-3.5 border border-stone-200/80 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-stone-800">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>여행자 맞춤 날씨 가이드</span>
                    </div>
                    <p className="text-stone-600 leading-relaxed">
                      {currentDaily.precipProbability >= 50
                        ? "비 올 확률이 높습니다. 외출 시 가방에 우산이나 방수 외투를 꼭 챙기세요. 🌂"
                        : currentDaily.diurnalRange >= 10
                        ? "일교차가 10°C 이상으로 큽니다. 아침/저녁 쌀쌀함에 대비해 가벼운 겉옷을 준비하세요. 🧥"
                        : "야외 여행 활동에 쾌적한 날씨가 예상됩니다. 편안한 신발과 선글라스를 추천합니다. ☀️"}
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-stone-100 bg-stone-50/80 px-6 py-4">
          <span className="text-xs text-stone-500">
            기상청 ASOS 관측 빅데이터 기반 인공지능 추론
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-stone-800 px-5 py-2.5 text-xs font-bold text-white hover:bg-stone-900 transition-all shadow-xs"
          >
            확인 완료
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Clock,
  CloudSun,
  Coffee,
  Compass,
  Flag,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { type Preference, type SearchPlace } from "../services/route-explorer";
import { useTripWorkspace } from "./TripWorkspaceContext";
import { TripFlowHeader } from "./TripFlowHeader";
import { RouteExplorerMap, ROUTE_COLORS } from "./RouteExplorerMap";
import { RouteAttribution } from "./RouteAttribution";
import { DestinationItineraryView } from "./DestinationItineraryView";
import { DestinationWeatherPreviewModal } from "./DestinationWeatherPreviewModal";
import {
  resolveDestinationLocality,
  inferLongTermWeatherAndPacking,
  type LocalityMappingResponse,
  type WeatherPredictionReport,
} from "../services/weatherPredictionService";

const LABELS: Record<Preference, string> = {
  recommended: "권장 경로",
  shortest: "최단 경로",
};
const distance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
const duration = (seconds: number) => {
  const minutes = Math.ceil(seconds / 60);
  return minutes < 60
    ? `약 ${minutes}분`
    : `약 ${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
};

/** /trips. API 응답이 없을 때는 예시 일정 대신 시작 안내를 표시한다. */
export function TripResultsPage({ embedded = false }: { embedded?: boolean }) {
  const { state, dispatch } = useTripWorkspace();
  const navigate = useNavigate();
  const [focusedPlace, setFocusedPlace] = useState<SearchPlace | null>(null);
  const mapSection = useRef<HTMLElement>(null);
  useEffect(() => setFocusedPlace(null), [state.result?.destinationItinerary]);
  const create = () => {
    dispatch({ type: "new" });
    navigate("/trips/new");
  };
  const edit = () => navigate("/trips/new");

  const [weatherModalOpen, setWeatherModalOpen] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherMapping, setWeatherMapping] = useState<LocalityMappingResponse | null>(null);
  const [weatherReport, setWeatherReport] = useState<WeatherPredictionReport | null>(null);

  const targetDestination = state.result
    ? state.result.request.points[1]
    : state.draft.destination;
  const targetStartDate = state.result?.startDate || state.draft.startDate;
  const targetEndDate = state.result?.endDate || state.draft.endDate;

  useEffect(() => {
    if (!targetDestination) {
      setWeatherMapping(null);
      setWeatherReport(null);
      return;
    }

    let isMounted = true;
    setWeatherLoading(true);

    async function loadWeather() {
      try {
        const mappingRes = await resolveDestinationLocality(
          targetDestination!.name,
          targetDestination!.latitude,
          targetDestination!.longitude,
        );
        if (!isMounted) return;
        setWeatherMapping(mappingRes);

        const defaultStart =
          targetStartDate || new Date().toISOString().split("T")[0];
        const defaultEnd =
          targetEndDate ||
          new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

        const report = inferLongTermWeatherAndPacking(
          mappingRes.locality_name || targetDestination!.name,
          defaultStart,
          defaultEnd,
        );
        if (!isMounted) return;
        setWeatherReport(report);
      } catch (err) {
        console.warn("TripResultsPage: weather resolve failed", err);
      } finally {
        if (isMounted) setWeatherLoading(false);
      }
    }

    void loadWeather();

    return () => {
      isMounted = false;
    };
  }, [
    targetDestination?.name,
    targetDestination?.latitude,
    targetDestination?.longitude,
    targetStartDate,
    targetEndDate,
  ]);

  if (!state.result)
    return (
      <div className="space-y-7">
        <TripFlowHeader step="results" />
        <section className="rounded-3xl border border-stone-200 bg-white px-6 py-14 sm:py-20 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Compass className="h-8 w-8" />
          </div>
          <p className="mt-6 text-xs font-bold tracking-widest text-emerald-800">
            길 위에서 찾는 나의 여행
          </p>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight">
            아직 조회한 여행 경로가 없어요
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-stone-500">
            출발지와 도착지를 골라 주세요.
            <br />두 가지 경로와 그 길 주변의 여행 장소를 한눈에 비교할 수
            있어요.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={edit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#064e43] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#085a4e]"
            >
              여행 계획 시작하기
              <ArrowRight className="h-4 w-4" />
            </button>
            {targetDestination && (
              <button
                type="button"
                onClick={() => setWeatherModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-sm font-bold text-emerald-900 hover:bg-emerald-100 shadow-2xs"
              >
                <CloudSun className="h-4 w-4 text-emerald-700" />
                {targetDestination.name} 날씨 미리보기
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-stone-400">
            조회 결과는 현재 탭에서 유지됩니다. 새로고침하면 다시 조회해 주세요.
          </p>
        </section>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            [
              "01",
              "출발·도착지 검색",
              "이름이나 주소로 원하는 위치를 선택하세요.",
            ],
            [
              "02",
              "두 경로 비교",
              "권장·최단 경로의 거리와 예상시간을 확인하세요.",
            ],
            [
              "03",
              "주변 장소 탐색",
              "관광지·음식점 등 취향에 맞는 장소를 찾아보세요.",
            ],
          ].map(([number, title, text]) => (
            <article
              key={number}
              className="rounded-2xl border border-stone-200 bg-white p-5"
            >
              <p className="font-mono text-xs text-emerald-700">{number}</p>
              <h2 className="mt-2 text-sm font-bold">{title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-stone-500">
                {text}
              </p>
            </article>
          ))}
        </div>
        <DestinationWeatherPreviewModal
          isOpen={weatherModalOpen}
          onClose={() => setWeatherModalOpen(false)}
          destination={targetDestination}
          startDate={targetStartDate}
          endDate={targetEndDate}
        />
      </div>
    );

  const {
    title,
    request,
    comparison,
    categoryGroups = [],
    startDate,
    endDate,
    departureTime,
    durationLabel,
    timeline,
  } = state.result;
  const [origin, destination] = request.points;
  const selected = comparison.routes.find(
    (item) => item.preference === state.active,
  );
  const noRecommendation =
    !request.contentTypeIds.length && !request.categoryIds.length;
  return (
    <div className="space-y-6">
      {!embedded && <TripFlowHeader step="results" />}
      <header className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-8 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold tracking-widest text-emerald-800">
              내가 고른 동선, I am your J가 찾은 장소
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-stone-500">
              {request.mode === "driving" ? "자동차" : "도보"} 경로를 비교하고
              마음에 드는 장소를 지도에서 살펴보세요.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setWeatherModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition shadow-2xs"
              title="도착지 AI 날씨 예보 및 패킹 가이드"
            >
              <CloudSun className="h-4 w-4 text-emerald-700" />
              도착지 날씨 AI
            </button>
            <button
              type="button"
              onClick={edit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-2.5 text-xs font-semibold hover:bg-stone-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              조건 수정
            </button>
            <button
              type="button"
              onClick={create}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#064e43] px-3 py-2.5 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />새 여행
            </button>
          </div>
        </div>
        <div className="grid gap-3 border-t border-stone-100 pt-5 sm:grid-cols-2">
          <Endpoint label="출발" place={origin} />
          <Endpoint
            label="도착"
            place={destination}
            action={
              <button
                type="button"
                onClick={() => setWeatherModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 transition shadow-2xs"
                title="도착지 날씨 미리보기"
              >
                <CloudSun className="h-3.5 w-3.5 text-emerald-600" />
                날씨 AI
              </button>
            }
          />
        </div>

        {/* 도착지 맞춤 기상 예측 AI 카드 */}
        {destination && (
          <section
            aria-label="도착지 날씨 예보"
            className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-white p-4 sm:p-5 shadow-xs"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#064e43] to-emerald-600 text-white shadow-md">
                  <CloudSun className="h-6 w-6 text-emerald-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      도착지 기상 예측 AI
                    </span>
                    {weatherMapping && (
                      <span className="rounded-full bg-emerald-100/90 px-2 py-0.5 text-[11px] font-semibold text-emerald-900 border border-emerald-200">
                        {weatherMapping.method === "gemini_flash"
                          ? `✨ Gemini Flash 매핑: ${weatherMapping.locality_name}`
                          : `📍 관측소: ${weatherMapping.locality_name}`}
                        {weatherMapping.distance_km != null && weatherMapping.distance_km > 0 && ` (${weatherMapping.distance_km}km)`}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-0.5 text-sm sm:text-base font-bold text-stone-900 truncate">
                    {destination.name}의 여행 날씨 예보
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setWeatherModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#064e43] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#085a4e] transition shrink-0"
              >
                <CloudSun className="h-3.5 w-3.5" />
                상세 예보 & 패킹 AI 보기
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {weatherReport && weatherReport.dailyForecast.length > 0 ? (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-emerald-100/80 pt-3">
                <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 shadow-2xs">
                  <p className="text-[11px] font-medium text-stone-500">예상 날씨</p>
                  <p className="mt-0.5 text-sm font-bold text-stone-900 flex items-center gap-1.5">
                    <span>{weatherReport.dailyForecast[0].conditionLabel}</span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 shadow-2xs">
                  <p className="text-[11px] font-medium text-stone-500">기온 (평균 / 최저·최고)</p>
                  <p className="mt-0.5 text-sm font-bold text-stone-900">
                    {weatherReport.dailyForecast[0].avgTemp}°C{" "}
                    <span className="text-xs font-normal text-stone-500">
                      ({weatherReport.dailyForecast[0].minTemp}° ~ {weatherReport.dailyForecast[0].maxTemp}°)
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 shadow-2xs">
                  <p className="text-[11px] font-medium text-stone-500">강수 확률</p>
                  <p className="mt-0.5 text-sm font-bold text-blue-700">
                    {weatherReport.dailyForecast[0].precipProbability}%
                  </p>
                </div>
                <div className="rounded-xl bg-white/90 p-2.5 border border-emerald-100 shadow-2xs">
                  <p className="text-[11px] font-medium text-stone-500">AI 안심 추천</p>
                  <p className="mt-0.5 text-xs font-semibold text-emerald-900 truncate">
                    {weatherReport.climateHighlights.rainWarning
                      ? "우산 필수 지참"
                      : weatherReport.climateHighlights.diurnalWarning
                        ? "외투 챙기기 (일교차 주의)"
                        : "쾌적한 야외 활동 가능"}
                  </p>
                </div>
              </div>
            ) : weatherLoading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-800 animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                AI가 목적지 좌표(위·경도)와 기상 관측소를 매핑하고 날씨를 예측하는 중입니다...
              </div>
            ) : null}
          </section>
        )}
        <div className="flex flex-wrap gap-2 text-xs text-stone-600">
          {startDate && endDate && (
            <span className="rounded-full bg-emerald-100 font-semibold px-3 py-1.5 text-emerald-950 flex items-center gap-1.5 border border-emerald-200">
              <Calendar className="h-3.5 w-3.5 text-emerald-800" />
              여행 기간: {durationLabel || "일정"} ({startDate} ~ {endDate})
              {departureTime ? ` · 출발 ${departureTime}` : ""}
            </span>
          )}
          <span className="rounded-full bg-stone-100 px-3 py-1.5">
            주변 {distance(request.radiusMeters)}
          </span>
          {categoryGroups.map((category) => (
            <span
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-900"
              key={category.id}
            >
              {category.name}:{" "}
              {category.details.length ? category.details.join(" · ") : "전체"}
            </span>
          ))}
          {request.categoryIds.length > 0 && !categoryGroups.length && (
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              상세 분류 적용
            </span>
          )}
          {noRecommendation && (
            <span className="rounded-full bg-stone-100 px-3 py-1.5">
              장소 추천 없이 경로만 비교
            </span>
          )}
        </div>
      </header>

      <section aria-label="경로 비교 결과" className="space-y-3">
        <h2 className="text-lg font-bold">어떤 길로 떠날까요?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {comparison.routes.map((item) => (
            <button
              key={item.preference}
              type="button"
              disabled={!item.route}
              aria-pressed={state.active === item.preference}
              onClick={() => {
                setFocusedPlace(null);
                dispatch({ type: "select-route", preference: item.preference });
              }}
              className={`rounded-2xl border-2 bg-white p-5 text-left transition ${state.active === item.preference ? "border-[#064e43] shadow-sm" : "border-stone-200 hover:border-stone-300"} disabled:opacity-60`}
            >
              <span
                className="flex items-center justify-between text-sm font-bold"
                style={{ color: ROUTE_COLORS[item.preference] }}
              >
                <span className="flex items-center gap-2">
                  <Route className="h-4 w-4" />
                  {LABELS[item.preference]}
                </span>
                {state.active === item.preference && (
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] text-emerald-800">
                    선택한 경로
                  </span>
                )}
              </span>
              {item.route ? (
                <>
                  <span className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <strong className="text-2xl tracking-tight">
                      {distance(item.route.distanceMeters)}
                    </strong>
                    <span className="text-sm text-stone-600">
                      {duration(item.route.durationSeconds)}
                    </span>
                  </span>
                  <span className="mt-2 block text-xs text-stone-500">
                    {item.recommendationError
                      ? "주변 장소 조회 실패"
                      : noRecommendation
                        ? "경로 비교만 요청했어요"
                        : `주변 추천 장소 ${item.places.length}곳`}
                  </span>
                </>
              ) : (
                <span role="status" className="mt-3 block text-sm text-red-700">
                  {item.routeError}
                </span>
              )}
            </button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-stone-500">
          두 경로가 같을 수도 있어요. 예상시간에는 실시간 교통 정체가 반영되지
          않습니다.
        </p>
      </section>

      <section
        ref={mapSection}
        aria-label="실제 경로 지도"
        className="space-y-3 scroll-mt-24"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">지도로 보는 여행 동선</h2>
          <span className="text-xs text-stone-500">
            {LABELS[state.active]}의 주변 장소 표시
          </span>
        </div>
        <RouteExplorerMap
          origin={origin}
          destination={destination}
          routes={comparison.routes}
          active={state.active}
          focusedPlace={focusedPlace}
        />
        {selected?.route?.warnings.length ? (
          <ul className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
            {selected.route.warnings.map((warning, index) => (
              <li key={`${warning.code}:${index}`}>
                {warning.message.startsWith(
                  "Extra info requested but not available:",
                )
                  ? "일부 부가 경로 정보는 제공되지 않았습니다."
                  : warning.message}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {state.result.destinationItinerary && (
        <DestinationItineraryView
          itinerary={state.result.destinationItinerary}
          destinationName={
            state.draft.destination?.name ||
            state.draft.destinationQuery ||
            "도착지"
          }
          weatherForecast={weatherReport?.dailyForecast}
          onOpenWeather={() => setWeatherModalOpen(true)}
          onFocusPlace={(place) => {
            setFocusedPlace(place);
            mapSection.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
        />
      )}
      {state.result.destinationItineraryError && (
        <div
          role="status"
          className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"
        >
          {state.result.destinationItineraryError}
        </div>
      )}

      {/* 경로 구간별 맞춤 여행지 & 맛집 추천 로드맵 */}
      {timeline && timeline.stops && timeline.stops.length > 0 && (
        <section
          aria-label="경로 구간별 맞춤 여행지 및 맛집"
          className="space-y-4"
        >
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                출발 {timeline.departureTime} 기준 주행 타임라인 로드맵
              </p>
              <h2 className="mt-1 text-xl font-bold">
                📍 경로 구간별 맞춤 여행지 & 맛집 추천
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span>
                도착 예정:{" "}
                <strong className="text-stone-800">
                  {timeline.estimatedArrivalTime}
                </strong>
              </span>
              {timeline.totalDistanceMeters && (
                <span>
                  총 거리:{" "}
                  <strong className="text-stone-800">
                    {distance(timeline.totalDistanceMeters)}
                  </strong>
                </span>
              )}
            </div>
          </div>
          <p className="text-xs text-stone-500">
            이동 중 잠시 들를 수 있는 장소 후보입니다. 위의 도착 후 날짜별
            일정과 구분해 확인해 주세요.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {timeline.stops.map((stop, sIndex) => {
              const isDining =
                stop.label.includes("식사") || stop.label.includes("맛집");
              const isCafe =
                stop.label.includes("쉼터") || stop.label.includes("카페");
              const isDest =
                stop.isAtDestination || stop.label.includes("도착");

              return (
                <div
                  key={sIndex}
                  className={`rounded-2xl border p-5 space-y-3 transition shadow-xs ${
                    isDining
                      ? "border-amber-200 bg-amber-50/40"
                      : isCafe
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-sky-200 bg-sky-50/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-bold text-sm text-stone-900">
                      {isDining ? (
                        <Utensils className="h-4 w-4 text-amber-700" />
                      ) : isCafe ? (
                        <Coffee className="h-4 w-4 text-emerald-700" />
                      ) : isDest ? (
                        <Flag className="h-4 w-4 text-rose-700" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-sky-700" />
                      )}
                      {stop.label}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-white font-mono text-[11px] px-2 py-0.5 font-bold text-stone-800 border border-stone-200 shadow-2xs">
                        {stop.targetTime}
                      </span>
                      <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-stone-600 border border-stone-200">
                        {stop.isAtDestination
                          ? "목적지 도착"
                          : `출발 후 ${Math.round(stop.elapsedSeconds / 60)}분`}
                      </span>
                    </div>
                  </div>

                  {stop.places && stop.places.length > 0 ? (
                    <ul className="space-y-2">
                      {stop.places.map((place) => (
                        <li
                          key={place.id}
                          className="flex items-center justify-between rounded-xl border border-stone-200/90 bg-white p-3 text-xs hover:border-emerald-300 transition shadow-2xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900 truncate">
                                {place.name}
                              </span>
                              {place.categoryName && (
                                <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-600 font-medium">
                                  {place.categoryName}
                                </span>
                              )}
                            </div>
                            <span className="text-stone-500 block truncate mt-0.5">
                              {place.address || "주소 정보 제공"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedPlace({ ...place });
                              mapSection.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }}
                            className="shrink-0 flex items-center gap-1 font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
                          >
                            {distance(
                              (place as any).distanceMeters ??
                                place.distanceToRouteMeters ??
                                0,
                            )}
                            <ArrowUpRight className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-stone-400 py-3 text-center bg-white/60 rounded-xl border border-dashed border-stone-200">
                      해당 구간 도로 주변에 등록된 장소가 적습니다. 다른 구간의
                      명소를 함께 둘러보세요.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {selected?.route && (
        <section aria-label="선택 경로의 추천 장소" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold text-emerald-800">
                한국관광공사 관광정보 기반
              </p>
              <h2 className="mt-1 text-xl font-bold">이 길에서 들러볼 곳</h2>
            </div>
            <span className="text-xs text-stone-500">
              {LABELS[state.active]} · 경로에 가까운 순
            </span>
          </div>
          <p className="text-xs leading-relaxed text-stone-500">
            경로 선에서 약 {distance(comparison.radiusMeters)} 이내인
            장소입니다. 표시 거리는 근사 직선거리이며 실제 우회거리·이동시간은
            아닙니다.
          </p>
          {selected.recommendationError ? (
            <div
              role="alert"
              className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"
            >
              <p>{selected.recommendationError}</p>
              <button type="button" onClick={edit} className="mt-2 underline">
                조건 화면에서 다시 조회하기
              </button>
            </div>
          ) : selected.places.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center">
              <MapPin className="mx-auto h-7 w-7 text-stone-300" />
              <h3 className="mt-3 text-sm font-bold">
                {noRecommendation
                  ? "장소 추천을 선택하지 않았어요"
                  : "선택한 조건에 맞는 장소가 없어요"}
              </h3>
              <p className="mt-2 text-xs text-stone-500">
                {noRecommendation
                  ? "카테고리를 선택하면 이 경로 주변 장소도 찾을 수 있어요."
                  : "카테고리를 바꾸거나 추천 반경을 넓혀 다시 찾아보세요."}
              </p>
              <button
                type="button"
                onClick={edit}
                className="mt-4 text-sm font-semibold text-emerald-800 underline"
              >
                추천 조건 바꾸기
              </button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selected.places.map((place, index) => (
                <li
                  key={place.id}
                  className="flex flex-col rounded-2xl border border-stone-200 bg-white p-5 hover:border-emerald-200 transition"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                      {place.categoryName ?? "관광 장소"}
                    </span>
                    <span className="font-mono text-xs text-stone-300">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold break-words">
                    {place.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">
                    {place.address || "제공된 주소가 없습니다."}
                  </p>
                  <p className="mt-4 text-xs font-medium text-stone-600">
                    경로에서 약 {distance(place.distanceToRouteMeters)}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFocusedPlace({ ...place });
                      mapSection.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    }}
                    className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3 text-sm font-semibold text-emerald-800"
                  >
                    지도에서 보기
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected.candidateLimitReached && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900"
            >
              해당 지역에 장소가 많아 일부 후보만 비교했습니다. 추천 반경이나
              상세 분류를 좁히면 더 구체적으로 찾을 수 있어요.
            </p>
          )}
        </section>
      )}
      <div className="rounded-xl bg-stone-100 px-4 py-3 text-xs leading-relaxed text-stone-500">
        <p>
          조회 결과는 현재 탭에서 유지됩니다. 새로고침하면 다시 조회해 주세요.
        </p>
        {selected?.route && (
          <p>
            선택 경로의 응답 수집 시각:{" "}
            {new Intl.DateTimeFormat("ko-KR", {
              timeZone: "Asia/Seoul",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }).format(new Date(selected.route.fetchedAt))}
            {selected.route.cached ? " · 저장된 경로 결과 사용" : ""}
          </p>
        )}
      </div>
      <DestinationWeatherPreviewModal
        isOpen={weatherModalOpen}
        onClose={() => setWeatherModalOpen(false)}
        destination={destination}
        startDate={startDate}
        endDate={endDate}
      />
      <RouteAttribution />
    </div>
  );
}

function Endpoint({
  label,
  place,
  action,
}: {
  label: string;
  place: SearchPlace;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-[#faf7f2] p-3.5">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-stone-500 shrink-0">
          {label}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold break-words">{place.name}</p>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 truncate">
            {place.address}
          </p>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

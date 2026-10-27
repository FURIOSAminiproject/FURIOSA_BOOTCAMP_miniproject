import React, { useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  MapPin,
  Pencil,
  Plus,
  Route,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CONTENT_TYPE_OPTIONS,
  type Preference,
  type SearchPlace,
} from "../services/route-explorer";
import { useTripWorkspace } from "./TripWorkspaceContext";
import { TripFlowHeader } from "./TripFlowHeader";
import { RouteExplorerMap, ROUTE_COLORS } from "./RouteExplorerMap";
import { RouteAttribution } from "./RouteAttribution";

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
  const create = () => {
    dispatch({ type: "new" });
    navigate("/trips/new");
  };
  const edit = () => navigate("/trips/new");
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
          <button
            type="button"
            onClick={edit}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#064e43] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#085a4e]"
          >
            여행 계획 시작하기
            <ArrowRight className="h-4 w-4" />
          </button>
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
      </div>
    );

  const { title, request, comparison } = state.result;
  const [origin, destination] = request.points;
  const selected = comparison.routes.find(
    (item) => item.preference === state.active,
  );
  const selectedCategories = CONTENT_TYPE_OPTIONS.filter((type) =>
    request.contentTypeIds.includes(type.id),
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
              내가 고른 동선, 길벗이 찾은 장소
            </p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight break-words">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-stone-500">
              {request.mode === "driving" ? "자동차" : "도보"} 경로를 비교하고
              마음에 드는 장소를 지도에서 살펴보세요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
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
          <Endpoint label="도착" place={destination} />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-stone-600">
          <span className="rounded-full bg-stone-100 px-3 py-1.5">
            주변 {distance(request.radiusMeters)}
          </span>
          {selectedCategories.map((category) => (
            <span
              className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-900"
              key={category.id}
            >
              {category.name}
            </span>
          ))}
          {request.categoryIds.length > 0 && (
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
                      {place.categoryName ??
                        CONTENT_TYPE_OPTIONS.find(
                          (type) => type.id === place.contentTypeId,
                        )?.name ??
                        "관광 장소"}
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
      <RouteAttribution />
    </div>
  );
}

function Endpoint({ label, place }: { label: string; place: SearchPlace }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#faf7f2] p-3.5">
      <span className="mt-0.5 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-stone-500">
        {label}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-bold break-words">{place.name}</p>
        <p className="mt-1 text-xs leading-relaxed text-stone-500">
          {place.address}
        </p>
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { ArrowRightLeft, MapPin, Route, Search } from "lucide-react";
import {
  compareRoutes,
  getRouteCategories,
  searchMapPlaces,
} from "../services/route-explorer";
import type {
  CategoryOptions,
  Comparison,
  Preference,
  SearchPlace,
} from "../services/route-explorer";
import type { LocationRouteMode } from "../types/location";
import { RouteExplorerMap, ROUTE_COLORS } from "./RouteExplorerMap";

const INITIAL_TYPES = [
  { id: 12, name: "관광지" },
  { id: 14, name: "문화시설" },
  { id: 15, name: "축제·공연·행사" },
  { id: 28, name: "레포츠" },
  { id: 32, name: "숙박" },
  { id: 38, name: "쇼핑" },
  { id: 39, name: "음식점" },
];
const LABELS: Record<Preference, string> = {
  recommended: "권장 경로",
  shortest: "최단 경로",
};
const distance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;
const duration = (seconds: number) => {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes < 60
    ? `약 ${minutes}분`
    : `약 ${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "조회하지 못했습니다. 다시 시도해 주세요.";

/** 입력 문자열과 선택 좌표를 분리한다. 글자를 수정하면 이전 선택/진행 중 요청을 즉시 폐기한다. */
function PlaceSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SearchPlace | null;
  onChange: (value: SearchPlace | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchPlace[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    if (value) setQuery(value.name);
  }, [value]);
  useEffect(() => () => request.current?.abort(), []);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2 || query.trim().length > 100) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setResults([]);
    setSearched(false);
    try {
      const places = await searchMapPlaces(query, controller.signal);
      if (request.current === controller && !controller.signal.aborted) {
        setResults(places);
        setSearched(true);
      }
    } catch (failure) {
      if (!controller.signal.aborted && request.current === controller)
        setError(message(failure));
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }

  return (
    <section className="space-y-2 min-w-0">
      <form onSubmit={search} className="space-y-2">
        <label className="block text-sm font-semibold text-stone-800">
          {label}
          <div className="mt-2 flex gap-2">
            <input
              aria-label={`${label} 검색어`}
              value={query}
              maxLength={100}
              placeholder="장소명 또는 주소 (예: 서울역)"
              className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm"
              onChange={(event) => {
                request.current?.abort();
                request.current = null;
                setBusy(false);
                setQuery(event.target.value);
                setResults([]);
                setError(null);
                setSearched(false);
                onChange(null);
              }}
            />
            <button
              type="submit"
              disabled={busy || query.trim().length < 2}
              className="rounded-xl bg-stone-800 text-white px-3 disabled:opacity-40 flex items-center gap-1 text-sm"
            >
              <Search className="w-4 h-4" />
              {busy ? "검색 중" : "검색"}
            </button>
          </div>
        </label>
      </form>
      {value && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 break-words">
          <MapPin className="inline w-4 h-4 mr-1" />
          선택: {value.name}
          <span className="block text-xs mt-1">{value.address}</span>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <ul className="max-h-60 overflow-auto rounded-xl border border-stone-200 divide-y divide-stone-100 bg-white">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-3 hover:bg-emerald-50"
                onClick={() => {
                  request.current?.abort();
                  request.current = null;
                  setBusy(false);
                  onChange(place);
                  setResults([]);
                  setSearched(false);
                }}
              >
                <span className="block text-sm font-semibold">
                  {place.name}
                </span>
                <span className="block text-xs text-stone-500 break-words">
                  {place.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && results.length === 0 && !value && (
        <p className="text-sm text-stone-500">
          검색 결과가 없습니다. 지역명을 포함해 다시 검색해 주세요.
        </p>
      )}
    </section>
  );
}

/** 독립 /routes 화면. 출발·도착 선택 → 두 경로 조회 → 경로별 장소 추천을 한 흐름으로 제공한다. */
export function RouteExplorerPage() {
  const [origin, setOrigin] = useState<SearchPlace | null>(null);
  const [destination, setDestination] = useState<SearchPlace | null>(null);
  const [mode, setMode] = useState<LocationRouteMode>("driving");
  const [options, setOptions] = useState<CategoryOptions>({
    contentTypes: INITIAL_TYPES,
    categories: [],
    warning: null,
  });
  const [contentTypeIds, setContentTypeIds] = useState<number[]>([12, 39]);
  const [categoryId, setCategoryId] = useState("");
  const [radiusMeters, setRadius] = useState(1000);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [active, setActive] = useState<Preference>("recommended");
  const [focusedPlace, setFocusedPlace] = useState<SearchPlace | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const visibleRoutes = comparison?.routes ?? [];
  const selected = visibleRoutes.find((item) => item.preference === active);

  useEffect(() => {
    const controller = new AbortController();
    void getRouteCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setOptions((current) => ({
            ...current,
            warning:
              "상세 분류를 불러오지 못했습니다. 기본 카테고리는 선택할 수 있습니다.",
          }));
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);

  /** 조건 수정/취소 시 예전 응답으로 선이나 추천 목록이 복구되지 않게 한다. */
  function reset() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setComparison(null);
    setFocusedPlace(null);
    setError(null);
  }

  async function compare() {
    if (!origin || !destination) return;
    reset();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const result = await compareRoutes(
        {
          mode,
          points: [origin, destination],
          contentTypeIds,
          categoryIds: categoryId ? [categoryId] : [],
          radiusMeters,
          limit: 10,
        },
        controller.signal,
      );
      if (request.current !== controller || controller.signal.aborted) return;
      setComparison(result);
      setActive(
        result.routes.find((item) => item.route)?.preference ?? "recommended",
      );
    } catch (failure) {
      if (!controller.signal.aborted && request.current === controller)
        setError(message(failure));
    } finally {
      if (request.current === controller) {
        setBusy(false);
        request.current = null;
      }
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-emerald-800">
          경로 따라 여행하기
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">
          두 경로를 비교하고, 들를 곳을 찾아보세요
        </h1>
        <p className="text-sm text-stone-600">
          출발지와 도착지를 검색해 선택하면 최단·권장 경로와 주변 관광 장소를
          보여드립니다.
        </p>
      </header>
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6 space-y-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
          <PlaceSearch
            label="출발지"
            value={origin}
            onChange={(value) => {
              reset();
              setOrigin(value);
            }}
          />
          <button
            type="button"
            aria-label="출발지와 도착지 바꾸기"
            disabled={!origin || !destination}
            onClick={() => {
              reset();
              setOrigin(destination);
              setDestination(origin);
            }}
            className="self-start md:mt-9 rounded-xl border border-stone-200 p-2 disabled:opacity-40 w-fit"
          >
            <ArrowRightLeft className="w-5 h-5" />
          </button>
          <PlaceSearch
            label="도착지"
            value={destination}
            onChange={(value) => {
              reset();
              setDestination(value);
            }}
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <label className="text-sm font-semibold">
            이동 방식{" "}
            <select
              aria-label="이동 방식"
              value={mode}
              onChange={(event) => {
                reset();
                setMode(event.target.value as LocationRouteMode);
              }}
              className="ml-2 rounded-lg border border-stone-300 p-2"
            >
              <option value="driving">자동차</option>
              <option value="walking">도보</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            경로 주변 반경{" "}
            <select
              aria-label="추천 반경"
              value={radiusMeters}
              onChange={(event) => {
                reset();
                setRadius(Number(event.target.value));
              }}
              className="ml-2 rounded-lg border border-stone-300 p-2"
            >
              {[500, 1000, 2000, 5000].map((value) => (
                <option key={value} value={value}>
                  {distance(value)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold mb-2">
            추천받을 장소 카테고리
          </legend>
          <div className="flex flex-wrap gap-2">
            {options.contentTypes.map((type) => (
              <label
                key={type.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${contentTypeIds.includes(type.id) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-stone-200"}`}
              >
                <input
                  type="checkbox"
                  checked={contentTypeIds.includes(type.id)}
                  onChange={() => {
                    reset();
                    setContentTypeIds((current) =>
                      current.includes(type.id)
                        ? current.filter((id) => id !== type.id)
                        : [...current, type.id],
                    );
                  }}
                />
                {type.name}
              </label>
            ))}
          </div>
          {options.categories.length > 0 && (
            <label className="block text-sm text-stone-600">
              상세 분류로 더 좁히기{" "}
              <select
                aria-label="장소 상세 분류"
                value={categoryId}
                onChange={(event) => {
                  reset();
                  setCategoryId(event.target.value);
                }}
                className="mt-2 block max-w-full rounded-lg border border-stone-300 p-2"
              >
                <option value="">선택한 카테고리 전체</option>
                {options.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {"　".repeat(category.level - 1)}
                    {category.name} ({category.level}단계)
                  </option>
                ))}
              </select>
            </label>
          )}
          {options.warning && (
            <p role="status" className="text-xs text-amber-800">
              {options.warning}
            </p>
          )}
          {contentTypeIds.length === 0 && !categoryId && (
            <p className="text-xs text-stone-500">
              카테고리를 선택하지 않으면 경로만 비교합니다.
            </p>
          )}
        </fieldset>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            disabled={!origin || !destination || busy}
            onClick={() => void compare()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#064e43] text-white px-5 py-3 font-semibold disabled:opacity-40"
          >
            <Route className="w-4 h-4" />
            {busy ? "경로와 장소를 찾는 중…" : "경로 비교·장소 추천"}
          </button>
          {busy && (
            <button type="button" onClick={reset} className="text-sm underline">
              조회 취소
            </button>
          )}
        </div>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
      </div>

      {comparison && (
        <div className="grid gap-3 sm:grid-cols-2" aria-label="경로 비교 결과">
          {comparison.routes.map((item) => (
            <button
              key={item.preference}
              type="button"
              disabled={!item.route}
              aria-pressed={active === item.preference}
              onClick={() => {
                setActive(item.preference);
                setFocusedPlace(null);
              }}
              className={`text-left rounded-2xl border-2 p-4 bg-white ${active === item.preference ? "border-emerald-700" : "border-stone-200"}`}
            >
              <span
                className="font-bold"
                style={{ color: ROUTE_COLORS[item.preference] }}
              >
                {LABELS[item.preference]}
              </span>
              {item.route ? (
                <>
                  <span className="block mt-2 text-xl font-bold">
                    {distance(item.route.distanceMeters)} ·{" "}
                    {duration(item.route.durationSeconds)}
                  </span>
                  <span className="block text-xs text-stone-500 mt-1">
                    추천 장소 {item.places.length}곳
                    {item.route.cached ? " · 저장된 경로 사용" : ""}
                  </span>
                </>
              ) : (
                <span role="status" className="block text-sm text-red-700 mt-2">
                  {item.routeError}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <RouteExplorerMap
          origin={origin}
          destination={destination}
          routes={visibleRoutes}
          active={active}
          focusedPlace={focusedPlace}
        />
        <p className="text-xs text-stone-600">
          파란 실선: 권장 경로 · 주황 점선: 최단 경로 · 초록 점: 선택한 경로의
          추천 장소. 두 경로가 같을 수도 있습니다.
        </p>
        <p className="text-xs text-stone-500">
          예상시간에 실시간 정체는 반영되지 않습니다. 지도와 경로의 데이터 갱신
          시점이 다를 수 있습니다.
        </p>
      </div>

      {selected?.route && (
        <section className="space-y-3" aria-label="선택 경로의 추천 장소">
          <h2 className="text-xl font-bold">{LABELS[active]} 주변 추천 장소</h2>
          <p className="text-sm text-stone-600">
            경로 선에서 약 {distance(comparison!.radiusMeters)} 이내인 TourAPI
            수집 장소 중 가까운 순서입니다. 표시는 직선거리 근사이며 실제 우회
            이동거리·시간은 아닙니다.
          </p>
          {selected.recommendationError && (
            <p role="alert" className="text-sm text-red-700">
              {selected.recommendationError}
            </p>
          )}
          {selected.candidateLimitReached && (
            <p role="status" className="text-sm text-amber-800">
              조회 후보가 많아 일부 장소만 비교했습니다. 반경이나 상세 분류를
              좁혀 주세요.
            </p>
          )}
          {!selected.recommendationError && selected.places.length === 0 && (
            <p className="rounded-xl bg-stone-100 p-4 text-sm">
              선택 조건에 맞는 수집 장소가 없습니다. 카테고리·반경을 바꾸거나
              TourAPI 장소 수집 상태를 확인해 주세요.
            </p>
          )}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selected.places.map((place) => (
              <li
                key={place.id}
                className="rounded-xl border border-stone-200 bg-white p-4 space-y-2"
              >
                <p className="text-xs text-emerald-800">
                  {place.categoryName ??
                    options.contentTypes.find(
                      (type) => type.id === place.contentTypeId,
                    )?.name ??
                    "관광 장소"}
                </p>
                <h3 className="font-bold">{place.name}</h3>
                <p className="text-xs text-stone-500">{place.address}</p>
                <p className="text-sm">
                  경로에서 약 {distance(place.distanceToRouteMeters)}
                </p>
                <button
                  type="button"
                  className="text-sm text-emerald-800 underline"
                  onClick={() => setFocusedPlace(place)}
                >
                  지도에서 보기
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <footer className="text-xs text-stone-500 space-y-1">
        <p>
          검색·경로:{" "}
          <a
            className="underline"
            href="https://openrouteservice.org/"
            target="_blank"
            rel="noreferrer"
          >
            © openrouteservice.org by HeiGIT
          </a>{" "}
          · 지도 데이터:{" "}
          <a
            className="underline"
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
          >
            © OpenStreetMap contributors
          </a>{" "}
          · 장소: 한국관광공사 TourAPI
        </p>
        <p>
          경로 결과:{" "}
          <a
            className="underline"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY-SA 4.0
          </a>{" "}
          · 검색 데이터: OpenStreetMap, OpenAddresses, GeoNames, Who’s On First
          —{" "}
          <a
            className="underline"
            href="https://account.heigit.org/info/tos"
            target="_blank"
            rel="noreferrer"
          >
            이용 조건·출처
          </a>
        </p>
      </footer>
    </div>
  );
}

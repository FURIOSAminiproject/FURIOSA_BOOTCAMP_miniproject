import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Check,
  ChevronDown,
  Compass,
  MapPin,
  Route,
  SlidersHorizontal,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  compareRoutes,
  getRouteCategories,
  CONTENT_TYPE_OPTIONS,
  type CategoryOptions,
  type SearchPlace,
  type ComparedRoute,
} from "../services/route-explorer";
import { tripCompareRequest, type TripDraft } from "../services/trip-workspace";
import { useTripWorkspace } from "./TripWorkspaceContext";
import { MapPlaceSearch } from "./MapPlaceSearch";
import { TripFlowHeader } from "./TripFlowHeader";
import { RouteAttribution } from "./RouteAttribution";
import { RouteExplorerMap } from "./RouteExplorerMap";
import { TripResultsPage } from "./TripResultsPage";
import { TripRouteEstimate } from "./TripRouteEstimate";

const EMPTY_ROUTES: ComparedRoute[] = [];
export const formatRouteDistance = (meters: number) =>
  meters < 1000 ? `${Math.round(meters)}m` : `${(meters / 1000).toFixed(1)}km`;

/** /trips/new. 서버가 실제 사용하는 좌표·이동 방식·카테고리·반경만 입력받는다. */
export function TripRequestPage({
  embedded = false,
  onComplete,
}: {
  embedded?: boolean;
  onComplete?: () => void;
}) {
  const { state, dispatch } = useTripWorkspace();
  const { draft } = state;
  const navigate = useNavigate();
  const [options, setOptions] = useState<CategoryOptions>({
    contentTypes: CONTENT_TYPE_OPTIONS,
    categories: [],
    warning: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);

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
              "상세 분류를 불러오지 못했습니다. 기본 카테고리를 선택할 수 있습니다.",
          }));
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, []);

  // 다른 화면의 새 여행/로그아웃도 이전 요청을 취소한다. 이전 좌표의 응답을 새 초안에 붙이지 않는다.
  useEffect(() => {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setError(null);
  }, [draft]);

  function cancel() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setError(null);
  }
  function edit(patch: Partial<TripDraft>) {
    cancel();
    dispatch({ type: "edit", patch });
  }
  function choose(which: "origin" | "destination", place: SearchPlace) {
    edit(
      which === "origin"
        ? { origin: place, originQuery: place.name }
        : { destination: place, destinationQuery: place.name },
    );
  }

  async function submit() {
    const input = tripCompareRequest(draft);
    if (!input || busy) return;
    cancel();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const comparison = await compareRoutes(input, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      dispatch({
        type: "complete",
        result: {
          request: input,
          comparison,
          title:
            draft.title.trim() ||
            `${draft.origin!.name}에서 ${draft.destination!.name}까지`,
        },
      });
      if (onComplete) onComplete();
      else if (!embedded) navigate("/trips");
    } catch (failure) {
      if (!controller.signal.aborted && request.current === controller)
        setError(
          failure instanceof Error
            ? failure.message
            : "경로를 조회하지 못했습니다. 다시 시도해 주세요.",
        );
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  const selectedNames = options.contentTypes
    .filter((type) => draft.contentTypeIds.includes(type.id))
    .map((type) => type.name);
  const pickedCategory = options.categories.find(
    (category) => category.id === draft.categoryId,
  );
  const ready = Boolean(draft.origin && draft.destination);
  return (
    <div className="space-y-7">
      {!embedded && <TripFlowHeader step="request" />}
      <header className="space-y-3">
        <p className="text-xs font-bold tracking-widest text-emerald-800">
          나의 동선에서 시작하는 국내 여행
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
          어디에서, 어디로 떠나세요?
        </h1>
        <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600">
          출발지와 도착지를 정하면 두 가지 경로를 비교하고,
          <br className="hidden sm:block" /> 그 길 주변에서 취향에 맞는 여행
          장소를 찾아드려요.
        </p>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-[#e5e0d8] bg-white p-5 sm:p-8 space-y-8 shadow-sm">
          <section className="space-y-5">
            <h2 className="flex items-center gap-2.5 text-base font-bold">
              <StepNumber number="1" />
              출발지와 도착지
            </h2>
            <p className="text-xs leading-relaxed text-stone-500">
              장소명이나 주소를 입력하고 아래 추천 목록에서 선택해 주세요.
              선택한 위치로 경로와 예상시간을 계산합니다.
            </p>
            <div className="space-y-3">
              <MapPlaceSearch
                label="출발지"
                query={draft.originQuery}
                value={draft.origin}
                onQueryChange={(originQuery) =>
                  edit({ originQuery, origin: null })
                }
                onSelect={(place) => choose("origin", place)}
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={!ready}
                  aria-label="출발지와 도착지 바꾸기"
                  className="rounded-full border border-stone-200 p-2.5 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                  onClick={() =>
                    edit({
                      origin: draft.destination,
                      originQuery: draft.destinationQuery,
                      destination: draft.origin,
                      destinationQuery: draft.originQuery,
                    })
                  }
                >
                  <ArrowRightLeft className="h-4 w-4 rotate-90" />
                </button>
              </div>
              <MapPlaceSearch
                label="도착지"
                query={draft.destinationQuery}
                value={draft.destination}
                onQueryChange={(destinationQuery) =>
                  edit({ destinationQuery, destination: null })
                }
                onSelect={(place) => choose("destination", place)}
              />
            </div>
          </section>
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <h2 className="flex items-center gap-2.5 text-base font-bold">
              <StepNumber number="2" />
              어떻게 이동할까요?
            </h2>
            <div
              className="grid grid-cols-2 gap-3"
              role="group"
              aria-label="이동 방식"
            >
              {(
                [
                  {
                    value: "driving",
                    name: "자동차",
                    description: "운전 가능한 도로 중심",
                  },
                  {
                    value: "walking",
                    name: "도보",
                    description: "걸어서 이동하는 경로",
                  },
                ] as const
              ).map((mode) => (
                <button
                  type="button"
                  key={mode.value}
                  aria-pressed={draft.mode === mode.value}
                  onClick={() => edit({ mode: mode.value })}
                  className={`rounded-2xl border-2 p-4 text-left ${draft.mode === mode.value ? "border-[#064e43] bg-emerald-50/60" : "border-stone-200 hover:bg-stone-50"}`}
                >
                  <span className="flex items-center justify-between font-bold text-sm">
                    {mode.name}
                    {draft.mode === mode.value && (
                      <Check className="h-4 w-4 text-emerald-800" />
                    )}
                  </span>
                  <span className="mt-1 block text-xs text-stone-500">
                    {mode.description}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section className="space-y-4 border-t border-stone-100 pt-6">
            <h2 className="flex items-center gap-2.5 text-base font-bold">
              <StepNumber number="3" />
              어떤 곳에 들르고 싶으세요?
            </h2>
            <p className="text-xs text-stone-500">
              여러 개를 선택할 수 있어요. 장소는 각 경로 주변에서 따로
              추천합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {options.contentTypes.map((type) => (
                <label
                  key={type.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm ${draft.contentTypeIds.includes(type.id) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-stone-200 text-stone-600"}`}
                >
                  <input
                    type="checkbox"
                    checked={draft.contentTypeIds.includes(type.id)}
                    onChange={() =>
                      edit({
                        contentTypeIds: draft.contentTypeIds.includes(type.id)
                          ? draft.contentTypeIds.filter((id) => id !== type.id)
                          : [...draft.contentTypeIds, type.id],
                      })
                    }
                  />
                  {type.name}
                </label>
              ))}
            </div>
            <label className="block text-sm font-semibold">
              경로에서 얼마나 가까운 곳을 찾을까요?
              <select
                aria-label="추천 반경"
                value={draft.radiusMeters}
                onChange={(event) =>
                  edit({ radiusMeters: Number(event.target.value) })
                }
                className="mt-2 block w-full rounded-xl border border-stone-300 bg-white p-3 text-sm font-normal"
              >
                {[500, 1000, 2000, 5000].map((radius) => (
                  <option key={radius} value={radius}>
                    경로 주변 {formatRouteDistance(radius)} 이내
                  </option>
                ))}
              </select>
            </label>
            {options.categories.length > 0 && (
              <details className="rounded-xl border border-stone-200 p-3.5">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-stone-600">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    상세 분류 선택
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </summary>
                <select
                  aria-label="장소 상세 분류"
                  value={draft.categoryId}
                  onChange={(event) => edit({ categoryId: event.target.value })}
                  className="mt-3 block w-full rounded-xl border border-stone-300 p-3 text-sm"
                >
                  <option value="">선택한 카테고리 전체</option>
                  {options.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {"　".repeat(category.level - 1)}
                      {category.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-stone-500">
                  위에서 고른 카테고리와 상세 분류를 모두 만족하는 장소를
                  찾습니다.
                </p>
              </details>
            )}
            {options.warning && (
              <p role="status" className="text-xs text-amber-800">
                {options.warning}
              </p>
            )}
            {!draft.contentTypeIds.length && !draft.categoryId && (
              <p className="text-xs text-stone-500">
                카테고리를 선택하지 않으면 장소 추천 없이 경로만 비교합니다.
              </p>
            )}
          </section>
          <label className="block border-t border-stone-100 pt-6 text-sm font-semibold">
            여행 이름 <span className="font-normal text-stone-400">(선택)</span>
            <input
              aria-label="여행 이름"
              value={draft.title}
              maxLength={80}
              placeholder="예: 서울 도심 하루 산책"
              onChange={(event) => edit({ title: event.target.value })}
              className="mt-2 block w-full rounded-xl border border-stone-300 px-3.5 py-3 text-sm font-normal"
            />
          </label>
          <div className="space-y-3 border-t border-stone-100 pt-6">
            {error && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-3 text-sm text-red-800"
              >
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={!ready || busy}
              onClick={() => void submit()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#064e43] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#085a4e] disabled:opacity-40"
            >
              {busy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  경로와 장소를 조회하고 있어요
                </>
              ) : (
                <>
                  내 여행 경로 찾기
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
            {busy ? (
              <button
                type="button"
                onClick={cancel}
                className="block w-full py-1 text-sm text-stone-500 underline"
              >
                조회 취소
              </button>
            ) : (
              !ready && (
                <p className="text-center text-xs text-stone-500">
                  출발지와 도착지의 검색 결과를 각각 선택해 주세요.
                </p>
              )
            )}
          </div>
        </div>
        <aside className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-3xl bg-[#064e43] p-6 text-white space-y-5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Compass className="h-5 w-5" />
              이번 여행의 시작
            </div>
            <div className="space-y-3">
              <SummaryPoint label="출발" value={draft.origin?.name} />
              <div className="ml-2 h-5 border-l border-dashed border-white/30" />
              <SummaryPoint label="도착" value={draft.destination?.name} />
            </div>
            <TripRouteEstimate origin={draft.origin} destination={draft.destination} mode={draft.mode} />
            <div className="border-t border-white/15 pt-4 text-xs leading-relaxed text-emerald-50 space-y-2">
              <p>
                {draft.mode === "driving" ? "자동차" : "도보"} · 권장 경로와
                최단 경로 비교
              </p>
              <p>
                {selectedNames.length
                  ? selectedNames.join(" · ")
                  : draft.categoryId
                    ? "상세 분류 장소 추천"
                    : "경로만 비교"}
              </p>
              {pickedCategory && <p>상세: {pickedCategory.name}</p>}
              <p>경로 주변 {formatRouteDistance(draft.radiusMeters)}</p>
            </div>
          </div>
          {(draft.origin || draft.destination) && (
            <div className="space-y-2">
              <RouteExplorerMap
                compact
                origin={draft.origin}
                destination={draft.destination}
                routes={EMPTY_ROUTES}
                active="recommended"
                focusedPlace={null}
              />
              <p className="text-xs text-stone-500">
                선택한 위치입니다. 실제 이동 경로는 조회 후 표시됩니다.
              </p>
            </div>
          )}
          <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold">조회하면 이렇게 보여요</h2>
            <p className="flex gap-2 text-xs leading-relaxed text-stone-600">
              <Route className="h-4 w-4 shrink-0 text-emerald-700" />두 경로의
              지도·거리·예상시간
            </p>
            <p className="flex gap-2 text-xs leading-relaxed text-stone-600">
              <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
              선택한 경로 주변의 관광 장소
            </p>
            <p className="text-xs leading-relaxed text-stone-400">
              경로와 추천은 조회 결과를 기준으로 표시해요. 예약이나 견적 확정은
              제공하지 않습니다.
            </p>
          </div>
        </aside>
      </div>
      <RouteAttribution />
    </div>
  );
}

function StepNumber({ number }: { number: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 font-mono text-xs text-emerald-800">
      {number}
    </span>
  );
}
function SummaryPoint({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-emerald-200" />
      <div>
        <p className="text-[11px] text-emerald-100/70">{label}</p>
        <p className="mt-0.5 text-sm font-semibold break-words">
          {value || "검색 결과에서 선택해 주세요"}
        </p>
      </div>
    </div>
  );
}

/** 기존 /routes는 호환용 한 화면 탐색기로 유지하며 두 여행 화면과 같은 상태/API를 쓴다. */
export function RouteExplorerPage() {
  const { state } = useTripWorkspace();
  return (
    <div className="space-y-10">
      <TripRequestPage embedded />
      {state.result && <TripResultsPage embedded />}
    </div>
  );
}

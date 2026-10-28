import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Bot,
  Calendar,
  Check,
  Clock,
  Compass,
  MapPin,
  Route,
  SlidersHorizontal,
  Sparkles,
  Utensils,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getRouteCategories,
  type CategoryOptions,
  type SearchPlace,
  type ComparedRoute,
} from "../services/route-explorer";
import {
  tripCompareRequest,
  calculateTripDuration,
  type TripDraft,
} from "../services/trip-workspace";
import { useTripWorkspace } from "./TripWorkspaceContext";
import { MapPlaceSearch } from "./MapPlaceSearch";
import { TripFlowHeader } from "./TripFlowHeader";
import { RouteAttribution } from "./RouteAttribution";
import { RouteExplorerMap } from "./RouteExplorerMap";
import { TripResultsPage } from "./TripResultsPage";
import { TripRouteEstimate } from "./TripRouteEstimate";
import { CategoryDetailModal } from "./CategoryDetailModal";
import { planTrip } from "../services/trip-planning";
import { FullScreenAiChatPlanner } from "./FullScreenAiChatPlanner";
import {
  rootCategories,
  categoryTrail,
  MAX_CATEGORY_FILTERS,
} from "../services/trip-categories";

function addDays(dateStr: string, days: number): string {
  try {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return dateStr;
  }
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const planMode = searchParams.get("mode") === "chat" ? "chat" : "planner";

  const setPlanMode = (mode: "planner" | "chat") => {
    if (mode === "chat") {
      setSearchParams({ mode: "chat" });
    } else {
      setSearchParams({});
    }
  };

  const [options, setOptions] = useState<CategoryOptions>({
    categories: [],
    warning: null,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryRetry, setCategoryRetry] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    void getRouteCategories(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setOptions((current) => ({
            ...current,
            warning:
              "카테고리를 불러오지 못했습니다. 다시 시도하거나 카테고리 없이 경로만 비교해 주세요.",
          }));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
      });
    return () => {
      controller.abort();
      request.current?.abort();
    };
  }, [categoryRetry]);

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
      const planned = await planTrip(draft, controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      const duration = calculateTripDuration(draft.startDate, draft.endDate);
      dispatch({
        type: "complete",
        result: {
          ...planned,
          categoryGroups: draft.selectedCategoryIds.map((id) => ({
            id,
            name:
              options.categories.find((category) => category.id === id)?.name ??
              "선택한 카테고리",
            details: (draft.categorySelections[id] ?? []).map((detailId) => {
              const detail = options.categories.find(
                (category) => category.id === detailId,
              );
              return detail
                ? categoryTrail(detail, options.categories)
                    .slice(1)
                    .map((category) => category.name)
                    .join(" › ")
                : "선택한 상세 분류";
            }),
          })),
          title:
            draft.title.trim() ||
            `${draft.origin!.name}에서 ${draft.destination!.name}까지 (${duration.label})`,
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

  const roots = rootCategories(options.categories);
  const selectedRoots = roots.filter((category) =>
    draft.selectedCategoryIds.includes(category.id),
  );
  const modalCategory = roots.find(
    (category) => category.id === editingCategory,
  );
  function detailSummary(rootId: string) {
    const ids = draft.categorySelections[rootId] ?? [];
    return ids.length
      ? ids
          .map(
            (id) =>
              options.categories.find((category) => category.id === id)?.name ??
              "선택한 상세 분류",
          )
          .join(" · ")
      : "전체";
  }
  const ready = Boolean(draft.origin && draft.destination);
  return (
    <div className="space-y-7">
      {!embedded && <TripFlowHeader step="request" />}

      {/* 2가지 계획 방식 선택 탭: AI 채팅으로 계획 짜기 VS 플래너로 계획 짜기 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-[#f4f1eb] rounded-2xl border border-stone-200 shadow-2xs">
        <div className="grid grid-cols-2 gap-2 flex-1 sm:max-w-xl">
          <button
            type="button"
            onClick={() => setPlanMode("planner")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              planMode === "planner"
                ? "bg-[#064e43] text-white shadow-md scale-[1.01]"
                : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            <Compass className="h-4 w-4" />
            <span>플래너로 계획 짜기</span>
          </button>

          <button
            type="button"
            onClick={() => setPlanMode("chat")}
            className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs ${
              planMode === "chat"
                ? "bg-[#064e43] text-white shadow-md scale-[1.01]"
                : "bg-white text-stone-700 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            <Bot className="h-4 w-4 text-emerald-400" />
            <div className="flex items-center gap-1.5">
              <span>AI 채팅으로 계획 짜기</span>
              <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 font-semibold">
                Flash
              </span>
            </div>
          </button>
        </div>

        <p className="text-xs text-stone-500 px-3 sm:px-0 text-center sm:text-right font-medium">
          {planMode === "planner"
            ? "지도에서 경로와 주변 명소를 직접 선택하고 설계합니다."
            : "AI 여행 비서 길벗과 실시간으로 대화하며 추천 코스를 완성합니다."}
        </p>
      </div>

      {planMode === "chat" ? (
        <FullScreenAiChatPlanner
          onSwitchToPlanner={() => setPlanMode("planner")}
          onComplete={onComplete}
        />
      ) : (
        <>
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
              {/* Step 2: 여행 기간 및 시간대 */}
              <section className="space-y-4 border-t border-stone-100 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2.5 text-base font-bold">
                    <StepNumber number="2" />
                    여행 기간 및 출발 시각
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1 text-xs font-bold text-emerald-900 border border-emerald-200">
                    <Calendar className="h-3.5 w-3.5 text-emerald-800" />
                    여행 기간:{" "}
                    {
                      calculateTripDuration(draft.startDate, draft.endDate)
                        .label
                    }
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-stone-500">
                  여행 기간(시작일과 종료일)을 선택해 주세요. 당일치기부터 장기
                  여행까지 일정을 자유롭게 지정할 수 있어요.
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">
                        여행 시작일
                      </label>
                      <input
                        type="date"
                        aria-label="여행 시작일"
                        value={draft.startDate}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          const newEnd =
                            newStart > draft.endDate ? newStart : draft.endDate;
                          edit({ startDate: newStart, endDate: newEnd });
                        }}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-600 mb-1">
                        여행 종료일
                      </label>
                      <input
                        type="date"
                        aria-label="여행 종료일"
                        min={draft.startDate}
                        value={draft.endDate}
                        onChange={(e) => edit({ endDate: e.target.value })}
                        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm font-medium focus:border-emerald-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 퀵 프리셋 버튼 */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-stone-400 mr-1">
                      빠른 선택:
                    </span>
                    {[
                      { label: "당일치기", days: 0 },
                      { label: "1박 2일", days: 1 },
                      { label: "2박 3일", days: 2 },
                      { label: "3박 4일", days: 3 },
                      { label: "4박 5일", days: 4 },
                    ].map((preset) => {
                      const targetEnd = addDays(draft.startDate, preset.days);
                      const isSelected = draft.endDate === targetEnd;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => edit({ endDate: targetEnd })}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                            isSelected
                              ? "bg-emerald-800 text-white shadow-xs"
                              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                          }`}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 출발 시각 & 식사 시간대 설정 (타임라인 맛집 연동) */}
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
                      <Clock className="h-4 w-4 text-emerald-800" />
                      출발 시각
                    </label>
                    <input
                      type="time"
                      aria-label="출발 시각"
                      value={draft.departureTime}
                      onChange={(e) => edit({ departureTime: e.target.value })}
                      className="rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-800 focus:border-emerald-600 focus:outline-none"
                    />
                  </div>

                  <div className="border-t border-stone-200/80 pt-3 space-y-2">
                    <p className="text-[11px] font-semibold text-stone-600 flex items-center gap-1">
                      <Utensils className="h-3.5 w-3.5 text-emerald-700" />
                      이동 중 식사 시간대 길목 맛집 추천
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-2.5 cursor-pointer hover:border-emerald-300">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.includeLunch}
                            onChange={(e) =>
                              edit({ includeLunch: e.target.checked })
                            }
                            className="accent-emerald-800"
                          />
                          <span className="font-semibold text-stone-700">
                            점심 식사
                          </span>
                        </span>
                        <input
                          type="time"
                          value={draft.lunchTime}
                          disabled={!draft.includeLunch}
                          onChange={(e) => edit({ lunchTime: e.target.value })}
                          className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-xs font-mono disabled:opacity-40"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-2.5 cursor-pointer hover:border-emerald-300">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={draft.includeDinner}
                            onChange={(e) =>
                              edit({ includeDinner: e.target.checked })
                            }
                            className="accent-emerald-800"
                          />
                          <span className="font-semibold text-stone-700">
                            저녁 식사
                          </span>
                        </span>
                        <input
                          type="time"
                          value={draft.dinnerTime}
                          disabled={!draft.includeDinner}
                          onChange={(e) => edit({ dinnerTime: e.target.value })}
                          className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 text-xs font-mono disabled:opacity-40"
                        />
                      </label>
                    </div>
                    <p className="text-[11px] text-stone-400">
                      출발 시각을 기준으로 해당 시각에 지나가는 고속도로/국도
                      주변 맛집을 계산하여 찾아드려요.
                    </p>
                  </div>
                </div>
              </section>
              <section className="space-y-4 border-t border-stone-100 pt-6">
                <h2 className="flex items-center gap-2.5 text-base font-bold">
                  <StepNumber number="3" />
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
                  <StepNumber number="4" />
                  어떤 곳에 들르고 싶으세요?
                </h2>
                <p className="text-xs text-stone-500">
                  카테고리를 고르면 그 아래 상세 분류를 여러 개 선택할 수
                  있어요. 장소는 각 경로 주변에서 따로 추천합니다.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {roots.map((category) => (
                    <div
                      key={category.id}
                      className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${draft.selectedCategoryIds.includes(category.id) ? "border-emerald-600 bg-emerald-50 text-emerald-900" : "border-stone-200 text-stone-600"}`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
                        <input
                          type="checkbox"
                          aria-label={category.name}
                          checked={draft.selectedCategoryIds.includes(
                            category.id,
                          )}
                          onChange={(event) => {
                            if (event.target.checked)
                              setEditingCategory(category.id);
                            else
                              edit({
                                selectedCategoryIds:
                                  draft.selectedCategoryIds.filter(
                                    (id) => id !== category.id,
                                  ),
                              });
                          }}
                          className="mt-0.5 accent-emerald-800"
                        />
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {category.name}
                          </span>
                          {draft.selectedCategoryIds.includes(category.id) && (
                            <span className="mt-1 block break-words text-[11px] leading-relaxed text-stone-500">
                              {detailSummary(category.id)}
                            </span>
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        aria-label={`${category.name} 상세 분류 선택`}
                        onClick={() => setEditingCategory(category.id)}
                        className="shrink-0 rounded-lg p-2 hover:bg-white"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {categoriesLoading && (
                  <p role="status" className="text-xs text-stone-500">
                    카테고리를 불러오고 있어요…
                  </p>
                )}
                {!categoriesLoading && !roots.length && !options.warning && (
                  <p role="status" className="text-xs text-stone-500">
                    등록된 카테고리가 없습니다. 카테고리 없이 경로를 비교할 수
                    있어요.
                  </p>
                )}
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
                {options.warning && (
                  <p role="status" className="text-xs text-amber-800">
                    {options.warning}
                    <button
                      type="button"
                      disabled={categoriesLoading}
                      onClick={() => setCategoryRetry((count) => count + 1)}
                      className="ml-2 underline"
                    >
                      카테고리 다시 불러오기
                    </button>
                  </p>
                )}
                {!draft.selectedCategoryIds.length && (
                  <p className="text-xs text-stone-500">
                    카테고리를 선택하지 않으면 장소 추천 없이 경로만 비교합니다.
                  </p>
                )}
              </section>
              <label className="block border-t border-stone-100 pt-6 text-sm font-semibold">
                여행 이름{" "}
                <span className="font-normal text-stone-400">(선택)</span>
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
                <TripRouteEstimate
                  origin={draft.origin}
                  destination={draft.destination}
                  mode={draft.mode}
                />
                <div className="border-t border-white/15 pt-4 text-xs leading-relaxed text-emerald-50 space-y-2">
                  <p className="flex items-center gap-1.5 font-semibold text-white">
                    <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                    여행 기간:{" "}
                    {
                      calculateTripDuration(draft.startDate, draft.endDate)
                        .label
                    }{" "}
                    ({draft.startDate} ~ {draft.endDate})
                  </p>
                  <p className="flex items-center gap-1.5 text-emerald-100">
                    <Clock className="h-3.5 w-3.5 text-emerald-300" />
                    출발 {draft.departureTime}
                    {draft.includeLunch && ` · 점심 ${draft.lunchTime}`}
                    {draft.includeDinner && ` · 저녁 ${draft.dinnerTime}`}
                  </p>
                  <p>
                    {draft.mode === "driving" ? "자동차" : "도보"} · 권장 경로와
                    최단 경로 비교
                  </p>
                  {selectedRoots.length ? (
                    selectedRoots.map((category) => (
                      <p key={category.id} className="break-words">
                        {category.name}: {detailSummary(category.id)}
                      </p>
                    ))
                  ) : (
                    <p>경로만 비교</p>
                  )}
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
                  <Route className="h-4 w-4 shrink-0 text-emerald-700" />두
                  경로의 지도·거리·예상시간
                </p>
                <p className="flex gap-2 text-xs leading-relaxed text-stone-600">
                  <MapPin className="h-4 w-4 shrink-0 text-emerald-700" />
                  선택한 경로 주변의 관광 장소
                </p>
                <p className="text-xs leading-relaxed text-stone-400">
                  경로와 추천은 조회 결과를 기준으로 표시해요. 예약이나 견적
                  확정은 제공하지 않습니다.
                </p>
              </div>
            </aside>
          </div>
          <RouteAttribution />
        </>
      )}
      {modalCategory && (
        <CategoryDetailModal
          key={modalCategory.id}
          rootId={modalCategory.id}
          name={modalCategory.name}
          categories={options.categories}
          selectedIds={draft.categorySelections[modalCategory.id] ?? []}
          onClose={() => setEditingCategory(null)}
          onApply={(ids) => {
            const rootIds = draft.selectedCategoryIds.includes(modalCategory.id)
              ? draft.selectedCategoryIds
              : [...draft.selectedCategoryIds, modalCategory.id];
            const selections = {
              ...draft.categorySelections,
              [modalCategory.id]: ids,
            };
            if (
              rootIds.reduce(
                (count, id) => count + (selections[id]?.length || 1),
                0,
              ) > MAX_CATEGORY_FILTERS
            )
              return `전체 선택 분류가 ${MAX_CATEGORY_FILTERS}개를 넘었습니다. 일부 선택을 줄여 주세요.`;
            edit({
              selectedCategoryIds: rootIds,
              categorySelections: selections,
            });
            setEditingCategory(null);
          }}
        />
      )}
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

import type {
  Comparison,
  CompareRequest,
  Preference,
  SearchPlace,
  TimelineResponse,
} from "./route-explorer";
import type { LocationRouteMode } from "../types/location";

/** 출발일과 도착일로 몇박 몇일을 계산한다. */
export function calculateTripDuration(
  startDate: string,
  endDate: string,
): { nights: number; days: number; label: string } {
  if (!startDate || !endDate) return { nights: 0, days: 1, label: "당일치기 (1일)" };
  const s = new Date(startDate);
  const e = new Date(endDate);
  const diffTime = e.getTime() - s.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return { nights: 0, days: 1, label: "당일치기" };
  }
  return {
    nights: diffDays,
    days: diffDays + 1,
    label: `${diffDays}박 ${diffDays + 1}일`,
  };
}

/** 두 여행 화면에서 공유하는 사용자 입력. 검색 문자열과 확정 좌표, 일정 기간을 보관한다. */
export interface TripDraft {
  title: string;
  originQuery: string;
  destinationQuery: string;
  origin: SearchPlace | null;
  destination: SearchPlace | null;
  mode: LocationRouteMode;
  /** 출발 날짜 (YYYY-MM-DD) */
  startDate: string;
  /** 도착 날짜 (YYYY-MM-DD) */
  endDate: string;
  /** 출발 시각 (HH:mm, 예: 09:30) */
  departureTime: string;
  /** 점심 식사 시간대 추천 포함 여부 및 시각 */
  includeLunch: boolean;
  lunchTime: string;
  /** 저녁 식사 시간대 추천 포함 여부 및 시각 */
  includeDinner: boolean;
  dinnerTime: string;
  /** DB LEVEL1의 UUID와 그 아래 선택한 LEVEL2/3 UUID. 빈 상세 목록은 해당 LEVEL1 전체다. */
  selectedCategoryIds: string[];
  categorySelections: Record<string, string[]>;
  radiusMeters: number;
}
export interface TripResult {
  title: string;
  request: CompareRequest;
  comparison: Comparison;
  categoryGroups?: { id: string; name: string; details: string[] }[];
  startDate?: string;
  endDate?: string;
  departureTime?: string;
  durationLabel?: string;
  timeline?: TimelineResponse | null;
}
export interface TripWorkspace {
  draft: TripDraft;
  result: TripResult | null;
  active: Preference;
}
export type TripAction =
  | { type: "edit"; patch: Partial<TripDraft> }
  | { type: "new"; destinationQuery?: string }
  | { type: "complete"; result: TripResult }
  | { type: "select-route"; preference: Preference };

/** 좌표·이름·견적·예시 일정을 넣지 않는다. 기본값은 조회 조건에만 적용한다. */
export function createTripWorkspace(destinationQuery = ""): TripWorkspace {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const tomorrowDate = new Date(now.getTime() + 86400000);
  const tomorrow = `${tomorrowDate.getFullYear()}-${String(tomorrowDate.getMonth() + 1).padStart(2, "0")}-${String(tomorrowDate.getDate()).padStart(2, "0")}`;

  return {
    draft: {
      title: "",
      originQuery: "",
      destinationQuery,
      origin: null,
      destination: null,
      mode: "driving",
      startDate: today,
      endDate: tomorrow,
      departureTime: "09:30",
      includeLunch: true,
      lunchTime: "12:30",
      includeDinner: false,
      dinnerTime: "18:30",
      selectedCategoryIds: [],
      categorySelections: {},
      radiusMeters: 1000,
    },
    result: null,
    active: "recommended",
  };
}

/** 입력이 바뀌면 예전 경로/추천을 함께 폐기해 서로 다른 조건의 결과가 섞이지 않게 한다. */
export function tripWorkspaceReducer(
  state: TripWorkspace,
  action: TripAction,
): TripWorkspace {
  switch (action.type) {
    case "edit": {
      const draft = { ...state.draft, ...action.patch };
      if ("selectedCategoryIds" in action.patch)
        draft.categorySelections = Object.fromEntries(
          Object.entries(draft.categorySelections).filter(([id]) =>
            draft.selectedCategoryIds.includes(id),
          ),
        );
      // 검색어만 수정해도 이전 선택 좌표를 폐기한다. 새 결과를 선택한 경우의 명시 좌표는 유지한다.
      if (
        "originQuery" in action.patch &&
        !("origin" in action.patch) &&
        action.patch.originQuery !== state.draft.originQuery
      )
        draft.origin = null;
      if (
        "destinationQuery" in action.patch &&
        !("destination" in action.patch) &&
        action.patch.destinationQuery !== state.draft.destinationQuery
      )
        draft.destination = null;
      return { ...state, draft, result: null };
    }
    case "new":
      return createTripWorkspace(action.destinationQuery);
    case "complete":
      return {
        ...state,
        result: action.result,
        active:
          action.result.comparison.routes.find((route) => route.route)
            ?.preference ?? "recommended",
      };
    case "select-route":
      return state.result?.comparison.routes.some(
        (route) => route.preference === action.preference && route.route,
      )
        ? { ...state, active: action.preference }
        : state;
  }
}

/** 여행 이름은 표시 전용이다. API에는 검색에서 선택한 숫자 좌표와 조회 조건만 보낸다. */
export function tripCompareRequest(draft: TripDraft): CompareRequest | null {
  if (!draft.origin || !draft.destination) return null;
  return {
    mode: draft.mode,
    points: [{ ...draft.origin }, { ...draft.destination }],
    // 카테고리를 명시하지 않은 경우 관광지, 문화시설, 쇼핑, 음식점을 기본 추천으로 탐색
    contentTypeIds: draft.selectedCategoryIds.length === 0 ? [12, 14, 38, 39] : [],
    categoryIds: [
      ...new Set(
        draft.selectedCategoryIds.flatMap((id) =>
          draft.categorySelections[id]?.length
            ? [...draft.categorySelections[id]]
            : [id],
        ),
      ),
    ],
    radiusMeters: Math.max(draft.radiusMeters, 3000),
    limit: 12,
  };
}

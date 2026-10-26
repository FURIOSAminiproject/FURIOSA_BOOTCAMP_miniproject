import type {
  Comparison,
  CompareRequest,
  Preference,
  SearchPlace,
} from "./route-explorer";
import type { LocationRouteMode } from "../types/location";

/** 두 여행 화면에서 공유하는 사용자 입력. 검색 문자열과 확정 좌표를 분리한다. */
export interface TripDraft {
  title: string;
  originQuery: string;
  destinationQuery: string;
  origin: SearchPlace | null;
  destination: SearchPlace | null;
  mode: LocationRouteMode;
  contentTypeIds: number[];
  categoryId: string;
  radiusMeters: number;
}
export interface TripResult {
  title: string;
  request: CompareRequest;
  comparison: Comparison;
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
  return {
    draft: {
      title: "",
      originQuery: "",
      destinationQuery,
      origin: null,
      destination: null,
      mode: "driving",
      contentTypeIds: [12, 39],
      categoryId: "",
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
    contentTypeIds: [...draft.contentTypeIds],
    categoryIds: draft.categoryId ? [draft.categoryId] : [],
    radiusMeters: draft.radiusMeters,
    limit: 10,
  };
}

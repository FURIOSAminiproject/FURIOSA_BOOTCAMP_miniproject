import { isLocationCoordinates } from "./location/geolocation";
import { parseLocationRoute } from "./location/route-client";
import type {
  LocationRouteMode,
  LocationRouteResponse,
} from "../types/location";

export interface SearchPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}
export interface PlaceCategory {
  id: string;
  name: string;
  level: number;
  parentId: string | null;
}
export interface CategoryOptions {
  contentTypes: { id: number; name: string }[];
  categories: PlaceCategory[];
  warning: string | null;
}
export interface RecommendedPlace extends SearchPlace {
  contentTypeId: number;
  categoryName: string | null;
  distanceToRouteMeters: number;
}
export type Preference = "recommended" | "shortest";
export interface ComparedRoute {
  preference: Preference;
  route: LocationRouteResponse | null;
  places: RecommendedPlace[];
  routeError: string | null;
  recommendationError: string | null;
  candidateLimitReached: boolean;
}
export interface Comparison {
  routes: ComparedRoute[];
  radiusMeters: number;
  recommendationBasis: "distance_to_route";
}
export interface CompareRequest {
  mode: LocationRouteMode;
  points: SearchPlace[];
  contentTypeIds: number[];
  categoryIds: string[];
  radiusMeters: number;
  limit: number;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const optionalText = (value: unknown): value is string | null =>
  value === null || typeof value === "string";
function malformed(): never {
  throw new Error("서버 응답 형식이 올바르지 않습니다. 다시 조회해 주세요.");
}

/** JSON을 타입 단언으로 통과시키지 않고 좌표와 화면에서 쓸 필드를 검사한다. */
export function parseSearchPlace(value: unknown): SearchPlace {
  if (
    !record(value) ||
    !isLocationCoordinates(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    !value.name ||
    typeof value.address !== "string"
  )
    return malformed();
  return {
    id: value.id,
    name: value.name,
    address: value.address,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}

/** API 키는 요청/URL에 넣지 않는다. 취소와 전체 HTTP 시간 제한을 함께 적용한다. */
async function requestJson(
  url: string,
  options: RequestInit,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<unknown> {
  const timeout = AbortSignal.timeout(35000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    const response = await transport(url, {
      ...options,
      signal: combined,
      redirect: "error",
    });
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const code = record(data) ? data.code : null;
      const message =
        code === "PROVIDER_AUTH_ERROR"
          ? "서버의 ORS API 키 설정을 확인해 주세요."
          : code === "PROVIDER_QUOTA_EXCEEDED"
            ? "지도 API 호출 한도에 도달했습니다. 잠시 후 다시 시도해 주세요."
            : code === "CACHE_SCHEMA_REQUIRED"
              ? "서버의 ORS 캐시 테이블 준비가 필요합니다."
              : code === "ROUTE_NOT_FOUND" || code === "POINT_NOT_ROUTABLE"
                ? "선택한 출발지와 도착지를 잇는 경로를 찾지 못했습니다."
                : response.status === 400
                  ? "검색어와 출발·도착지 입력을 확인해 주세요."
                  : "지도 정보를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.";
      throw new Error(message);
    }
    return await response.json();
  } catch (error) {
    if (signal?.aborted)
      throw new DOMException("취소된 요청입니다.", "AbortError");
    if (timeout.aborted)
      throw new Error("응답 시간이 초과됐습니다. 다시 조회해 주세요.");
    if (error instanceof TypeError)
      throw new Error("서버에 연결하지 못했습니다. 네트워크를 확인해 주세요.");
    throw error;
  }
}

/** 자동완성 대신 검색 버튼/Enter에서만 호출한다. 검색 결과의 좌표는 선택 시 확정한다. */
export async function searchMapPlaces(
  query: string,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<SearchPlace[]> {
  const data = await requestJson(
    `/api/map/search?q=${encodeURIComponent(query.trim())}`,
    {},
    signal,
    transport,
  );
  if (!record(data) || !Array.isArray(data.places) || data.places.length > 40)
    return malformed();
  return data.places.map(parseSearchPlace);
}

export async function getRouteCategories(
  signal?: AbortSignal,
): Promise<CategoryOptions> {
  const data = await requestJson("/api/routes/categories", {}, signal);
  if (
    !record(data) ||
    !Array.isArray(data.contentTypes) ||
    !Array.isArray(data.categories) ||
    !optionalText(data.warning)
  )
    return malformed();
  const contentTypes = data.contentTypes.map((value) => {
    if (
      !record(value) ||
      ![12, 14, 15, 28, 32, 38, 39].includes(value.id as number) ||
      typeof value.name !== "string"
    )
      return malformed();
    return { id: value.id as number, name: value.name };
  });
  const categories = data.categories.map((value) => {
    if (
      !record(value) ||
      typeof value.id !== "string" ||
      typeof value.name !== "string" ||
      ![1, 2, 3].includes(value.level as number) ||
      !optionalText(value.parentId)
    )
      return malformed();
    return {
      id: value.id,
      name: value.name,
      level: value.level as number,
      parentId: value.parentId,
    };
  });
  return { contentTypes, categories, warning: data.warning };
}

export function parseComparison(
  data: unknown,
  request: CompareRequest,
): Comparison {
  if (
    !record(data) ||
    !Array.isArray(data.routes) ||
    data.routes.length !== 2 ||
    data.radiusMeters !== request.radiusMeters ||
    data.recommendationBasis !== "distance_to_route"
  )
    return malformed();
  const seen = new Set<Preference>();
  const routes: ComparedRoute[] = data.routes.map((value): ComparedRoute => {
    if (
      !record(value) ||
      (value.preference !== "recommended" && value.preference !== "shortest") ||
      seen.has(value.preference) ||
      typeof value.candidateLimitReached !== "boolean" ||
      !optionalText(value.routeError) ||
      !optionalText(value.recommendationError) ||
      !Array.isArray(value.places) ||
      value.places.length > request.limit
    )
      return malformed();
    seen.add(value.preference);
    const route =
      value.route === null
        ? null
        : parseLocationRoute(value.route, {
            mode: request.mode,
            preference: value.preference,
            points: request.points,
          });
    if ((!route && !value.routeError) || (route && value.routeError !== null))
      return malformed();
    const places = value.places.map((place) => {
      const base = parseSearchPlace(place);
      if (
        !record(place) ||
        !Number.isInteger(place.contentTypeId) ||
        !optionalText(place.categoryName) ||
        typeof place.distanceToRouteMeters !== "number" ||
        !Number.isFinite(place.distanceToRouteMeters) ||
        place.distanceToRouteMeters < 0 ||
        place.distanceToRouteMeters > request.radiusMeters
      )
        return malformed();
      return {
        ...base,
        contentTypeId: place.contentTypeId as number,
        categoryName: place.categoryName,
        distanceToRouteMeters: place.distanceToRouteMeters,
      };
    });
    return {
      preference: value.preference,
      route,
      places,
      routeError: value.routeError,
      recommendationError: value.recommendationError,
      candidateLimitReached: value.candidateLimitReached,
    };
  });
  if (routes.every((value) => !value.route)) return malformed();
  return {
    routes,
    radiusMeters: request.radiusMeters,
    recommendationBasis: "distance_to_route",
  };
}

export async function compareRoutes(
  request: CompareRequest,
  signal?: AbortSignal,
  transport: typeof fetch = fetch,
): Promise<Comparison> {
  // Pelias 결과의 이름/주소/ID는 보내지 않는다. ORS 계산에 필요한 숫자 좌표만 전달한다.
  const data = await requestJson(
    "/api/routes/compare",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...request,
        points: request.points.map(({ latitude, longitude }) => ({
          latitude,
          longitude,
        })),
      }),
    },
    signal,
    transport,
  );
  return parseComparison(data, request);
}

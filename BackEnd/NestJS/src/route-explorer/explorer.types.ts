import type {
  RouteRequest,
  RouteResponse,
} from '../routing-cache/routing.types';

/** TourAPI의 콘텐츠 유형. 상세 분류는 place_categories의 UUID로 추가 필터링한다. */
export const CONTENT_TYPES = [
  { id: 12, name: '관광지' },
  { id: 14, name: '문화시설' },
  { id: 15, name: '축제·공연·행사' },
  { id: 28, name: '레포츠' },
  { id: 32, name: '숙박' },
  { id: 38, name: '쇼핑' },
  { id: 39, name: '음식점' },
] as const;

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
export interface ExplorerRequest {
  mode: RouteRequest['mode'];
  points: RouteRequest['points'];
  contentTypeIds: number[];
  categoryIds: string[];
  radiusMeters: number;
  limit: number;
}
export interface PlaceCandidate extends SearchPlace {
  contentTypeId: number;
  categoryName: string | null;
}
export interface RecommendedPlace extends PlaceCandidate {
  /** 경로 선까지의 근사 직선거리(m). 해당 장소로의 실제 우회 이동거리가 아니다. */
  distanceToRouteMeters: number;
}
export interface ExplorerRoute {
  preference: RouteRequest['preference'];
  route: RouteResponse | null;
  places: RecommendedPlace[];
  candidateLimitReached: boolean;
  routeError: string | null;
  recommendationError: string | null;
}
export interface ExplorerResponse {
  routes: ExplorerRoute[];
  radiusMeters: number;
  recommendationBasis: 'distance_to_route';
}

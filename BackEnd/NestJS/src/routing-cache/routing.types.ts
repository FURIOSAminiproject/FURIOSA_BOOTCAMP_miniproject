export type ProviderName = 'ORS' | 'ITS';
export type Coordinate = [number, number];
export type RoutePoint =
  { placeId: string } | { latitude: number; longitude: number };
export interface ResolvedPoint {
  placeId: string | null;
  latitude: number;
  longitude: number;
}
export interface RouteRequest {
  mode: 'driving' | 'walking';
  preference: 'recommended' | 'shortest';
  points: RoutePoint[];
}
export interface OrsRequest {
  contractVersion: 2;
  profile: 'driving-car' | 'foot-walking';
  preference: RouteRequest['preference'];
  coordinates: Coordinate[];
  units: 'm';
  instructions: true;
}
export interface TimeSpan {
  fromIndex: number;
  toIndex: number;
  durationSeconds: number;
}
export interface RouteData {
  distanceMeters: number;
  durationSeconds: number;
  geometry: { type: 'LineString'; coordinates: Coordinate[] };
  timeSpans: TimeSpan[];
  attribution: string | null;
  warnings: { code: number; message: string }[];
}
export interface TrafficRequest {
  contractVersion: 2;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  type: 'all';
  drcType: 'all';
  getType: 'json';
}
export interface TrafficLink {
  linkId: string;
  startNodeId: string | null;
  endNodeId: string | null;
  roadName: string | null;
  roadDirection: string | null;
  linkNo: string | null;
  speed: number | null;
  travelTimeSeconds: number | null;
  observedAt: string | null;
}
export interface TrafficData {
  items: TrafficLink[];
}
export interface CacheEntry<T> {
  cacheId: string;
  fetchedAt: string;
  expiresAt: string;
  data: T;
}
export interface CacheResult<T> extends CacheEntry<T> {
  cached: boolean;
}
export interface CacheStore<Q, T> {
  find(hash: string, now: Date): Promise<CacheEntry<T> | null>;
  save(
    hash: string,
    request: Q,
    data: T,
    sourceUrl: string,
    fetchedAt: Date,
    expiresAt: Date,
  ): Promise<CacheEntry<T>>;
}
export interface DataProvider<Q, T> {
  sourceUrl(request: Q): string;
  fetch(request: Q): Promise<T>;
}
export interface RoutingLog {
  log(message: string): void;
  error(message: string): void;
}

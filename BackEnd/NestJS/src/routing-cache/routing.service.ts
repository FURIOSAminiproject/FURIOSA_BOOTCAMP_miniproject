import type { DataSource } from 'typeorm';
import { CacheCoordinator } from './cache-coordinator';
import { RoutingError } from './routing.errors';
import { coordinate } from './routing.validation';
import type {
  OrsRequest,
  ResolvedPoint,
  RouteData,
  RoutePoint,
  RouteRequest,
  TrafficData,
  TrafficRequest,
} from './routing.types';

export class RoutePointResolver {
  constructor(private readonly db: Pick<DataSource, 'query'>) {}
  async resolve(points: RoutePoint[]): Promise<ResolvedPoint[]> {
    const ids = [
      ...new Set(
        points.flatMap((point) => ('placeId' in point ? [point.placeId] : [])),
      ),
    ];
    let rows: {
      place_id: string;
      latitude: string | number | null;
      longitude: string | number | null;
    }[] = [];
    if (ids.length) {
      try {
        rows = await this.db.query(
          'SELECT place_id,latitude,longitude FROM places WHERE place_id=ANY($1::uuid[]) AND is_active=true',
          [ids],
        );
      } catch {
        throw new RoutingError(
          503,
          'PLACES_UNAVAILABLE',
          '장소 좌표를 조회하지 못했습니다.',
        );
      }
    }
    const places = new Map(rows.map((row) => [row.place_id, row]));
    return points.map((point) => {
      if (!('placeId' in point)) return { ...point, placeId: null };
      const row = places.get(point.placeId);
      if (!row)
        throw new RoutingError(
          404,
          'PLACE_NOT_FOUND',
          '활성 장소를 찾지 못했습니다.',
        );
      const latitude = row.latitude === null ? null : Number(row.latitude),
        longitude = row.longitude === null ? null : Number(row.longitude);
      if (!coordinate(latitude, 90) || !coordinate(longitude, 180))
        throw new RoutingError(
          422,
          'PLACE_COORDINATES_MISSING',
          '장소의 경로 계산용 좌표가 없습니다.',
        );
      return { placeId: point.placeId, latitude, longitude };
    });
  }
}
export class RoutingService {
  constructor(
    private readonly resolver: RoutePointResolver,
    private readonly ors: CacheCoordinator<OrsRequest, RouteData>,
    private readonly its: CacheCoordinator<TrafficRequest, TrafficData>,
  ) {}
  async route(request: RouteRequest) {
    const points = await this.resolver.resolve(request.points);
    const canonical: OrsRequest = {
      contractVersion: 2,
      profile: request.mode === 'driving' ? 'driving-car' : 'foot-walking',
      preference: request.preference,
      coordinates: points.map((point) => [point.longitude, point.latitude]),
      units: 'm',
      instructions: true,
    };
    const result = await this.ors.get(canonical);
    return {
      mode: request.mode,
      preference: request.preference,
      points,
      ...result.data,
      trafficApplied: false,
      cacheId: result.cacheId,
      cached: result.cached,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
      calculatedAt: result.fetchedAt,
    };
  }
  async traffic(request: TrafficRequest) {
    const result = await this.its.get(request);
    return {
      items: result.data.items,
      count: result.data.items.length,
      speedUnit: null,
      trafficApplied: false,
      routeMatchStatus: 'NOT_MATCHED',
      cacheId: result.cacheId,
      cached: result.cached,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
    };
  }
}

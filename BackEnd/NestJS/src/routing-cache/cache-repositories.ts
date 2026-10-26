import { randomUUID } from 'node:crypto';
import { CacheDatabase } from './cache-database';
import { validateRouteData } from './ors.provider';
import { RoutingError } from './routing.errors';
import type {
  CacheEntry,
  CacheStore,
  OrsRequest,
  RouteData,
} from './routing.types';

interface Metadata {
  cache_id: string;
  fetched_at: Date | string;
  expires_at: Date | string;
}
function entry<T>(row: Metadata, data: T): CacheEntry<T> {
  return {
    cacheId: row.cache_id,
    fetchedAt: new Date(row.fetched_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    data,
  };
}
export class OrsCacheRepository implements CacheStore<OrsRequest, RouteData> {
  constructor(private readonly db: CacheDatabase) {}
  async find(hash: string, now: Date): Promise<CacheEntry<RouteData> | null> {
    const [row] = await this.db.query<
      Metadata & {
        distance_meters: number;
        duration_seconds: number;
        geometry: unknown;
        time_spans: unknown;
        warnings: unknown;
        attribution: string | null;
      }
    >(
      `SELECT cache_id,fetched_at,expires_at,distance_meters,duration_seconds,geometry,time_spans,warnings,attribution
       FROM ors_route_cache WHERE request_hash=$1 AND expires_at>$2`,
      [hash, now],
    );
    if (!row) return null;
    try {
      return entry(
        row,
        validateRouteData({
          distanceMeters: row.distance_meters,
          durationSeconds: row.duration_seconds,
          geometry: row.geometry,
          timeSpans: row.time_spans,
          attribution: row.attribution,
          warnings: row.warnings,
        }),
      );
    } catch {
      throw new RoutingError(
        503,
        'CACHE_DATA_INVALID',
        '저장된 ORS 캐시 데이터가 올바르지 않습니다.',
      );
    }
  }
  async save(
    hash: string,
    request: OrsRequest,
    data: RouteData,
    sourceUrl: string,
    fetchedAt: Date,
    expiresAt: Date,
  ): Promise<CacheEntry<RouteData>> {
    const [first, last] = [request.coordinates[0], request.coordinates.at(-1)!];
    const [row] = await this.db.query<Metadata>(
      `INSERT INTO ors_route_cache(
      cache_id,request_hash,request_params,profile,preference,origin_longitude,origin_latitude,
      destination_longitude,destination_latitude,distance_meters,duration_seconds,geometry,time_spans,attribution,warnings,source_url,fetched_at,expires_at)
      VALUES($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15::jsonb,$16,$17,$18)
      ON CONFLICT(request_hash) DO UPDATE SET request_params=EXCLUDED.request_params,profile=EXCLUDED.profile,
      preference=EXCLUDED.preference,origin_longitude=EXCLUDED.origin_longitude,origin_latitude=EXCLUDED.origin_latitude,
      destination_longitude=EXCLUDED.destination_longitude,destination_latitude=EXCLUDED.destination_latitude,
      distance_meters=EXCLUDED.distance_meters,duration_seconds=EXCLUDED.duration_seconds,geometry=EXCLUDED.geometry,
      time_spans=EXCLUDED.time_spans,attribution=EXCLUDED.attribution,warnings=EXCLUDED.warnings,source_url=EXCLUDED.source_url,
      fetched_at=EXCLUDED.fetched_at,expires_at=EXCLUDED.expires_at RETURNING cache_id,fetched_at,expires_at`,
      [
        randomUUID(),
        hash,
        JSON.stringify(request),
        request.profile,
        request.preference,
        first[0],
        first[1],
        last[0],
        last[1],
        data.distanceMeters,
        data.durationSeconds,
        JSON.stringify(data.geometry),
        JSON.stringify(data.timeSpans),
        data.attribution,
        JSON.stringify(data.warnings),
        sourceUrl,
        fetchedAt,
        expiresAt,
      ],
    );
    return entry(row, data);
  }
}

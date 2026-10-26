/**
 * ORS 결과의 DB 읽기/UPSERT 담당. hash는 요청 식별자, cache_id는 내부 캐시 UUID다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { randomUUID } from 'node:crypto';
import type { SqlExecutor } from './routing.ports';
import { validateRouteData } from './ors-response.mapper';
import { RoutingError } from './routing.errors';
import type {
  CacheEntry,
  CacheStore,
  OrsRequest,
  RouteData,
} from './routing.types';

interface Metadata {
  /** DB 캐시 행의 내부 UUID. */
  cache_id: string;
  /** PostgreSQL에서 반환된 수집 시각(Date 또는 문자열). */
  fetched_at: Date | string;
  /** PostgreSQL에서 반환된 만료 시각(Date 또는 문자열). */
  expires_at: Date | string;
}

/**
 * DB 캐시 메타정보를 서비스의 응답 이름과 시각 형식으로 바꾼다.
 *
 * 입력: row: cache_id/fetched_at/expires_at, data: 검증된 데이터 T.
 * @returns cacheId, fetchedAt, expiresAt, data로 구성된 CacheEntry<T>.
 * @example
 * // row.fetched_at이 Date여도 반환 fetchedAt은 UTC ISO 문자열
 */
function entry<T>(row: Metadata, data: T): CacheEntry<T> {
  return {
    cacheId: row.cache_id,
    fetchedAt: new Date(row.fetched_at).toISOString(),
    expiresAt: new Date(row.expires_at).toISOString(),
    data,
  };
}
export class OrsCacheRepository implements CacheStore<OrsRequest, RouteData> {
  /**
   * OrsCacheRepository 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: db: 주입받은 SQL 실행기
   * @returns new로 생성한 OrsCacheRepository 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // OrsCacheRepository(db)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new OrsCacheRepository(db);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly db: SqlExecutor) {}

  /**
   * 요청 해시가 같고 아직 만료되지 않은 경로 한 건을 읽는다.
   *
   * 입력: hash: 요청 해시, now: 만료 판정 시각.
   * @returns 검증된 CacheEntry<RouteData>. 없거나 expires_at<=now이면 null.
   * @example
   * await repository.find(hash, new Date()); // 유효한 행 또는 null
   *
   * DB JSON도 다시 검사한다. 손상된 좌표·시간 데이터는 CACHE_DATA_INVALID 예외다.
   */
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

  /**
   * ORS 경로 결과와 요청 조건을 DB 캐시에 저장한다.
   *
   * 입력: hash: 검색 키, request: ORS 요청, data: 거리·시간·좌표·구간, sourceUrl: 출처,
   * fetchedAt/expiresAt: 수집·만료 시각.
   * @returns DB가 반환한 캐시 ID와 시각, 전달한 data를 담은 CacheEntry<RouteData>.
   * @example
   * // 같은 request_hash를 다시 저장 → 기존 cache_id 유지, 데이터와 유효기간 교체
   *
   * 좌표 배열은 [경도, 위도]. JSON 문자열은 SQL에 이어붙이지 않고 매개변수로 전달한다.
   */
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

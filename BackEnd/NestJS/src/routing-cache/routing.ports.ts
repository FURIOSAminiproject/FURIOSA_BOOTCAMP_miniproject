/**
 * 경로 기능의 작은 입력·출력 계약. SQL/좌표/캐시/정리를 분리해 필요한 기능만 의존한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type {
  CacheResult,
  OrsRequest,
  ResolvedPoint,
  RouteData,
  RoutePoint,
  RouteRequest,
  RouteResponse,
} from './routing.types';

export interface SqlExecutor {
  /**
   * SQL을 실행하고 DB 예외를 공개 가능한 경로 오류로 바꾼다.
   *
   * 입력: sql: $1 등 자리표시자를 사용한 SQL, params: 바인딩 값 배열, operation: 로그용 작업명.
   * @returns 조회 결과 T[] 또는 databaseError로 변환한 예외.
   * @example
   * await db.query<{value:number}>("SELECT $1::int AS value", [1]); // [{value:1}]
   *
   * 원본 SQL 오류 메시지를 API 응답으로 그대로 노출하지 않는다.
   */
  query<T>(sql: string, params?: unknown[], operation?: string): Promise<T[]>;
}
export interface PlaceCoordinateRecord {
  /** 활성 장소의 내부 UUID. */
  placeId: string;
  /** DB 위도. PostgreSQL numeric은 문자열로 올 수 있고 미보유 시 null. */
  latitude: string | number | null;
  /** DB 경도. PostgreSQL numeric은 문자열로 올 수 있고 미보유 시 null. */
  longitude: string | number | null;
}
// 구현은 활성 장소만 반환한다. 없는 ID를 임의 좌표로 채우지 않고 결과에서 제외한다.
export interface PlaceCoordinateReader {
  /**
   * 활성 장소들의 DB 좌표만 한 번에 조회한다.
   *
   * 입력: ids: 내부 place_id(UUID) 배열. 빈 배열이면 DB를 조회하지 않는다.
   * @returns 활성 행만 담은 PlaceCoordinateRecord[]. 없는 ID는 반환 목록에서 빠진다.
   * @example
   * await places.findActive([]); // []이며 SQL 실행 없음
   *
   * PostgreSQL numeric은 문자열일 수 있다. 숫자 변환과 좌표 검사는 resolver가 담당한다.
   */
  findActive(ids: string[]): Promise<PlaceCoordinateRecord[]>;
}
export interface PointResolver {
  /**
   * 장소 ID와 직접 입력한 좌표를 모두 실제 좌표로 맞춘다.
   *
   * 입력: points: 검증된 장소 UUID 또는 위도/경도 배열. 입력 순서가 이동 순서다.
   * @returns 같은 순서·개수의 ResolvedPoint[]. 직접 좌표의 placeId는 null.
   * @example
   * await resolver.resolve([{latitude:35.1,longitude:128.9}]); // [{latitude:35.1,longitude:128.9,placeId:null}]
   *
   * 장소 ID만 중복을 제거해 조회한다. 없는 장소는 404, 좌표 없는 장소는 422, DB 조회 실패는 503이다.
   */
  resolve(points: RoutePoint[]): Promise<ResolvedPoint[]>;
}
export interface CacheLookup<Q, T> {
  /**
   * 같은 요청의 동시 처리를 합치고 캐시 또는 API 결과를 돌려준다.
   *
   * 입력: request: 해시를 만들고 제공자에 전달할 요청 Q.
   * @returns 데이터·캐시 ID·수집/만료 시각·cached 여부가 있는 CacheResult<T>.
   * @example
   * await cache.get(request); // 유효한 DB 캐시가 있으면 cached=true
   *
   * 같은 프로세스에서 처리 중인 같은 요청은 한 Promise를 공유한다. 여러 서버 전체를 묶는 분산 잠금은 아니다.
   */
  get(request: Q): Promise<CacheResult<T>>;
}
/** ORS 요청을 받아 캐시 정보를 포함한 경로 결과를 반환하는 조회 계약. */
export type RouteLookup = CacheLookup<OrsRequest, RouteData>;
export interface RoutePlanner {
  /**
   * 좌표 해석·ORS 캐시 조회·최종 경로 응답 조립을 조율한다.
   *
   * 입력: request: 검증된 자동차/도보 모드, 경로 선호도, 순서가 있는 지점 목록.
   * @returns RouteResponse. 거리 m, 시간 초, 지도 선, 구간 시간, 캐시 시각 등을 포함한다.
   * @example
   * // durationSeconds=625.3이면 약 10분 25초. trafficApplied=false
   *
   * 위도/경도 객체를 ORS의 [경도, 위도] 배열로 바꾼다. calculatedAt은 캐시 최초 수집 시각이며 실시간 교통 정체는 반영하지 않는다.
   */
  route(request: RouteRequest): Promise<RouteResponse>;
}
export interface SchemaStatus {
  /** 검사한 캐시 테이블 이름. */
  table: string;
  /** 필요하지만 존재하지 않은 컬럼 이름들. 모두 있으면 []. */
  missingColumns: string[];
}
export interface CacheSchemaReader {
  /**
   * 현재 스키마의 ORS 캐시 테이블에서 누락된 컬럼을 찾는다.
   *
   * 입력: 인자 없음. information_schema에서 정해진 테이블·컬럼 이름을 조회한다.
   * @returns [{table, missingColumns}]. 필요한 이름이 모두 있으면 missingColumns=[].
   * @example
   * await repository.schema(); // [{table:"ors_route_cache",missingColumns:[]}]
   *
   * 읽기 전용 검사이며 컬럼 자료형이나 모든 DB 권한까지 검사하는 함수는 아니다.
   */
  schema(): Promise<SchemaStatus[]>;
}
export interface ExpiredCacheCleaner {
  /**
   * 기준 시각까지 만료된 캐시를 제한된 개수만 삭제한다.
   *
   * 입력: now: expires_at<=now인 행을 만료로 판정할 Date.
   * @returns {orsDeleted: 실제 삭제 수}.
   * @example
   * await repository.cleanup(new Date()); // 예: {orsDeleted:3}
   *
   * 최대 cleanupLimit건씩 오래된 행부터 삭제한다. 다른 작업이 잠근 행은 SKIP LOCKED로 건너뛴다. ORS 호출은 하지 않는다.
   */
  cleanup(now: Date): Promise<{ orsDeleted: number }>;
}
export interface CacheMaintenanceStore
  extends CacheSchemaReader, ExpiredCacheCleaner {}

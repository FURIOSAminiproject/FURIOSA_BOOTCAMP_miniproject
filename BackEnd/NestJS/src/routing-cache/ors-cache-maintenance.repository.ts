/**
 * 캐시 테이블 점검·만료 삭제 SQL 담당. 스키마를 자동으로 변경하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type {
  CacheMaintenanceStore,
  SchemaStatus,
  SqlExecutor,
} from './routing.ports';
import { ORS_CACHE_POLICY } from './routing.policy';
const columns: Record<string, string[]> = {
  ors_route_cache: [
    'cache_id',
    'request_hash',
    'request_params',
    'profile',
    'preference',
    'origin_longitude',
    'origin_latitude',
    'destination_longitude',
    'destination_latitude',
    'distance_meters',
    'duration_seconds',
    'geometry',
    'time_spans',
    'attribution',
    'warnings',
    'source_url',
    'fetched_at',
    'expires_at',
  ],
};
export class OrsCacheMaintenanceRepository implements CacheMaintenanceStore {
  /**
   * OrsCacheMaintenanceRepository 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: db: 주입받은 SQL 실행기
   * @returns new로 생성한 OrsCacheMaintenanceRepository 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // OrsCacheMaintenanceRepository(db)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new OrsCacheMaintenanceRepository(db);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly db: SqlExecutor) {}

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
  async schema(): Promise<SchemaStatus[]> {
    const rows = await this.db.query<{
      table_name: string;
      column_name: string;
    }>(
      'SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1::text[])',
      [Object.keys(columns)],
      'schema_check',
    );
    return Object.entries(columns).map(
      /**
       * 테이블마다 누락된 필수 컬럼 이름을 계산한다.
       *
       * 입력: [table,names]: 대상 테이블명과 필요한 컬럼 배열. rows는 실제 조회 결과다.
       * @returns {table,missingColumns} 객체.
       * @example
       * // expires_at이 없으면 missingColumns에 "expires_at" 포함
       */
      ([table, names]) => ({
        table,
        missingColumns: names.filter(
          /**
           * 필요한 컬럼 하나가 실제 DB 결과에 없는지 검사한다.
           *
           * 입력: name: 필요한 컬럼명. 바깥 table/rows를 사용한다.
           * @returns 같은 테이블·컬럼을 찾지 못하면 true.
           * @example
           * // name="expires_at"이 조회되지 않았다면 true
           */
          (name) =>
            !rows.some(
              /**
               * 조회 행이 찾는 테이블·컬럼과 정확히 같은지 확인한다.
               *
               * 입력: row: information_schema의 행.
               * @returns table_name과 column_name이 둘 다 일치하면 true.
               * @example
               * // row.column_name="cache_id", name="expires_at" → false
               */
              (row) => row.table_name === table && row.column_name === name,
            ),
        ),
      }),
    );
  }

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
  async cleanup(now: Date): Promise<{ orsDeleted: number }> {
    const [row] = await this.db.query<{
      ors_deleted: number;
    }>(
      `WITH
      expired_ors AS (SELECT cache_id FROM ors_route_cache WHERE expires_at<=$1
        ORDER BY expires_at LIMIT ${ORS_CACHE_POLICY.cleanupLimit} FOR UPDATE SKIP LOCKED),
      deleted_ors AS (DELETE FROM ors_route_cache c USING expired_ors e WHERE c.cache_id=e.cache_id RETURNING c.cache_id)
      SELECT (SELECT count(*) FROM deleted_ors)::int AS ors_deleted`,
      [now],
      'cleanup',
    );
    return { orsDeleted: row.ors_deleted };
  }
}

import type { DataSource } from 'typeorm';
import { databaseError } from './routing.errors';

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
export class CacheDatabase {
  constructor(private readonly db: Pick<DataSource, 'query'>) {}
  async query<T>(
    sql: string,
    params: unknown[] = [],
    operation = 'query',
  ): Promise<T[]> {
    try {
      return await this.db.query(sql, params);
    } catch (error) {
      throw databaseError(error, operation);
    }
  }
  async schema(): Promise<{ table: string; missingColumns: string[] }[]> {
    const rows = await this.query<{ table_name: string; column_name: string }>(
      'SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND table_name=ANY($1::text[])',
      [Object.keys(columns)],
      'schema_check',
    );
    return Object.entries(columns).map(([table, names]) => ({
      table,
      missingColumns: names.filter(
        (name) =>
          !rows.some(
            (row) => row.table_name === table && row.column_name === name,
          ),
      ),
    }));
  }
  async cleanup(now: Date): Promise<{ orsDeleted: number }> {
    const [row] = await this.query<{
      ors_deleted: number;
    }>(
      `WITH
      expired_ors AS (SELECT cache_id FROM ors_route_cache WHERE expires_at<=$1
        ORDER BY expires_at LIMIT 1000 FOR UPDATE SKIP LOCKED),
      deleted_ors AS (DELETE FROM ors_route_cache c USING expired_ors e WHERE c.cache_id=e.cache_id RETURNING c.cache_id)
      SELECT (SELECT count(*) FROM deleted_ors)::int AS ors_deleted`,
      [now],
      'cleanup',
    );
    return { orsDeleted: row.ors_deleted };
  }
}

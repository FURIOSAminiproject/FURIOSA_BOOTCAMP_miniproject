import type { DataSource, QueryRunner } from 'typeorm';
import type { IngestionGate } from './tour-ingestion.ports';
import { TourStoreError } from './tour-errors';

export interface SqlSession {
  transaction<T>(work: (runner: Pick<QueryRunner, 'query'>) => Promise<T>): Promise<T>;
}
export class TourDbSession implements IngestionGate, SqlSession {
  constructor(private readonly database: Pick<DataSource, 'createQueryRunner'>) {}
  async withLock<T>(work: () => Promise<T>): Promise<T> {
    const runner = this.database.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      const [row] = await runner.query('SELECT pg_try_advisory_lock(76224107) AS locked');
      if (row.locked !== true) throw new TourStoreError('INGESTION_ALREADY_RUNNING');
      locked = true;
      return await work();
    } finally {
      try { if (locked) await runner.query('SELECT pg_advisory_unlock(76224107)'); }
      finally { await runner.release(); }
    }
  }
  async transaction<T>(work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    const runner = this.database.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      const value = await work(runner);
      await runner.commitTransaction();
      return value;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : 'OPERATION_FAILED';
      throw new TourStoreError(/^[A-Z0-9_]{1,40}$/i.test(code) ? code : 'OPERATION_FAILED');
    } finally { await runner.release(); }
  }
  async assertSchema(): Promise<void> {
    await this.transaction(async runner => {
      const rows: { table_name: string; count: number }[] = await runner.query(`SELECT table_name, count(*)::int AS count
        FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name IN ('place_categories','places','place_reviews') GROUP BY table_name`);
      const expected: Record<string, number> = { place_categories: 5, places: 32, place_reviews: 7 };
      if (rows.length !== 3 || rows.some(row => expected[row.table_name] !== row.count)) throw new TourStoreError('SCHEMA_V2_REQUIRED');
    });
  }
}

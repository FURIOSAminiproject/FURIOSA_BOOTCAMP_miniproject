import type { DataSource } from 'typeorm';
import { ExplorerRepository } from '../route-explorer/explorer.repository';

/** 도구 SQL은 요청 전용 READ ONLY 트랜잭션에서만 실행한다. SET LOCAL은 풀에 남지 않는다. */
export async function withRevisionReadOnly<T>(
  db: Pick<DataSource, 'createQueryRunner'>,
  work: (repository: ExplorerRepository) => Promise<T>,
): Promise<T> {
  const runner = db.createQueryRunner();
  try {
    await runner.connect();
    await runner.startTransaction('READ COMMITTED');
    await runner.query('SET TRANSACTION READ ONLY');
    await runner.query("SET LOCAL statement_timeout = '3000ms'");
    await runner.query("SET LOCAL lock_timeout = '500ms'");
    const result = await work(
      new ExplorerRepository({ query: runner.query.bind(runner) }),
    );
    await runner.commitTransaction();
    return result;
  } catch (error) {
    if (runner.isTransactionActive) {
      try {
        await runner.rollbackTransaction();
      } catch {
        /* 원래 오류를 보존한다. */
      }
    }
    throw error;
  } finally {
    await runner.release();
  }
}

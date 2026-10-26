/**
 * DB 연결·트랜잭션·수집 중복 잠금 담당. 실제 테이블 DDL은 별도로 적용해야 한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { DataSource, QueryRunner } from 'typeorm';
import type { IngestionGate } from './tour-ingestion.ports';
import { TourStoreError } from './tour-errors';

export interface SqlSession {
  /**
   * 전달받은 DB 작업을 한 트랜잭션으로 처리한다.
   *
   * 입력: work: query를 실행할 runner를 받아 결과를 반환하는 비동기 함수.
   * @returns 성공 시 work의 결과 T. 실패 시 롤백 후 안전한 TourStoreError.
   * @example
   * await session.transaction(async runner => runner.query("SELECT 1 AS value"));
   *
   * 성공하면 commit, 실패하면 rollback, 마지막에는 연결을 반납한다.
   */
  transaction<T>(
    work: (runner: Pick<QueryRunner, 'query'>) => Promise<T>,
  ): Promise<T>;
}
export class TourDbSession implements IngestionGate, SqlSession {
  /**
   * TourDbSession 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: database: TypeORM DB 연결/실행기
   * @returns new로 생성한 TourDbSession 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourDbSession(database)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourDbSession(database);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly database: Pick<DataSource, 'createQueryRunner'>,
  ) {}

  /**
   * DB 잠금을 잡은 동안 하나의 장소 수집만 실행한다.
   *
   * 입력: work: 잠금 확보 후 실행할 비동기 함수.
   * @returns work가 반환한 값 T. 이미 수집 중이면 INGESTION_ALREADY_RUNNING 예외.
   * @example
   * await session.withLock(async () => "수집 완료"); // "수집 완료"
   *
   * 전용 연결에 advisory lock을 잡고 finally에서 잠금과 연결을 해제한다. 전체 수집을 하나의 트랜잭션으로 묶지는 않는다.
   */
  async withLock<T>(work: () => Promise<T>): Promise<T> {
    const runner = this.database.createQueryRunner();
    let locked = false;
    try {
      await runner.connect();
      const [row] = await runner.query(
        'SELECT pg_try_advisory_lock(76224107) AS locked',
      );
      if (row.locked !== true)
        throw new TourStoreError('INGESTION_ALREADY_RUNNING');
      locked = true;
      return await work();
    } finally {
      try {
        if (locked) await runner.query('SELECT pg_advisory_unlock(76224107)');
      } finally {
        await runner.release();
      }
    }
  }

  /**
   * 전달받은 DB 작업을 한 트랜잭션으로 처리한다.
   *
   * 입력: work: query를 실행할 runner를 받아 결과를 반환하는 비동기 함수.
   * @returns 성공 시 work의 결과 T. 실패 시 롤백 후 안전한 TourStoreError.
   * @example
   * await session.transaction(async runner => runner.query("SELECT 1 AS value"));
   *
   * 성공하면 commit, 실패하면 rollback, 마지막에는 연결을 반납한다.
   */
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
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : 'OPERATION_FAILED';
      throw new TourStoreError(
        /^[A-Z0-9_]{1,40}$/i.test(code) ? code : 'OPERATION_FAILED',
      );
    } finally {
      await runner.release();
    }
  }

  /**
   * 장소 수집에 필요한 v2 테이블의 존재와 컬럼 수를 확인한다.
   *
   * 입력: 인자 없음. 현재 DB 스키마의 information_schema를 읽는다.
   * @returns 정상이면 Promise<void>, 예상과 다르면 SCHEMA_V2_REQUIRED 예외.
   * @example
   * await session.assertSchema(); // place_categories=5, places=32, place_reviews=7 컬럼 확인
   *
   * 테이블을 만들거나 변경하지 않는다. 컬럼 수 확인이므로 이름·자료형·접근 권한 전체 검증은 아니다.
   */
  async assertSchema(): Promise<void> {
    await this.transaction(
      /**
       * 트랜잭션 안에서 테이블별 컬럼 수를 읽고 기대값과 비교한다.
       *
       * 입력: runner: SQL 실행기.
       * @returns 정상이면 Promise<void>, 불일치하면 SCHEMA_V2_REQUIRED 예외.
       * @example
       * // places의 컬럼 수가 31이면 예외
       */
      async (runner) => {
        const rows: { table_name: string; count: number }[] =
          await runner.query(`SELECT table_name, count(*)::int AS count
        FROM information_schema.columns WHERE table_schema=current_schema()
        AND table_name IN ('place_categories','places','place_reviews') GROUP BY table_name`);
        const expected: Record<string, number> = {
          place_categories: 5,
          places: 32,
          place_reviews: 7,
        };
        if (
          rows.length !== 3 ||
          rows.some(
            /**
             * 테이블 한 개의 컬럼 수가 기대와 다른지 확인한다.
             *
             * 입력: row: table_name과 count.
             * @returns 기대한 컬럼 수와 다르면 true.
             * @example
             * // {table_name:"places",count:31} → true (기대 32)
             */
            (row) => expected[row.table_name] !== row.count,
          )
        )
          throw new TourStoreError('SCHEMA_V2_REQUIRED');
      },
    );
  }
}

/**
 * 경로 캐시 SQL 실행의 얇은 연결부. 원본 DB 오류를 안전한 서비스 오류로 바꾼다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { DataSource } from 'typeorm';
import { databaseError } from './routing.errors';
import type { SqlExecutor } from './routing.ports';

// Driver boundary only: SQL policies live in their respective repositories.
export class CacheDatabase implements SqlExecutor {
  /**
   * CacheDatabase 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: db: 주입받은 SQL 실행기
   * @returns new로 생성한 CacheDatabase 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // CacheDatabase(db)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new CacheDatabase(db);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly db: Pick<DataSource, 'query'>) {}

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
}

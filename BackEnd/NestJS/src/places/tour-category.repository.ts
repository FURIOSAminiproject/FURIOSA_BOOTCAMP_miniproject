/**
 * 분류 DB 저장 담당. API 코드(category_code)와 내부 UUID(category_id)를 연결한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { randomUUID } from 'node:crypto';
import type { SqlSession } from './tour-db.session';
import type { CategoryWriter } from './tour-ingestion.ports';
import type { CategoryInput, References } from './tour-types';

export class TourCategoryRepository implements CategoryWriter {
  /**
   * TourCategoryRepository 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: session: 트랜잭션 실행기
   * @returns new로 생성한 TourCategoryRepository 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourCategoryRepository(session)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourCategoryRepository(session);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly session: SqlSession) {}

  /**
   * 대·중·소분류를 부모부터 DB에 저장하고 코드별 내부 ID를 돌려준다.
   *
   * 입력: entries: code/name/level/parentCode가 있는 분류 목록.
   * @returns 분류 코드 → {id: 내부 UUID, level: 단계}인 Map.
   * @example
   * await repository.categories([{ code: "NA", name: "자연", level: 1, parentCode: null }]);
   *
   * 한 트랜잭션에서 단계 1→2→3 순서로 저장한다. 같은 code의 기존 UUID는 유지한다.
   */
  async categories(
    entries: CategoryInput[],
  ): Promise<References['categories']> {
    return this.session.transaction(
      /**
       * 같은 트랜잭션 안에서 분류를 순서대로 저장하고 ID 사전을 읽는다.
       *
       * 입력: runner: transaction이 제공한 SQL 실행기. 바깥 entries를 사용한다.
       * @returns 분류 코드→내부 UUID/단계 Map.
       * @example
       * // NA(대분류)를 먼저 저장한 후 NA04(중분류)의 부모 ID 연결
       */
      async (runner) => {
        for (const level of [1, 2, 3]) {
          const batch = entries.filter(
            /**
             * 현재 저장 단계에 해당하는 분류만 선택한다.
             *
             * 입력: entry: 입력 분류 한 건. 바깥 level은 1, 2 또는 3이다.
             * @returns 단계가 일치하면 true.
             * @example
             * // entry.level=2, level=2 → true
             */
            (entry) => entry.level === level,
          );
          if (!batch.length) continue;
          await runner.query(
            `INSERT INTO place_categories(category_id,category_code,category_name,category_level,parent_category_id)
          SELECT r.id::uuid,r.code,r.name,$2,p.category_id
          FROM jsonb_to_recordset($1::jsonb) AS r(id text,code text,name text,parent_code text)
          LEFT JOIN place_categories p ON p.category_code=r.parent_code
          ON CONFLICT(category_code) DO UPDATE SET category_name=EXCLUDED.category_name,
            category_level=EXCLUDED.category_level,parent_category_id=EXCLUDED.parent_category_id`,
            [
              JSON.stringify(
                batch.map(
                  /**
                   * 분류 한 건을 JSON 일괄 INSERT용 행으로 바꾼다.
                   *
                   * 입력: e: code/name/parentCode를 가진 분류.
                   * @returns 임시 UUID와 code/name/parent_code가 있는 객체.
                   * @example
                   * // parentCode="NA" → parent_code="NA"; 기존 code 충돌 시 기존 UUID 유지
                   */
                  (e) => ({
                    id: randomUUID(),
                    code: e.code,
                    name: e.name,
                    parent_code: e.parentCode,
                  }),
                ),
              ),
              level,
            ],
          );
        }
        const rows: {
          category_id: string;
          category_code: string;
          category_level: number;
        }[] = await runner.query(
          'SELECT category_id,category_code,category_level FROM place_categories',
        );
        return new Map(
          rows.map(
            /**
             * DB 분류 행을 Map에 넣을 키·값 쌍으로 바꾼다.
             *
             * 입력: r: category_code/category_id/category_level 행.
             * @returns [코드, {id, level}] 쌍.
             * @example
             * // category_code="NA", category_level=1 → ["NA", {id: 해당 UUID, level:1}]
             */
            (r) => [
              r.category_code,
              { id: r.category_id, level: r.category_level },
            ],
          ),
        );
      },
    );
  }
}

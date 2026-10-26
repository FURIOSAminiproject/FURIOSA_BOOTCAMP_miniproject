/**
 * 장소 SQL 저장 담당. 내부 UUID를 유지하며 외부 content_id로 같은 장소를 찾는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { randomUUID } from 'node:crypto';
import type { SqlSession } from './tour-db.session';
import type { PlaceMapper, PlaceWriter } from './tour-ingestion.ports';
import type { References, SaveResult, Snapshots, TourItem } from './tour-types';
import { PLACE_FIELDS } from './tour-place.mapper';

// SQL 저장만 담당한다. 변환·트랜잭션·잠금 기능은 생성자에서 주입받는다.
export class TourStore implements PlaceWriter {
  /**
   * TourStore 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: session: 트랜잭션 실행기; mapper: 원본 응답을 DB 컬럼으로 바꾸는 변환기
   * @returns new로 생성한 TourStore 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourStore(session, mapper)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourStore(session, mapper);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly session: SqlSession,
    private readonly mapper: PlaceMapper,
  ) {}

  /**
   * 외부 장소 ID(content_id)를 기준으로 장소 한 건을 저장한다.
   *
   * 입력: item: 원본 행, fresh: 이번 수집 스냅샷, refs: 분류·지역 사전.
   * @returns {id: 내부 place UUID, status: inserted/updated/unchanged}.
   * @example
   * // 동일 contentid의 첫 저장 → inserted, 이름 변경 → updated, 내용 동일 → unchanged
   *
   * 기존 행을 잠그고 매핑 후 UPSERT한다. 기존 UUID는 유지하며 내용 변경 때만 updated_at을 갱신한다. last_synced_at은 저장할
   * 때 갱신한다.
   */
  async save(
    item: TourItem,
    fresh: Snapshots,
    refs: References,
  ): Promise<SaveResult> {
    const patch = this.mapper.basic(item, fresh, refs);
    return this.session.transaction(
      /**
       * 한 장소의 기존 행 잠금·병합·UPSERT를 트랜잭션 안에서 실행한다.
       *
       * 입력: runner: SQL 실행기. 바깥 patch/fresh/mapper를 사용한다.
       * @returns 내부 ID와 inserted/updated/unchanged 저장 결과.
       * @example
       * // 기존 content_id가 있으면 기존 place_id를 유지해 반환
       */
      async (runner) => {
        const [old]: TourItem[] = await runner.query(
          'SELECT * FROM places WHERE content_id=$1 FOR UPDATE',
          [patch.content_id],
        );
        const { next, raw, changed } = this.mapper.merge(old, patch, fresh);
        const columns = [
          'place_id',
          ...PLACE_FIELDS,
          'raw_data',
          'last_synced_at',
        ];
        const values = [
          randomUUID(),
          ...PLACE_FIELDS.map(
            /**
             * 컬럼 순서에 맞는 바인딩 값을 만들고 JSON 컬럼은 직렬화한다.
             *
             * 입력: key: PLACE_FIELDS의 컬럼명. next에서 값을 읽는다.
             * @returns images/fees는 JSON 문자열, 그 외 값 또는 null.
             * @example
             * // key="fees", 값 없음 → "[]"; key="phone", 값 없음 → null
             */
            (key) =>
              ['images', 'fees'].includes(key)
                ? JSON.stringify(next[key] ?? [])
                : (next[key] ?? null),
          ),
          JSON.stringify(raw),
          new Date(),
        ];
        const changedParameter = values.push(changed);
        const [saved] = await runner.query(
          `INSERT INTO places (${columns.join(',')})
        VALUES (${columns
          .map(
            /**
             * INSERT 컬럼 수에 맞는 SQL 자리표시자를 만든다.
             *
             * 입력: _: 사용하지 않는 컬럼명, i: 0부터 시작하는 위치.
             * @returns $1, $2 같은 자리표시자 문자열.
             * @example
             * // i=0 → "$1"; 값은 별도 배열로 전달
             */
            (_, i) => `$${i + 1}`,
          )
          .join(',')})
        ON CONFLICT(content_id) DO UPDATE SET
          ${columns
            .filter(
              /**
               * 충돌 갱신 시 내부 ID와 외부 ID를 덮어쓰지 않게 제외한다.
               *
               * 입력: c: INSERT 컬럼명.
               * @returns place_id/content_id이면 false, 나머지는 true.
               * @example
               * // "place_id" → false, "name" → true
               */
              (c) => c !== 'place_id' && c !== 'content_id',
            )
            .map(
              /**
               * 같은 장소를 갱신할 SQL 대입식을 만든다.
               *
               * 입력: c: 허용 목록에서 고른 컬럼명.
               * @returns 컬럼=EXCLUDED.컬럼 문자열.
               * @example
               * // c="name" → "name=EXCLUDED.name"
               *
               * API 값을 컬럼명으로 사용하지 않는다. 값은 바인딩 배열로 전달한다.
               */
              (c) => `${c}=EXCLUDED.${c}`,
            )
            .join(',')},
          updated_at=CASE WHEN $${changedParameter} THEN CURRENT_TIMESTAMP ELSE places.updated_at END
        RETURNING place_id`,
          values,
        );
        return {
          id: saved.place_id,
          status: !old ? 'inserted' : changed ? 'updated' : 'unchanged',
        };
      },
    );
  }
}

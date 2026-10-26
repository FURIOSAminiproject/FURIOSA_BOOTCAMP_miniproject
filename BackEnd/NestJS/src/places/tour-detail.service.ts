/**
 * 한 장소의 상세 API 응답을 모으는 담당. 완성된 묶음만 반환하며 DB에는 쓰지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { DetailLoader, DetailReader } from './tour-ingestion.ports';
import { TourApiError } from './tour-errors';
import { text } from './tour-mapping';
import type { Snapshots, TourItem } from './tour-types';
import { DEFAULT_DETAIL_STEPS, type DetailStep } from './tour-detail.plan';

export class TourDetailService implements DetailLoader {
  private readonly steps: readonly DetailStep[];

  /**
   * TourDetailService 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: api: 필요한 API 조회 기능; steps: 상세 조회 단계 목록(기본 필수 세 단계); now: 현재 시각을 반환하는 함수(기본 현재
   * Date)
   * @returns new로 생성한 TourDetailService 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourDetailService(api, steps, now)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourDetailService(api, steps, now);
   *
   * 상세 단계가 중복되거나 필수 API가 빠지면 생성 중 예외를 던진다.
   */
  constructor(
    private readonly api: DetailReader,
    steps: readonly DetailStep[] = DEFAULT_DETAIL_STEPS,

    /**
     * 현재 시각을 공급하는 기본 시계다.
     *
     * 입력: 인자 없음. 필요하면 테스트에서 고정 시각 함수로 교체한다.
     * @returns 호출 순간의 Date 객체.
     * @example
     * // () => new Date("2026-10-26T00:00:00Z")로 바꾸면 동일 시각 기준으로 검증 가능
     */
    private readonly now: () => Date = () => new Date(),
  ) {
    if (
      new Set(
        steps.map(
          /**
           * 상세 단계 중복 검사용 API 이름을 읽는다.
           *
           * 입력: step: 상세 조회 단계.
           * @returns endpoint 문자열.
           * @example
           * // detailIntro2 단계 → "detailIntro2"
           */
          (step) => step.endpoint,
        ),
      ).size !== steps.length
    )
      throw new Error('Duplicate detail step');
    if (
      steps.length !== DEFAULT_DETAIL_STEPS.length ||
      DEFAULT_DETAIL_STEPS.some(
        /**
         * 필수 상세 API가 등록 목록에 빠져 있는지 검사한다.
         *
         * 입력: required: 기본 필수 단계. 바깥 steps에서 같은 API를 찾는다.
         * @returns 필수 API가 없으면 true.
         * @example
         * // detailImage2가 등록되지 않았으면 true
         */
        (required) =>
          !steps.some(
            /**
             * 등록한 단계가 찾고 있는 필수 API와 같은지 비교한다.
             *
             * 입력: step: 등록한 단계, required: 바깥의 필수 단계.
             * @returns endpoint가 같으면 true.
             * @example
             * // 둘 다 detailImage2이면 true
             */
            (step) => step.endpoint === required.endpoint,
          ),
      )
    ) {
      throw new Error('Detail steps must cover required endpoints');
    }
    this.steps = [...steps];
  }

  /**
   * 한 장소의 공통·소개·반복·이미지 상세 응답을 모은다.
   *
   * 입력: contentId: TourAPI의 외부 장소 ID 문자열.
   * @returns 공통 item과 API별 수집 시각·응답·출처 URL인 snapshots.
   * @example
   * await details.load("126128"); // { item: 공통 정보, snapshots: 상세 응답 묶음 }
   *
   * 공통 정보 후 나머지 세 종류의 모든 페이지를 조회한다. 하나라도 실패하면 완성되지 않은 묶음을 반환하지 않으며 여기서는 DB에 쓰지 않는다.
   */
  async load(
    contentId: string,
  ): Promise<{ item: TourItem; snapshots: Snapshots }> {
    const common = await this.api.page('detailCommon2', {
      contentId,
      pageNo: 1,
      numOfRows: 10,
    });
    const item = common.items[0];
    if (!item || text(item.contentid) !== contentId)
      throw new TourApiError('DETAIL_ID_MISMATCH', 'detailCommon2');
    const snapshots: Snapshots = {
      detailCommon2: {
        fetched_at: this.now().toISOString(),
        items: common.items,
        source_url: common.sourceUrl,
      },
    };
    for (const step of this.steps) {
      const { endpoint } = step;
      const { items, sourceUrls } = await this.api.allWithSources(
        endpoint,
        step.params(contentId, item),
      );
      if (
        items.some(
          /**
           * 상세 페이지에 다른 장소의 응답이 섞였는지 검사한다.
           *
           * 입력: row: 응답 항목. 바깥 contentId가 요청 장소 ID다.
           * @returns contentid가 있으며 요청 ID와 다르면 true.
           * @example
           * // 요청 126128, 응답 contentid=127974 → true
           */
          (row) =>
            row.contentid !== undefined && text(row.contentid) !== contentId,
        )
      )
        throw new TourApiError('DETAIL_ID_MISMATCH', endpoint);
      snapshots[endpoint] = {
        fetched_at: this.now().toISOString(),
        items,
        source_url: sourceUrls.at(-1),
        source_urls: sourceUrls,
      };
    }
    // 한 호출이라도 실패하면 부분 묶음을 반환하지 않는다. 이 담당은 DB에 직접 저장하지 않는다.
    return { item, snapshots };
  }
}

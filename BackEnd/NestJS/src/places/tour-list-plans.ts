/**
 * 초기/증분/축제 목록의 조회 계획 담당. 계획을 만드는 것과 실제 API 호출을 분리한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { IngestionOptions } from './tour-ingestion.options';
import type { ListPlan, ListPlanResolver } from './tour-ingestion.ports';
import type { TourParams } from './tour-types';

export interface ListStrategy {
  /** 이 전략을 선택할 수집 모드 이름. 같은 이름을 중복 등록하지 않는다. */
  readonly mode: string;

  /**
   * 등록한 수집 모드의 목록 조회 계획을 만드는 계약이다.
   *
   * 입력: options: 검증된 수집 모드와 필터.
   * @returns endpoint/params/partitions가 있는 ListPlan.
   * @example
   * // initial 전략 → areaBasedList2, sync 전략 → areaBasedSyncList2 + showflag=1/0
   */
  create(options: IngestionOptions): ListPlan;
}

/**
 * 공통 수집 옵션을 TourAPI 쿼리 이름으로 바꾼다.
 *
 * 입력: options: 지역·시군구·관광 타입이 포함된 수집 조건.
 * @returns arrange=C와 지정된 필터만 포함한 TourParams.
 * @example
 * filters({ ...options, region: "26" }); // lDongRegnCd: "26" 포함
 *
 * 이 함수는 요청 계획만 만들며 API를 호출하지 않는다.
 */
function filters(options: IngestionOptions): TourParams {
  const params: TourParams = { arrange: 'C' };
  if (options.region) params.lDongRegnCd = options.region;
  if (options.district) params.lDongSignguCd = options.district;
  if (options.contentType) params.contentTypeId = options.contentType;
  return params;
}
const visibleList = [{ key: 'list', params: {} }];
export const DEFAULT_LIST_STRATEGIES: readonly ListStrategy[] = [
  {
    mode: 'initial',

    /**
     * 초기 장소 목록 조회 계획을 만든다.
     *
     * 입력: options: 지역·시군구·관광 타입 조건.
     * @returns areaBasedList2를 한 목록으로 읽을 ListPlan.
     * @example
     * // mode=initial, region=26 → areaBasedList2 + lDongRegnCd=26
     */
    create: (options) => ({
      endpoint: 'areaBasedList2',
      params: filters(options),
      partitions: visibleList,
    }),
  },
  {
    mode: 'sync',

    /**
     * 변경 장소를 공개/비공개 두 목록으로 나눌 계획을 만든다.
     *
     * 입력: options: modifiedSince와 지역 조건.
     * @returns areaBasedSyncList2 계획 및 showflag=1/0 분할.
     * @example
     * // modifiedSince="20261024" → modifiedtime="20261024", 두 파티션
     */
    create: (options) => ({
      endpoint: 'areaBasedSyncList2',
      params: { ...filters(options), modifiedtime: options.modifiedSince! },
      partitions: ['1', '0'].map(
        /**
         * 공개 상태별 증분 조회 파티션을 만든다.
         *
         * 입력: showflag: "1"(공개) 또는 "0"(비공개).
         * @returns 식별 key와 해당 showflag 쿼리.
         * @example
         * // "0" → {key:"showflag=0",params:{showflag:"0"}}
         */
        (showflag) => ({
          key: `showflag=${showflag}`,
          params: { showflag },
        }),
      ),
    }),
  },
  {
    mode: 'festivals',

    /**
     * 행사 기간을 포함한 축제 목록 조회 계획을 만든다.
     *
     * 입력: options: eventStart, 선택적 eventEnd, 지역 조건.
     * @returns searchFestival2와 행사 기간 쿼리인 ListPlan.
     * @example
     * // eventStart="20261026" → eventStartDate="20261026"
     */
    create: (options) => ({
      endpoint: 'searchFestival2',
      params: {
        ...filters(options),
        eventStartDate: options.eventStart!,
        ...(options.eventEnd ? { eventEndDate: options.eventEnd } : {}),
      },
      partitions: visibleList,
    }),
  },
];
export class TourListPlans implements ListPlanResolver {
  private readonly strategies: Map<string, ListStrategy>;

  /**
   * TourListPlans 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: strategies: 모드별 목록 조회 전략 배열
   * @returns new로 생성한 TourListPlans 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourListPlans(strategies)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourListPlans(strategies);
   *
   * 같은 mode 전략을 중복 등록하면 예외를 던진다.
   */
  constructor(strategies: readonly ListStrategy[]) {
    this.strategies = new Map();
    for (const strategy of strategies) {
      if (this.strategies.has(strategy.mode))
        throw new Error('Duplicate list strategy');
      this.strategies.set(strategy.mode, strategy);
    }
  }

  /**
   * 수집 모드에 등록된 목록 조회 전략을 선택한다.
   *
   * 입력: options: mode 및 조회 조건.
   * @returns endpoint, params, partitions가 있는 조회 계획.
   * @example
   * plans.resolve({ ...options, mode: "sync", modifiedSince: "20261024" }); // showflag=1/0 분리
   *
   * 등록하지 않은 mode는 Error. 새 목록 모드는 전략을 추가해 연결한다.
   */
  resolve(options: IngestionOptions): ListPlan {
    const strategy = this.strategies.get(options.mode);
    if (!strategy) throw new Error('Unsupported list strategy');
    return strategy.create(options);
  }
}

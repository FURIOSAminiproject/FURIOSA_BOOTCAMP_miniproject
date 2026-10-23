import type { IngestionOptions } from './tour-ingestion.options';
import type { ListPlan, ListPlanResolver } from './tour-ingestion.ports';
import type { TourParams } from './tour-types';

export interface ListStrategy { readonly mode: string; create(options: IngestionOptions): ListPlan }
function filters(options: IngestionOptions): TourParams {
  const params: TourParams = { arrange: 'C' };
  if (options.region) params.lDongRegnCd = options.region;
  if (options.district) params.lDongSignguCd = options.district;
  if (options.contentType) params.contentTypeId = options.contentType;
  return params;
}
const visibleList = [{ key: 'list', params: {} }];
export const DEFAULT_LIST_STRATEGIES: readonly ListStrategy[] = [
  { mode: 'initial', create: options => ({ endpoint: 'areaBasedList2', params: filters(options), partitions: visibleList }) },
  { mode: 'sync', create: options => ({ endpoint: 'areaBasedSyncList2',
    params: { ...filters(options), modifiedtime: options.modifiedSince! },
    partitions: ['1', '0'].map(showflag => ({ key: `showflag=${showflag}`, params: { showflag } })),
  }) },
  { mode: 'festivals', create: options => ({ endpoint: 'searchFestival2', params: {
    ...filters(options), eventStartDate: options.eventStart!, ...(options.eventEnd ? { eventEndDate: options.eventEnd } : {}),
  }, partitions: visibleList }) },
];
export class TourListPlans implements ListPlanResolver {
  private readonly strategies: Map<string, ListStrategy>;
  constructor(strategies: readonly ListStrategy[]) {
    this.strategies = new Map();
    for (const strategy of strategies) {
      if (this.strategies.has(strategy.mode)) throw new Error('Duplicate list strategy');
      this.strategies.set(strategy.mode, strategy);
    }
  }
  resolve(options: IngestionOptions): ListPlan {
    const strategy = this.strategies.get(options.mode);
    if (!strategy) throw new Error('Unsupported list strategy');
    return strategy.create(options);
  }
}

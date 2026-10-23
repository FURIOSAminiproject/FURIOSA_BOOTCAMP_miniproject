import type { DetailLoader, DetailReader } from './tour-ingestion.ports';
import { TourApiError } from './tour-errors';
import { text } from './tour-mapping';
import type { Snapshots, TourItem, TourParams } from './tour-types';

export class TourDetailService implements DetailLoader {
  constructor(private readonly api: DetailReader) {}

  async load(contentId: string): Promise<{ item: TourItem; snapshots: Snapshots }> {
    const common = await this.api.page('detailCommon2', { contentId, pageNo: 1, numOfRows: 10 });
    const item = common.items[0];
    if (!item || text(item.contentid) !== contentId) throw new TourApiError('DETAIL_ID_MISMATCH', 'detailCommon2');
    const snapshots: Snapshots = { detailCommon2: {
      fetched_at: new Date().toISOString(), items: common.items, source_url: common.sourceUrl,
    } };
    for (const endpoint of ['detailIntro2', 'detailInfo2', 'detailImage2'] as const) {
      const params: TourParams = { contentId };
      if (endpoint !== 'detailImage2') params.contentTypeId = String(item.contenttypeid);
      else params.imageYN = 'Y';
      const { items, sourceUrls } = await this.api.allWithSources(endpoint, params);
      if (items.some(row => row.contentid !== undefined && text(row.contentid) !== contentId)) throw new TourApiError('DETAIL_ID_MISMATCH', endpoint);
      snapshots[endpoint] = { fetched_at: new Date().toISOString(), items, source_url: sourceUrls.at(-1), source_urls: sourceUrls };
    }
    // A failed call never returns a partial bundle. This component never writes to the DB.
    return { item, snapshots };
  }
}

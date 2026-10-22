import { TourApiError, TourStoreError, MappingError } from './tour-errors';
import { CONTENT_TYPES, text } from './tour-mapping';
import type { IngestionDependencies } from './tour-ingestion.ports';
import type { TourItem } from './tour-types';
import type { IngestionOptions } from './tour-ingestion.options';

export interface IngestionReport {
  startedAt: string; finishedAt?: string; status: 'running' | 'completed' | 'failed';
  fetched: number; inserted: number; updated: number; unchanged: number; enriched: number; skipped: number; ignored: number;
  apiRequests: number; categoryCount: number; nextPages: Record<string, number | null>;
  issues: { contentId: string | null; code: string }[]; error?: string;
}
export class IngestionRunError extends Error {
  constructor(readonly report: IngestionReport) { super(report.error ?? 'Ingestion failed'); }
}
export class TourIngestionService {
  constructor(private readonly dependencies: IngestionDependencies) {}

  async run(options: IngestionOptions): Promise<IngestionReport> {
    const { api, gate, references, details, places, plans } = this.dependencies;
    const report: IngestionReport = { startedAt: new Date().toISOString(), status: 'running', fetched: 0,
      inserted: 0, updated: 0, unchanged: 0, enriched: 0, skipped: 0, ignored: 0, apiRequests: 0, categoryCount: 0, nextPages: {}, issues: [] };
    try {
      await gate.withLock(async () => {
        await gate.assertSchema();
        const context = await references.load();
        const { refs } = context;
        report.categoryCount = context.categoryCount;
        const enrich = async (base: TourItem) => {
          const { item, snapshots } = await details.load(text(base.contentid)!);
          await context.ensureDistrict(item);
          await places.save(item, snapshots, refs);
          report.enriched++;
        };
        if (options.mode === 'reference') return;
        if (options.mode === 'detail') {
          await enrich({ contentid: options.contentId });
          return;
        }
        const { endpoint, params, partitions } = plans.resolve(options);
        for (const { key, params: partition } of partitions) {
          report.nextPages[key] = options.startPage;
          for (let pageNo = options.startPage; pageNo < options.startPage + options.maxPages; pageNo++) {
            const page = await api.page(endpoint, { ...params, ...partition, pageNo, numOfRows: options.pageSize });
            if (!page.items.length && (pageNo - 1) * options.pageSize < page.totalCount) throw new TourApiError('INCOMPLETE_PAGE', endpoint);
            for (const item of page.items) {
              report.fetched++;
              if (/^\d+$/.test(String(item.contenttypeid)) && !CONTENT_TYPES.includes(Number(item.contenttypeid))) {
                report.ignored++;
                continue;
              }
              try {
                await context.ensureDistrict(item);
                const saved = await places.save(item, { [endpoint]: { fetched_at: new Date().toISOString(), items: [item], source_url: page.sourceUrl } }, refs);
                report[saved.status]++;
                if (!options.listOnly && String(item.showflag) !== '0') await enrich(item);
              } catch (error) {
                if (!(error instanceof MappingError)) throw error;
                report.skipped++;
                if (report.issues.length < 20) report.issues.push({ contentId: text(item.contentid), code: 'INVALID_PLACE' });
              }
            }
            const more = pageNo * options.pageSize < page.totalCount;
            report.nextPages[key] = more ? pageNo + 1 : null;
            if (!more) break;
          }
        }
      });
      report.status = 'completed';
    } catch (error) {
      report.status = 'failed';
      report.error = error instanceof TourApiError || error instanceof TourStoreError ? error.message
        : error instanceof MappingError ? 'TourAPI reference mapping failed' : 'Tour ingestion failed';
    }
    report.apiRequests = api.requests;
    report.finishedAt = new Date().toISOString();
    if (report.status === 'failed') throw new IngestionRunError(report);
    return report;
  }
}

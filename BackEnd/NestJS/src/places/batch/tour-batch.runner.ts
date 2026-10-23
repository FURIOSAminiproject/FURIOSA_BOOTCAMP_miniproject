import { IngestionRunError, type IngestionReport } from '../tour-ingestion.service';
import type { IngestionOptions } from '../tour-ingestion.options';
import { TourApiError, TourStoreError } from '../tour-errors';
import { seoulDate, shiftDate, type TourBatchConfig } from './tour-batch.config';
import { TourBatchStateError, type TourBatchStateStore } from './tour-batch.state';

export interface TourBatchIngestor { run(options: IngestionOptions): Promise<IngestionReport> }
export interface TourBatchLog { log(message: string): void; warn(message: string): void; error(message: string): void }
export interface TourBatchResult { status: 'completed' | 'failed' | 'skipped'; reason?: string; report?: IngestionReport }
export interface TourBatchTask { run(): Promise<TourBatchResult> }
export class TourBatchRunner implements TourBatchTask {
  private running = false;
  constructor(private readonly config: TourBatchConfig, private readonly state: TourBatchStateStore,
    private readonly createRun: () => TourBatchIngestor, private readonly logger: TourBatchLog,
    private readonly now: () => Date = () => new Date()) {}

  async run(): Promise<TourBatchResult> {
    if (this.running) {
      const reason = 'LOCAL_RUN_IN_PROGRESS';
      this.logger.warn(JSON.stringify({ event:'tour_batch_skipped', reason }));
      return { status:'skipped', reason };
    }
    this.running = true;
    let report: IngestionReport | undefined;
    try {
      const date = seoulDate(this.now());
      const previous = await this.state.read();
      let modifiedSince = shiftDate(date,-this.config.lookbackDays);
      if (previous?.scope === this.config.scope) {
        if (previous.lastSuccessfulDate > date) throw new TourBatchStateError('CHECKPOINT_IN_FUTURE');
        // Retain a day of overlap; a failed run never moves the previous successful boundary.
        const prior = shiftDate(previous.lastSuccessfulDate,-1);
        if (prior < modifiedSince) modifiedSince = prior;
      }
      this.logger.log(JSON.stringify({ event:'tour_batch_started', date, modifiedSince, scope:this.config.scope }));
      report = await this.createRun().run({ ...this.config.options, modifiedSince });
      if (report.status !== 'completed' || report.skipped > 0 || Object.values(report.nextPages).some(page => page !== null)) {
        throw new TourBatchStateError('INCOMPLETE_COLLECTION');
      }
      await this.state.write({ version:1, scope:this.config.scope, lastSuccessfulDate:date });
      this.logger.log(JSON.stringify({ event:'tour_batch_completed', date, report }));
      return { status:'completed', report };
    } catch (error) {
      if (error instanceof IngestionRunError) report = error.report;
      const locked = error instanceof IngestionRunError && report?.error === new TourStoreError('INGESTION_ALREADY_RUNNING').message;
      const reason = locked ? 'INGESTION_ALREADY_RUNNING'
        : error instanceof TourBatchStateError || error instanceof TourApiError ? error.code : 'COLLECTION_FAILED';
      const status = locked ? 'skipped' : 'failed';
      this.logger[locked ? 'warn' : 'error'](JSON.stringify({ event:`tour_batch_${status}`, reason, report }));
      return { status, reason, report };
    } finally { this.running = false; }
  }

  async runManual(options?: Partial<IngestionOptions>): Promise<TourBatchResult> {
    if (this.running) {
      const reason = 'LOCAL_RUN_IN_PROGRESS';
      this.logger.warn(JSON.stringify({ event: 'tour_manual_skipped', reason }));
      return { status: 'skipped', reason };
    }
    this.running = true;
    let report: IngestionReport | undefined;
    try {
      const numberOr = (val: unknown, fallback: number) => {
        if (typeof val === 'number' && Number.isFinite(val)) return val;
        if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val);
        return fallback;
      };
      const boolOr = (val: unknown, fallback: boolean) => {
        if (typeof val === 'boolean') return val;
        if (val === 'true') return true;
        if (val === 'false') return false;
        return fallback;
      };
      const mode = (options?.mode ?? 'initial') as IngestionOptions['mode'];
      const targetOptions: IngestionOptions = {
        mode,
        pageSize: Math.min(100, Math.max(1, numberOr(options?.pageSize, 100))),
        startPage: Math.max(1, numberOr(options?.startPage, 1)),
        maxPages: Math.min(1000, Math.max(1, numberOr(options?.maxPages, 10))),
        listOnly: boolOr(options?.listOnly, true),
        region: options?.region ? String(options.region).trim() : undefined,
        district: options?.district ? String(options.district).trim() : undefined,
        contentType: options?.contentType ? Number(options.contentType) : undefined,
        contentId: options?.contentId ? String(options.contentId).trim() : undefined,
        modifiedSince: options?.modifiedSince ? String(options.modifiedSince).trim() : undefined,
        eventStart: options?.eventStart ? String(options.eventStart).trim() : undefined,
        eventEnd: options?.eventEnd ? String(options.eventEnd).trim() : undefined,
      };
      this.logger.log(JSON.stringify({ event: 'tour_manual_started', options: targetOptions }));
      report = await this.createRun().run(targetOptions);
      if (report.status !== 'completed') {
        throw new TourBatchStateError('INCOMPLETE_COLLECTION');
      }
      this.logger.log(JSON.stringify({ event: 'tour_manual_completed', report }));
      return { status: 'completed', report };
    } catch (error) {
      if (error instanceof IngestionRunError) report = error.report;
      const locked = error instanceof IngestionRunError && report?.error === new TourStoreError('INGESTION_ALREADY_RUNNING').message;
      const reason = locked ? 'INGESTION_ALREADY_RUNNING'
        : error instanceof TourBatchStateError || error instanceof TourApiError ? error.code : 'COLLECTION_FAILED';
      const status = locked ? 'skipped' : 'failed';
      this.logger[locked ? 'warn' : 'error'](JSON.stringify({ event: `tour_manual_${status}`, reason, report }));
      return { status, reason, report };
    } finally { this.running = false; }
  }
}

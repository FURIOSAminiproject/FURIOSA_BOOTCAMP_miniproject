import { record, type TourCollection, type TourEndpoint, type TourItem, type TourPage } from './tour-types';
import type { DetailReader, ReferenceReader, RequestMetrics } from './tour-ingestion.ports';
import { TourApiError } from './tour-errors';
import { sourceUrl } from './tour-provenance';
export { TourApiError } from './tour-errors';
export { sourceUrl } from './tour-provenance';
export type { TourEndpoint, TourItem, TourPage } from './tour-types';

export interface TourConfig { key: string; mobileApp: string; timeoutMs: number; intervalMs: number; maxRequests: number }
function integer(value: unknown, min: number): number | undefined {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '') return;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min ? n : undefined;
}
export function tourConfig(env: NodeJS.ProcessEnv): TourConfig {
  let raw = env.TOUR_API_KEY ?? env.TOUR_API_key ?? env.TOUR_KEY ?? env.tour_api_key;
  let key = raw?.trim();
  if (key?.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1).trim();
  if (key?.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1).trim();
  if (!key) throw new TourApiError('MISSING_KEY');
  try { key = decodeURIComponent(key); } catch { throw new TourApiError('INVALID_KEY_ENCODING'); }
  const number = (name: string, fallback: number, min: number, max: number) => {
    const n = env[name] === undefined ? fallback : integer(env[name], min);
    if (n === undefined || n > max) throw new TourApiError(`INVALID_${name}`);
    return n;
  };
  return { key, mobileApp: env.TOUR_API_MOBILE_APP?.trim() || 'FuriosaTravel',
    timeoutMs: number('TOUR_API_TIMEOUT_MS', 15000, 100, 60000),
    intervalMs: number('TOUR_API_INTERVAL_MS', 250, 0, 60000),
    maxRequests: number('TOUR_API_MAX_REQUESTS', 200, 1, 10000) };
}
export class TourApiClient implements DetailReader, ReferenceReader, RequestMetrics {
  requests = 0;
  private previousRequest = 0;
  constructor(private readonly config: TourConfig, private readonly transport: typeof fetch = fetch,
    private readonly sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {}

  async page(endpoint: TourEndpoint, params: Record<string, string | number> = {}): Promise<TourPage> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (this.requests >= this.config.maxRequests) throw new TourApiError('REQUEST_BUDGET_EXCEEDED', endpoint);
      const wait = this.config.intervalMs - (Date.now() - this.previousRequest);
      if (wait > 0) await this.sleep(wait);
      const url = new URL(`https://apis.data.go.kr/B551011/KorService2/${endpoint}`);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
      url.searchParams.set('serviceKey', this.config.key);
      url.searchParams.set('MobileOS', 'ETC');
      url.searchParams.set('MobileApp', this.config.mobileApp);
      url.searchParams.set('_type', 'json');
      this.requests++;
      this.previousRequest = Date.now();
      let response: Response;
      try {
        response = await this.transport(url, { signal: AbortSignal.timeout(this.config.timeoutMs), redirect: 'error',
          headers: { Accept: 'application/json' } });
      } catch { throw new TourApiError('NETWORK_OR_TIMEOUT', endpoint); }
      if (response.status >= 500 && attempt === 0) { await response.body?.cancel(); await this.sleep(1000); continue; }
      if (!response.ok) { await response.body?.cancel(); throw new TourApiError(`HTTP_${response.status}`, endpoint); }
      let data: unknown;
      try { data = await response.json(); } catch { throw new TourApiError('INVALID_JSON', endpoint); }
      if (!record(data) || !record(data.response) || !record(data.response.header)) throw new TourApiError('INVALID_ENVELOPE', endpoint);
      const code = data.response.header.resultCode;
      if (String(code).padStart(4, '0') !== '0000') {
        const safeCode = /^[a-zA-Z0-9_]{1,30}$/.test(String(code)) ? String(code) : 'UNKNOWN';
        throw new TourApiError(`PROVIDER_${safeCode}`, endpoint);
      }
      const body = data.response.body;
      if (!record(body)) throw new TourApiError('INVALID_BODY', endpoint);
      const totalCount = integer(body.totalCount, 0);
      const pageNo = integer(body.pageNo, 1);
      if (totalCount === undefined || pageNo === undefined) throw new TourApiError('INVALID_PAGINATION', endpoint);
      if (params.pageNo !== undefined && pageNo !== Number(params.pageNo)) throw new TourApiError('PAGE_MISMATCH', endpoint);
      const item = record(body.items) ? body.items.item : undefined;
      const items = item === undefined || item === null || item === '' ? [] : Array.isArray(item) ? item : [item];
      if (!items.every(record) || (items.length > 0 && totalCount === 0)) throw new TourApiError('INVALID_ITEMS', endpoint);
      return { items, totalCount, pageNo, sourceUrl: sourceUrl(url.href) };
    }
    throw new TourApiError('RETRY_EXHAUSTED', endpoint);
  }

  async all(endpoint: TourEndpoint, params: Record<string, string | number> = {}): Promise<TourItem[]> {
    return (await this.allWithSources(endpoint, params)).items;
  }

  async allWithSources(endpoint: TourEndpoint, params: Record<string, string | number> = {}): Promise<TourCollection> {
    const items: TourItem[] = [];
    const sourceUrls: string[] = [];
    for (let pageNo = 1; pageNo <= 100; pageNo++) {
      const page = await this.page(endpoint, { ...params, pageNo, numOfRows: 100 });
      if (page.items.length === 0 && items.length < page.totalCount) throw new TourApiError('INCOMPLETE_PAGE', endpoint);
      items.push(...page.items);
      sourceUrls.push(page.sourceUrl);
      if (items.length >= page.totalCount) return { items, sourceUrls };
    }
    throw new TourApiError('REFERENCE_PAGE_LIMIT', endpoint);
  }
}

import { CONTENT_TYPES, dateValue } from './tour-mapping';
export interface IngestionOptions {
  mode: 'initial' | 'sync' | 'festivals' | 'detail' | 'reference';
  region?: string; district?: string; contentType?: number; contentId?: string;
  modifiedSince?: string; eventStart?: string; eventEnd?: string;
  pageSize: number; startPage: number; maxPages: number; listOnly: boolean;
}
export function parseIngestionOptions(args: string[]): IngestionOptions {
  const allowed = ['mode', 'region', 'district', 'content-type', 'content-id', 'modified-since', 'event-start', 'event-end', 'page-size', 'start-page', 'max-pages'];
  const values = new Map<string, string>();
  let listOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list-only') { listOnly = true; continue; }
    const key = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || !allowed.includes(key) || values.has(key) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Invalid ingestion arguments');
    values.set(key, args[++i]);
  }
  const number = (key: string, fallback: number, max: number) => {
    const s = values.get(key), n = s === undefined ? fallback : /^\d+$/.test(s) ? Number(s) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > max) throw new Error(`Invalid --${key}`);
    return n;
  };
  const mode = values.get('mode') ?? 'initial';
  if (!['initial', 'sync', 'festivals', 'detail', 'reference'].includes(mode)) throw new Error('Invalid --mode');
  const region = values.get('region'), district = values.get('district'), contentId = values.get('content-id');
  if (region && !/^\d{2}$/.test(region)) throw new Error('Invalid --region');
  if (district && (!region || !/^\d{3}$/.test(district))) throw new Error('--district requires --region and a 3-digit code');
  const contentType = values.has('content-type') ? number('content-type', 12, 39) : undefined;
  if (contentType && !CONTENT_TYPES.includes(contentType)) throw new Error('Unsupported --content-type');
  if (contentId && !/^\d{1,30}$/.test(contentId)) throw new Error('Invalid --content-id');
  const modifiedSince = values.get('modified-since'), eventStart = values.get('event-start'), eventEnd = values.get('event-end');
  for (const s of [modifiedSince, eventStart, eventEnd]) if (s !== undefined && !dateValue(s)) throw new Error('Dates must be valid YYYYMMDD');
  if (mode === 'sync' && !modifiedSince) throw new Error('sync requires --modified-since');
  if (mode === 'detail' && !contentId) throw new Error('detail requires --content-id');
  if (mode === 'festivals' && (!eventStart || (contentType !== undefined && contentType !== 15))) throw new Error('festivals requires --event-start and type 15');
  if (eventEnd && (!eventStart || eventEnd < eventStart)) throw new Error('Invalid event period');
  if (contentId && mode !== 'detail') throw new Error('--content-id is only supported in detail mode');
  if (modifiedSince && mode !== 'sync') throw new Error('--modified-since is only supported in sync mode');
  if ((eventStart || eventEnd) && mode !== 'festivals') throw new Error('Event dates are only supported in festivals mode');
  return { mode: mode as IngestionOptions['mode'], region, district, contentType, contentId, modifiedSince, eventStart, eventEnd,
    pageSize: number('page-size', 20, 100), startPage: number('start-page', 1, 1000000), maxPages: number('max-pages', 1, 10000), listOnly };
}

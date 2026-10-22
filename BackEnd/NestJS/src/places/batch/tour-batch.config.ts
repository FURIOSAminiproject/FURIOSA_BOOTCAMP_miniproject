import { resolve } from 'node:path';
import { parseIngestionOptions, type IngestionOptions } from '../tour-ingestion.options';
import { dateValue } from '../tour-mapping';

export const TOUR_BATCH_CRON = '0 0 1 * * *';
export const TOUR_BATCH_TIME_ZONE = 'Asia/Seoul';
export interface TourBatchConfig {
  statePath: string;
  lookbackDays: number;
  options: Omit<IngestionOptions, 'modifiedSince'>;
  scope: string;
}
export function tourBatchConfig(env: NodeJS.ProcessEnv): TourBatchConfig {
  const integer = (key: string, fallback: number, max: number) => {
    const value = env[key] ?? String(fallback);
    if (!/^\d+$/.test(value) || +value < 1 || +value > max) throw new Error(`Invalid ${key}`);
    return +value;
  };
  const args = ['--mode','sync','--modified-since','20000101','--page-size',String(integer('TOUR_BATCH_PAGE_SIZE',100,100)),
    '--max-pages',String(integer('TOUR_BATCH_MAX_PAGES',10000,10000))];
  for (const [key, option] of [['TOUR_BATCH_REGION','--region'],['TOUR_BATCH_DISTRICT','--district'],['TOUR_BATCH_CONTENT_TYPE','--content-type']]) {
    if (env[key]?.trim()) args.push(option, env[key]!.trim());
  }
  const { modifiedSince: _ignored, ...options } = parseIngestionOptions(args);
  const scope = JSON.stringify({ region: options.region ?? null, district: options.district ?? null, contentType: options.contentType ?? null });
  return { options, scope, lookbackDays: integer('TOUR_BATCH_LOOKBACK_DAYS',2,3650),
    statePath: resolve(env.TOUR_BATCH_STATE_PATH?.trim() || 'data/tour-batch/state.json') };
}
export function seoulDate(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0,10).replaceAll('-','');
}
export function shiftDate(date: string, days: number): string {
  const iso = dateValue(date);
  if (!iso) throw new Error('Invalid batch checkpoint date');
  return new Date(new Date(iso).getTime() + days * 86400000).toISOString().slice(0,10).replaceAll('-','');
}

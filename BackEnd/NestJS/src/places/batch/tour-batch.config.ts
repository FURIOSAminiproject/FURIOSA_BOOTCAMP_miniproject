/**
 * 매일 01:00 한국 시간 수집 설정. 환경변수를 읽지만 이 파일 자체는 수집을 실행하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { resolve } from 'node:path';
import {
  parseIngestionOptions,
  type IngestionOptions,
} from '../tour-ingestion.options';
import { dateValue } from '../tour-mapping';

export const TOUR_BATCH_CRON = '0 0 1 * * *';
export const TOUR_BATCH_TIME_ZONE = 'Asia/Seoul';
export interface TourBatchConfig {
  /** 마지막 성공 날짜를 기록할 로컬 파일의 절대 경로. */
  statePath: string;
  /** 처음 실행하거나 필요한 경우 기본적으로 며칠 전부터 다시 조회할지. 기본 2일. */
  lookbackDays: number;
  /** 일일 sync 수집 기본 조건. modifiedSince는 실행 시 계산한다. */
  options: Omit<IngestionOptions, 'modifiedSince'>;
  /** 지역/시군구/관광 타입 조건을 JSON으로 표현한 수집 범위 식별자. */
  scope: string;
}

/**
 * 환경변수에서 매일 실행할 장소 수집 설정을 만든다.
 *
 * 입력: env: TOUR_BATCH_* 환경변수. 생략된 값에는 기본값을 사용한다.
 * @returns 수집 옵션, 재조회 일수, 상태 파일 경로, 수집 범위 식별 문자열.
 * @example
 * tourBatchConfig({}).lookbackDays; // 2
 *
 * 여기서는 API를 호출하지 않는다. 잘못된 숫자나 수집 조건은 예외로 알린다.
 */
export function tourBatchConfig(env: NodeJS.ProcessEnv): TourBatchConfig {
  /**
   * 배치 환경변수 하나를 1 이상인 정수로 읽는다.
   *
   * 입력: key: 환경변수 이름, fallback: 미설정 시 기본값, max: 허용 최댓값. 바깥의 env를 읽는다.
   * @returns 검증된 숫자. 숫자가 아니거나 범위를 벗어나면 예외.
   * @example
   * integer("TOUR_BATCH_PAGE_SIZE", 100, 100); // 미설정이면 100
   */
  const integer = (key: string, fallback: number, max: number) => {
    const value = env[key] ?? String(fallback);
    if (!/^\d+$/.test(value) || +value < 1 || +value > max)
      throw new Error(`Invalid ${key}`);
    return +value;
  };
  const args = [
    '--mode',
    'sync',
    '--modified-since',
    '20000101',
    '--page-size',
    String(integer('TOUR_BATCH_PAGE_SIZE', 100, 100)),
    '--max-pages',
    String(integer('TOUR_BATCH_MAX_PAGES', 10000, 10000)),
  ];
  for (const [key, option] of [
    ['TOUR_BATCH_REGION', '--region'],
    ['TOUR_BATCH_DISTRICT', '--district'],
    ['TOUR_BATCH_CONTENT_TYPE', '--content-type'],
  ]) {
    if (env[key]?.trim()) args.push(option, env[key]!.trim());
  }
  const { modifiedSince: _ignored, ...options } = parseIngestionOptions(args);
  const scope = JSON.stringify({
    region: options.region ?? null,
    district: options.district ?? null,
    contentType: options.contentType ?? null,
  });
  return {
    options,
    scope,
    lookbackDays: integer('TOUR_BATCH_LOOKBACK_DAYS', 2, 3650),
    statePath: resolve(
      env.TOUR_BATCH_STATE_PATH?.trim() || 'data/tour-batch/state.json',
    ),
  };
}

/**
 * 같은 시각을 한국 날짜 YYYYMMDD로 표현한다.
 *
 * 입력: date: 변환할 Date. 서버 운영체제 시간대와 무관하게 +09:00을 적용한다.
 * @returns 8자리 한국 날짜 문자열.
 * @example
 * seoulDate(new Date("2026-10-25T16:00:00Z")); // "20261026"
 */
export function seoulDate(date: Date): string {
  return new Date(date.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
}

/**
 * YYYYMMDD 날짜를 지정한 일수만큼 앞뒤로 옮긴다.
 *
 * 입력: date: 유효한 8자리 날짜, days: 이동 일수. 음수는 과거, 양수는 미래.
 * @returns 이동한 날짜 문자열. date가 잘못되면 예외.
 * @example
 * shiftDate("20261026", -2); // "20261024"
 */
export function shiftDate(date: string, days: number): string {
  const iso = dateValue(date);
  if (!iso) throw new Error('Invalid batch checkpoint date');
  return new Date(new Date(iso).getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10)
    .replaceAll('-', '');
}

/**
 * HTTP 수동 수집 옵션 보정 담당. 기존 문자열 변환과 기본값을 유지한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import {
  assertIngestionOptions,
  type IngestionOptions,
} from '../tour-ingestion.options';
import { TourOptionsError } from '../tour-errors';
import { record } from '../tour-types';

/** 입력: 선택적 HTTP 수집 옵션 → 출력: 보정한 IngestionOptions. 실제 호출은 manualIngestionOptions 참고. */
export type ManualOptionsParser = (
  options?: Partial<IngestionOptions>,
) => IngestionOptions;

// 기존 HTTP 기본값·형변환을 CLI 검증과 배치 실행에서 분리해 유지한다.

/**
 * HTTP 수집 옵션을 기존 규칙대로 보정한다.
 *
 * 입력: options: 선택적 옵션 객체. 런타임에는 쿼리 문자열도 들어올 수 있다.
 * @returns 기본 initial, pageSize=100, startPage=1, maxPages=10, listOnly=true인 수집 옵션.
 * @example
 * manualIngestionOptions({ maxPages: 1 }).listOnly; // true
 *
 * 기존 HTTP 기본값과 정상 입력의 형변환·상하한 보정은 유지한다. 잘못된 조건은 API 생성 전에 거절한다.
 */
export const manualIngestionOptions: ManualOptionsParser = (options) => {
  if (options !== undefined && !record(options)) throw new TourOptionsError();
  const allowed = [
    'mode',
    'region',
    'district',
    'contentType',
    'contentId',
    'modifiedSince',
    'eventStart',
    'eventEnd',
    'pageSize',
    'startPage',
    'maxPages',
    'listOnly',
  ];
  for (const key of Object.keys(options ?? {})) {
    if (!allowed.includes(key)) throw new TourOptionsError();
  }
  // 필터 값이 false/0/null이라고 사라지면 전체 지역·전체 타입 수집으로 넓어질 수 있다.
  if (options?.mode !== undefined && typeof options.mode !== 'string') {
    throw new TourOptionsError();
  }
  for (const key of [
    'region',
    'district',
    'contentId',
    'modifiedSince',
    'eventStart',
    'eventEnd',
  ] as const) {
    const value = options?.[key];
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
      throw new TourOptionsError();
    }
  }
  /**
   * HTTP 정수 또는 숫자 문자열을 읽고, 미입력인 경우에만 기본값을 사용한다.
   *
   * 입력: val: 원본 값, fallback: 값이 생략되었을 때 쓸 숫자.
   * @returns 안전한 정수. 숫자 문자열은 변환하고 소수·무한대·잘못된 형식은 TourOptionsError.
   * @example
   * numberOr("20", 10); // 20
   * numberOr(undefined, 10); // 10
   * numberOr("1.5", 10); // TourOptionsError
   *
   * 여기서 정수 여부를 확인하고, 호출한 쪽이 기존 상·하한 보정을 적용한다.
   */
  const numberOr = (val: unknown, fallback: number) => {
    if (val === undefined) return fallback;
    const value =
      typeof val === 'number'
        ? val
        : typeof val === 'string' && /^\d+$/.test(val)
          ? Number(val)
          : NaN;
    if (!Number.isSafeInteger(value)) throw new TourOptionsError();
    return value;
  };

  /**
   * HTTP 불리언을 true/false 값으로 바꾼다.
   *
   * 입력: val: boolean 또는 문자열, fallback: 값이 생략되었을 때 쓸 값.
   * @returns boolean 값. 문자열은 정확히 "true", "false"일 때만 변환한다.
   * @example
   * boolOr("false", true); // false
   * boolOr("0", true); // TourOptionsError
   */
  const boolOr = (val: unknown, fallback: boolean) => {
    if (val === undefined) return fallback;
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    throw new TourOptionsError();
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
    contentType:
      options?.contentType !== undefined
        ? numberOr(options.contentType, 12)
        : undefined,
    contentId: options?.contentId
      ? String(options.contentId).trim()
      : undefined,
    modifiedSince: options?.modifiedSince
      ? String(options.modifiedSince).trim()
      : undefined,
    eventStart: options?.eventStart
      ? String(options.eventStart).trim()
      : undefined,
    eventEnd: options?.eventEnd ? String(options.eventEnd).trim() : undefined,
  };

  try {
    assertIngestionOptions(targetOptions);
  } catch {
    throw new TourOptionsError();
  }
  return targetOptions;
};

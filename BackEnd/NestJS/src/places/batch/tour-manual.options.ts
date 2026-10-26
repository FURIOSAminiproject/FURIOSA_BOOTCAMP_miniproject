/**
 * HTTP 수동 수집 옵션 보정 담당. 기존 문자열 변환과 기본값을 유지한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { IngestionOptions } from '../tour-ingestion.options';

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
 * CLI처럼 모든 조합을 엄격히 검증하는 함수는 아니다. 기존 HTTP 형변환과 상·하한 규칙을 유지한다.
 */
export const manualIngestionOptions: ManualOptionsParser = (options) => {
  /**
   * HTTP 숫자 또는 숫자 문자열을 읽고 나머지는 기본값으로 처리한다.
   *
   * 입력: val: 원본 값, fallback: 읽을 수 없을 때 쓸 숫자.
   * @returns 유한한 number는 그대로, 숫자만 있는 문자열은 Number 변환, 나머지는 fallback.
   * @example
   * numberOr("20", 10); // 20
   * numberOr("잘못된 값", 10); // 10
   *
   * 여기서는 정수 여부나 범위를 전부 검사하지 않는다. 호출한 쪽이 상·하한을 적용한다.
   */
  const numberOr = (val: unknown, fallback: number) => {
    if (typeof val === 'number' && Number.isFinite(val)) return val;
    if (typeof val === 'string' && /^\d+$/.test(val)) return Number(val);
    return fallback;
  };

  /**
   * HTTP 불리언을 true/false 값으로 바꾼다.
   *
   * 입력: val: boolean 또는 문자열, fallback: 인식할 수 없을 때 쓸 값.
   * @returns boolean 값. 문자열은 정확히 "true", "false"일 때만 변환한다.
   * @example
   * boolOr("false", true); // false
   * boolOr("0", true); // true
   */
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

  return targetOptions;
};

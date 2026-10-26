/**
 * CLI 전용 엄격한 수집 옵션 검증. HTTP의 보정 규칙과 기본값은 tour-manual.options.ts에 따로 있다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { CONTENT_TYPES, dateValue } from './tour-mapping';
export interface IngestionOptions {
  /** initial=목록, sync=변경분, festivals=행사, detail=한 장소 상세, reference=기준정보. */
  mode: 'initial' | 'sync' | 'festivals' | 'detail' | 'reference';
  /** 법정동 시도 코드(2자리). 예: "26". */
  region?: string;
  /** 법정동 시군구 코드(3자리). region과 함께 사용한다. */
  district?: string;
  /** 관광 타입. 12 관광지/14 문화/15 행사/28 레포츠/32 숙박/38 쇼핑/39 음식점. */
  contentType?: number;
  /** TourAPI 외부 장소 ID. detail 모드에서 사용한다. */
  contentId?: string;
  /** 이 날짜부터 수정된 장소를 조회하는 기준 YYYYMMDD. sync 모드용. */
  modifiedSince?: string;
  /** 행사 검색 시작 날짜 YYYYMMDD. festivals 모드용. */
  eventStart?: string;
  /** 선택적 행사 검색 종료 날짜 YYYYMMDD. */
  eventEnd?: string;
  /** 목록 요청 한 페이지의 건수. CLI 기본 20, HTTP 기본 100. */
  pageSize: number;
  /** 수집을 시작할 페이지. 기본 1. */
  startPage: number;
  /** 각 조회 파티션에서 이번에 읽을 최대 페이지 수. */
  maxPages: number;
  /** true면 목록 기본 정보만 저장, false면 공개 장소의 상세도 추가 조회. */
  listOnly: boolean;
}

/**
 * 명령행 옵션을 엄격하게 검사해 수집 조건으로 바꾼다.
 *
 * 입력: args: --이름 값 형식의 배열. --list-only만 단독 플래그다.
 * @returns 검증된 IngestionOptions. 잘못된 이름·중복·날짜·조합은 Error.
 * @example
 * parseIngestionOptions(["--mode", "initial", "--max-pages", "2"]).maxPages; // 2
 *
 * 기본값은 pageSize=20, startPage=1, maxPages=1, listOnly=false. HTTP 기본값과 다르다.
 */
export function parseIngestionOptions(args: string[]): IngestionOptions {
  const allowed = [
    'mode',
    'region',
    'district',
    'content-type',
    'content-id',
    'modified-since',
    'event-start',
    'event-end',
    'page-size',
    'start-page',
    'max-pages',
  ];
  const values = new Map<string, string>();
  let listOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--list-only') {
      listOnly = true;
      continue;
    }
    const key = args[i].replace(/^--/, '');
    if (
      !args[i].startsWith('--') ||
      !allowed.includes(key) ||
      values.has(key) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error('Invalid ingestion arguments');
    values.set(key, args[++i]);
  }

  /**
   * 명령행 숫자 옵션을 1 이상 정수로 검사한다.
   *
   * 입력: key: --를 뺀 옵션명, fallback: 미입력 시 기본값, max: 상한. values Map에서 값을 읽는다.
   * @returns 유효한 정수. 소수·음수·상한 초과 값이면 Error.
   * @example
   * number("page-size", 20, 100); // 옵션이 없으면 20
   */
  const number = (key: string, fallback: number, max: number) => {
    const s = values.get(key),
      n = s === undefined ? fallback : /^\d+$/.test(s) ? Number(s) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > max)
      throw new Error(`Invalid --${key}`);
    return n;
  };
  const mode = values.get('mode') ?? 'initial';
  if (!['initial', 'sync', 'festivals', 'detail', 'reference'].includes(mode))
    throw new Error('Invalid --mode');
  const region = values.get('region'),
    district = values.get('district'),
    contentId = values.get('content-id');
  if (region && !/^\d{2}$/.test(region)) throw new Error('Invalid --region');
  if (district && (!region || !/^\d{3}$/.test(district)))
    throw new Error('--district requires --region and a 3-digit code');
  const contentType = values.has('content-type')
    ? number('content-type', 12, 39)
    : undefined;
  if (contentType && !CONTENT_TYPES.includes(contentType))
    throw new Error('Unsupported --content-type');
  if (contentId && !/^\d{1,30}$/.test(contentId))
    throw new Error('Invalid --content-id');
  const modifiedSince = values.get('modified-since'),
    eventStart = values.get('event-start'),
    eventEnd = values.get('event-end');
  for (const s of [modifiedSince, eventStart, eventEnd])
    if (s !== undefined && !dateValue(s))
      throw new Error('Dates must be valid YYYYMMDD');
  if (mode === 'sync' && !modifiedSince)
    throw new Error('sync requires --modified-since');
  if (mode === 'detail' && !contentId)
    throw new Error('detail requires --content-id');
  if (
    mode === 'festivals' &&
    (!eventStart || (contentType !== undefined && contentType !== 15))
  )
    throw new Error('festivals requires --event-start and type 15');
  if (eventEnd && (!eventStart || eventEnd < eventStart))
    throw new Error('Invalid event period');
  if (contentId && mode !== 'detail')
    throw new Error('--content-id is only supported in detail mode');
  if (modifiedSince && mode !== 'sync')
    throw new Error('--modified-since is only supported in sync mode');
  if ((eventStart || eventEnd) && mode !== 'festivals')
    throw new Error('Event dates are only supported in festivals mode');
  return {
    mode: mode as IngestionOptions['mode'],
    region,
    district,
    contentType,
    contentId,
    modifiedSince,
    eventStart,
    eventEnd,
    pageSize: number('page-size', 20, 100),
    startPage: number('start-page', 1, 1000000),
    maxPages: number('max-pages', 1, 10000),
    listOnly,
  };
}

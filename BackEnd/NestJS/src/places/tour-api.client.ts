/**
 * TourAPI HTTP 담당. 요청 간격·한도·페이지 응답 검증만 처리하고 DB에는 저장하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import {
  record,
  type TourCollection,
  type TourEndpoint,
  type TourItem,
  type TourPage,
} from './tour-types';
import type {
  DetailReader,
  ReferenceReader,
  RequestMetrics,
} from './tour-ingestion.ports';
import { TourApiError } from './tour-errors';
import { sourceUrl } from './tour-provenance';
import { assertCompletePage } from './tour-pagination';
export { TourApiError } from './tour-errors';
export { sourceUrl } from './tour-provenance';
export type { TourEndpoint, TourItem, TourPage } from './tour-types';

export interface TourConfig {
  /** 서버 환경변수에서 읽은 인증키. 출처 URL·응답·로그에는 저장하지 않는다. */
  key: string;
  /** TourAPI 요청의 MobileApp 이름. 기본 FuriosaTravel. */
  mobileApp: string;
  /** 한 HTTP 요청의 제한 시간(ms). 기본 15000. */
  timeoutMs: number;
  /** 연속 요청 사이의 최소 간격(ms). 기본 250. */
  intervalMs: number;
  /** 클라이언트 한 개가 보낼 수 있는 최대 HTTP 시도 수. 기본 200. */
  maxRequests: number;
}

/**
 * API 응답과 설정에서 최소값 이상의 안전한 정수를 읽는다.
 *
 * 입력: value: 문자열 또는 숫자, min: 허용 최솟값.
 * @returns 검증된 정수. 형식이나 범위가 맞지 않으면 undefined.
 * @example
 * integer("3", 1); // 3
 * integer("", 1); // undefined
 */
function integer(value: unknown, min: number): number | undefined {
  if ((typeof value !== 'string' && typeof value !== 'number') || value === '')
    return;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min ? n : undefined;
}

/**
 * TourAPI 인증키와 요청 제한 설정을 읽는다.
 *
 * 입력: env: TOUR_API_KEY 등의 환경변수. 키의 바깥 따옴표를 제거하고 URL 디코딩은 한 번만 한다.
 * @returns key, mobileApp, timeoutMs, intervalMs, maxRequests 설정.
 * @example
 * // 키가 설정된 환경에서 tourConfig(process.env).intervalMs → 기본 250(ms)
 *
 * 키가 없거나 설정값이 잘못되면 TourApiError. 반환값의 key는 로그에 출력하지 않는다.
 */
export function tourConfig(env: NodeJS.ProcessEnv): TourConfig {
  let raw =
    env.TOUR_API_KEY ?? env.TOUR_API_key ?? env.TOUR_KEY ?? env.tour_api_key;
  let key = raw?.trim();
  if (key?.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1).trim();
  if (key?.startsWith("'") && key.endsWith("'")) key = key.slice(1, -1).trim();
  if (!key) throw new TourApiError('MISSING_KEY');
  try {
    key = decodeURIComponent(key);
  } catch {
    throw new TourApiError('INVALID_KEY_ENCODING');
  }

  /**
   * TourAPI 숫자 환경변수를 읽고 범위를 검사한다.
   *
   * 입력: name: 환경변수명, fallback: 기본값, min/max: 허용 범위. 바깥의 env를 사용한다.
   * @returns 범위 내 정수. 잘못된 값은 해당 설정 이름을 담은 TourApiError.
   * @example
   * number("TOUR_API_TIMEOUT_MS", 15000, 100, 60000); // 미설정이면 15000
   */
  const number = (name: string, fallback: number, min: number, max: number) => {
    const n = env[name] === undefined ? fallback : integer(env[name], min);
    if (n === undefined || n > max) throw new TourApiError(`INVALID_${name}`);
    return n;
  };
  return {
    key,
    mobileApp: env.TOUR_API_MOBILE_APP?.trim() || 'FuriosaTravel',
    timeoutMs: number('TOUR_API_TIMEOUT_MS', 15000, 100, 60000),
    intervalMs: number('TOUR_API_INTERVAL_MS', 250, 0, 60000),
    maxRequests: number('TOUR_API_MAX_REQUESTS', 200, 1, 10000),
  };
}
export class TourApiClient
  implements DetailReader, ReferenceReader, RequestMetrics
{
  requests = 0;
  private previousRequest = 0;

  /**
   * TourApiClient 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: config: 요청 제한 또는 배치 실행 설정; transport: 교체 가능한 HTTP fetch 함수(기본 전역 fetch); sleep:
   * 밀리초 단위 대기 함수
   * @returns new로 생성한 TourApiClient 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourApiClient(config, transport, sleep)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourApiClient(config, transport, sleep);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly config: TourConfig,
    private readonly transport: typeof fetch = fetch,

    /**
     * API 호출 간격만큼 비동기로 기다린다.
     *
     * 입력: ms: 대기할 밀리초.
     * @returns 지정 시간이 지난 뒤 이행되는 Promise<void>.
     * @example
     * await sleep(250); // 약 0.25초 후 계속
     */
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise(
        /**
         * 타이머가 끝나면 대기 Promise를 완료한다.
         *
         * 입력: resolve: Promise 완료 함수. 바깥 ms만큼 기다린다.
         * @returns setTimeout의 타이머 핸들. Promise 소비자에게 반환되는 값은 아니다.
         * @example
         * // ms=250 → 타이머가 약 250ms 뒤 resolve() 호출
         */
        (resolve) => setTimeout(resolve, ms),
      ),
  ) {}

  /**
   * TourAPI 한 페이지를 호출하고 응답 구조를 검사한다.
   *
   * 입력: endpoint: 허용된 API 이름, params: 페이지·지역·장소 등의 쿼리. 공통 인증·앱 파라미터는 내부에서 추가한다.
   * @returns items, totalCount, pageNo, 인증키를 제거한 sourceUrl.
   * @example
   * await api.page("areaBasedList2", { lDongRegnCd: "26", pageNo: 1, numOfRows: 20 });
   *
   * 요청 예산·호출 간격을 지킨다. HTTP 5xx만 한 번 재시도하며 네트워크/형식 오류는 예외로 알린다.
   */
  async page(
    endpoint: TourEndpoint,
    params: Record<string, string | number> = {},
  ): Promise<TourPage> {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (this.requests >= this.config.maxRequests)
        throw new TourApiError('REQUEST_BUDGET_EXCEEDED', endpoint);
      const wait = this.config.intervalMs - (Date.now() - this.previousRequest);
      if (wait > 0) await this.sleep(wait);
      const url = new URL(
        `https://apis.data.go.kr/B551011/KorService2/${endpoint}`,
      );
      for (const [key, value] of Object.entries(params))
        url.searchParams.set(key, String(value));
      url.searchParams.set('serviceKey', this.config.key);
      url.searchParams.set('MobileOS', 'ETC');
      url.searchParams.set('MobileApp', this.config.mobileApp);
      url.searchParams.set('_type', 'json');
      this.requests++;
      this.previousRequest = Date.now();
      let response: Response;
      try {
        response = await this.transport(url, {
          signal: AbortSignal.timeout(this.config.timeoutMs),
          redirect: 'error',
          headers: { Accept: 'application/json' },
        });
      } catch {
        throw new TourApiError('NETWORK_OR_TIMEOUT', endpoint);
      }
      if (response.status >= 500 && attempt === 0) {
        await response.body?.cancel();
        await this.sleep(1000);
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new TourApiError(`HTTP_${response.status}`, endpoint);
      }
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new TourApiError('INVALID_JSON', endpoint);
      }
      if (
        !record(data) ||
        !record(data.response) ||
        !record(data.response.header)
      )
        throw new TourApiError('INVALID_ENVELOPE', endpoint);
      const code = data.response.header.resultCode;
      if (String(code).padStart(4, '0') !== '0000') {
        const safeCode = /^[a-zA-Z0-9_]{1,30}$/.test(String(code))
          ? String(code)
          : 'UNKNOWN';
        throw new TourApiError(`PROVIDER_${safeCode}`, endpoint);
      }
      const body = data.response.body;
      if (!record(body)) throw new TourApiError('INVALID_BODY', endpoint);
      const totalCount = integer(body.totalCount, 0);
      const pageNo = integer(body.pageNo, 1);
      if (totalCount === undefined || pageNo === undefined)
        throw new TourApiError('INVALID_PAGINATION', endpoint);
      if (params.pageNo !== undefined && pageNo !== Number(params.pageNo))
        throw new TourApiError('PAGE_MISMATCH', endpoint);
      const item = record(body.items) ? body.items.item : undefined;
      const items =
        item === undefined || item === null || item === ''
          ? []
          : Array.isArray(item)
            ? item
            : [item];
      if (!items.every(record) || (items.length > 0 && totalCount === 0))
        throw new TourApiError('INVALID_ITEMS', endpoint);
      if (params.numOfRows !== undefined) {
        assertCompletePage(
          { items, totalCount, pageNo },
          Number(params.numOfRows),
          endpoint,
        );
      }
      return { items, totalCount, pageNo, sourceUrl: sourceUrl(url.href) };
    }
    throw new TourApiError('RETRY_EXHAUSTED', endpoint);
  }

  /**
   * 해당 API의 모든 페이지에서 항목만 모은다.
   *
   * 입력: endpoint: API 이름, params: 조회 조건. 페이지 번호와 페이지 크기는 내부에서 정한다.
   * @returns 모든 TourItem의 배열. 데이터가 없으면 빈 배열.
   * @example
   * await api.all("ldongCode2", { lDongListYn: "N" }); // 지역 코드 목록
   *
   * 실제 HTTP 요청이 여러 번 발생할 수 있으며 최대 100페이지 제한이 있다.
   */
  async all(
    endpoint: TourEndpoint,
    params: Record<string, string | number> = {},
  ): Promise<TourItem[]> {
    return (await this.allWithSources(endpoint, params)).items;
  }

  /**
   * 여러 페이지의 항목과 페이지별 출처 URL을 함께 모은다.
   *
   * 입력: endpoint: API 이름, params: 조회 조건.
   * @returns {items, sourceUrls}. 모든 페이지를 수집하지 못하면 부분 결과 대신 예외.
   * @example
   * await api.allWithSources("detailImage2", { contentId: "126128", imageYN: "Y" });
   *
   * 페이지당 100건, 최대 100페이지. URL에서 인증키를 제거한다.
   */
  async allWithSources(
    endpoint: TourEndpoint,
    params: Record<string, string | number> = {},
  ): Promise<TourCollection> {
    const items: TourItem[] = [];
    const sourceUrls: string[] = [];
    for (let pageNo = 1; pageNo <= 100; pageNo++) {
      const page = await this.page(endpoint, {
        ...params,
        pageNo,
        numOfRows: 100,
      });
      if (page.items.length === 0 && items.length < page.totalCount)
        throw new TourApiError('INCOMPLETE_PAGE', endpoint);
      items.push(...page.items);
      sourceUrls.push(page.sourceUrl);
      if (items.length >= page.totalCount) return { items, sourceUrls };
    }
    throw new TourApiError('REFERENCE_PAGE_LIMIT', endpoint);
  }
}

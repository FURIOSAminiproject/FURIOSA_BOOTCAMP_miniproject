/**
 * 경로 캐시 흐름 담당. 유효 캐시 조회 → 없으면 ORS → 저장, 같은 프로세스의 동시 요청을 합친다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { createHash } from 'node:crypto';
import { RoutingError, safeDiagnostics } from './routing.errors';
import type { CacheLookup } from './routing.ports';
import type {
  CacheResult,
  CacheStore,
  DataProvider,
  ProviderName,
  RoutingLog,
} from './routing.types';

/**
 * 같은 요청을 같은 문자열로 표현하도록 객체 키를 정렬한다.
 *
 * 입력: value: JSON으로 표현 가능한 요청 데이터. undefined 같은 지원하지 않는 단독 값은 예외.
 * @returns 정렬된 객체 키와 원래 배열 순서를 가진 JSON 문자열.
 * @example
 * canonicalJson({ b: 2, a: 1 }); // "{\"a\":1,\"b\":2}"
 *
 * 출발지와 도착지 순서는 경로 의미가 있으므로 배열은 정렬하지 않는다.
 */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(
          /**
           * 해시용 객체 키를 일정한 순서로 정렬한다.
           *
           * 입력: [a],[b]: 비교할 속성 이름.
           * @returns 작으면 -1, 크면 1, 같으면 0.
           * @example
           * // "a","b" → -1
           */
          ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
        )
        .map(
          /**
           * 정렬한 속성을 JSON의 키:값 표현으로 만든다.
           *
           * 입력: [key,item]: 키와 아직 정리하지 않은 값.
           * @returns JSON 키 문자열 + : + 재귀적으로 정리한 값.
           * @example
           * // ["count",2] → "\"count\":2"
           */
          ([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item),
        )
        .join(',') +
      '}'
    );
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('Unsupported canonical value');
  return serialized;
}

/**
 * 제공자 이름과 정리된 요청으로 캐시 검색 키를 만든다.
 *
 * 입력: provider: ORS, request: 경로 프로필·선호도·좌표 등 요청 객체.
 * @returns SHA-256 해시의 64자리 16진수 문자열.
 * @example
 * requestHash("ORS", { a: 1, b: 2 }) === requestHash("ORS", { b: 2, a: 1 }); // true
 *
 * 인증키는 요청 객체에 넣지 않는다. 역방향 좌표 배열은 다른 해시가 된다.
 */
export function requestHash(provider: ProviderName, request: unknown): string {
  return createHash('sha256')
    .update(provider + ':' + canonicalJson(request))
    .digest('hex');
}
export class CacheCoordinator<Q, T> implements CacheLookup<Q, T> {
  private readonly pending = new Map<string, Promise<CacheResult<T>>>();

  /**
   * CacheCoordinator 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: name: 제공자 이름 ORS; store: 캐시 읽기/저장 또는 정리 기능(타입 참고); provider: 외부 경로 조회 기능;
   * ttlSeconds: 캐시 유효기간(초); logger: 처리 로그 기록기; now: 현재 시각을 반환하는 함수(기본 현재 Date)
   * @returns new로 생성한 CacheCoordinator 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // CacheCoordinator(name, store, provider, ttlSeconds, logger, now)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new CacheCoordinator(name, store, provider, ttlSeconds, logger, now);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly name: ProviderName,
    private readonly store: CacheStore<Q, T>,
    private readonly provider: DataProvider<Q, T>,
    private readonly ttlSeconds: number,
    private readonly logger: RoutingLog,

    /**
     * 현재 시각을 공급하는 기본 시계다.
     *
     * 입력: 인자 없음. 필요하면 테스트에서 고정 시각 함수로 교체한다.
     * @returns 호출 순간의 Date 객체.
     * @example
     * // () => new Date("2026-10-26T00:00:00Z")로 바꾸면 동일 시각 기준으로 검증 가능
     */
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * 같은 요청의 동시 처리를 합치고 캐시 또는 API 결과를 돌려준다.
   *
   * 입력: request: 해시를 만들고 제공자에 전달할 요청 Q.
   * @returns 데이터·캐시 ID·수집/만료 시각·cached 여부가 있는 CacheResult<T>.
   * @example
   * await cache.get(request); // 유효한 DB 캐시가 있으면 cached=true
   *
   * 같은 프로세스에서 처리 중인 같은 요청은 한 Promise를 공유한다. 여러 서버 전체를 묶는 분산 잠금은 아니다.
   */
  async get(request: Q): Promise<CacheResult<T>> {
    const hash = requestHash(this.name, request);
    const existing = this.pending.get(hash);
    if (existing) return existing;
    const task = this.load(hash, request);
    this.pending.set(hash, task);
    try {
      return await task;
    } finally {
      this.pending.delete(hash);
    }
  }

  /**
   * 캐시 조회 → 없으면 API 조회 → DB 저장 순서를 실행한다.
   *
   * 입력: hash: 요청 해시, request: 실제 요청 Q.
   * @returns 유효 캐시는 cached=true, 새로 가져온 결과는 cached=false.
   * @example
   * // fetchedAt=10:00, ttlSeconds=86400 → expiresAt=다음 날 10:00
   *
   * TTL은 성공 응답을 받은 시점부터 센다. DB 읽기·외부 호출·저장 실패를 phase로 구분해 기록한다.
   */
  private async load(hash: string, request: Q): Promise<CacheResult<T>> {
    let phase = 'read';
    try {
      // 1. 아직 유효한 DB 행이 있으면 외부 API를 호출하지 않고 바로 사용한다.
      const cached = await this.store.find(hash, this.now());
      if (cached) {
        this.logger.log(
          JSON.stringify({
            event: 'routing_cache_hit',
            provider: this.name,
            cacheId: cached.cacheId,
            expiresAt: cached.expiresAt,
          }),
        );
        return { ...cached, cached: true };
      }
      // 2. 캐시가 없거나 만료된 경우에만 외부 경로를 요청한다.
      phase = 'fetch';
      this.logger.log(
        JSON.stringify({
          event: 'routing_cache_refresh_started',
          provider: this.name,
        }),
      );
      const data = await this.provider.fetch(request);
      // API 응답을 성공적으로 받고 검증한 다음부터 캐시 유효기간을 센다.
      const fetchedAt = this.now(),
        expiresAt = new Date(fetchedAt.valueOf() + this.ttlSeconds * 1000);
      // 3. 성공 데이터와 계산한 유효기간을 저장한 뒤 새 수집 결과를 반환한다.
      phase = 'save';
      const saved = await this.store.save(
        hash,
        request,
        data,
        this.provider.sourceUrl(request),
        fetchedAt,
        expiresAt,
      );
      this.logger.log(
        JSON.stringify({
          event: 'routing_cache_stored',
          provider: this.name,
          cacheId: saved.cacheId,
          fetchedAt: saved.fetchedAt,
          expiresAt: saved.expiresAt,
          itemCount: 1,
        }),
      );
      return { ...saved, cached: false };
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'routing_cache_request_failed',
          provider: this.name,
          phase,
          ...safeDiagnostics(error),
        }),
      );
      if (error instanceof RoutingError) throw error;
      throw new RoutingError(
        503,
        'CACHE_OPERATION_FAILED',
        '경로·교통정보 캐시 처리를 완료하지 못했습니다.',
      );
    }
  }
}

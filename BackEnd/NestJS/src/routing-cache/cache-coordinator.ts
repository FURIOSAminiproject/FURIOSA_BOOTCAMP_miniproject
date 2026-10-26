import { createHash } from 'node:crypto';
import { RoutingError, safeDiagnostics } from './routing.errors';
import type {
  CacheResult,
  CacheStore,
  DataProvider,
  ProviderName,
  RoutingLog,
} from './routing.types';

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value))
    return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, item]) => JSON.stringify(key) + ':' + canonicalJson(item))
        .join(',') +
      '}'
    );
  const serialized = JSON.stringify(value);
  if (serialized === undefined) throw new Error('Unsupported canonical value');
  return serialized;
}
export function requestHash(provider: ProviderName, request: unknown): string {
  return createHash('sha256')
    .update(provider + ':' + canonicalJson(request))
    .digest('hex');
}
export class CacheCoordinator<Q, T> {
  private readonly pending = new Map<string, Promise<CacheResult<T>>>();
  constructor(
    private readonly name: ProviderName,
    private readonly store: CacheStore<Q, T>,
    private readonly provider: DataProvider<Q, T>,
    private readonly ttlSeconds: number,
    private readonly logger: RoutingLog,
    private readonly now: () => Date = () => new Date(),
  ) {}
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
  private async load(hash: string, request: Q): Promise<CacheResult<T>> {
    let phase = 'read';
    try {
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
      phase = 'fetch';
      this.logger.log(
        JSON.stringify({
          event: 'routing_cache_refresh_started',
          provider: this.name,
        }),
      );
      const data = await this.provider.fetch(request);
      // TTL starts only after a successful, validated provider response.
      const fetchedAt = this.now(),
        expiresAt = new Date(fetchedAt.valueOf() + this.ttlSeconds * 1000);
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

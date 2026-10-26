import { providerConfig, providerJson } from '../routing-cache/provider-http';
import {
  object,
  providerError,
  RoutingError,
} from '../routing-cache/routing.errors';
import { coordinate } from '../routing-cache/routing.validation';
import { searchQuery } from './explorer.validation';
import type { SearchPlace } from './explorer.types';

/** 기존 ORS 키를 서버에서만 사용해 HeiGIT Pelias에 한국 주소·장소명을 검색한다. */
export class GeocodingProvider {
  private readonly cache = new Map<
    string,
    { expires: number; places: SearchPlace[] }
  >();
  private readonly pending = new Map<string, Promise<SearchPlace[]>>();

  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: typeof fetch = fetch,
    private readonly now: () => number = Date.now,
  ) {}

  /** 동일 검색은 1시간/최대 200개 메모리 캐시, 동시 요청은 합친다. 오류는 캐시하지 않는다. */
  async search(raw: unknown): Promise<SearchPlace[]> {
    const query = searchQuery(raw);
    const cached = this.cache.get(query);
    if (cached && cached.expires > this.now())
      return structuredClone(cached.places);
    const existing = this.pending.get(query);
    if (existing) return structuredClone(await existing);
    if (this.pending.size >= 8)
      throw new RoutingError(
        503,
        'MAP_SEARCH_BUSY',
        '장소 검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.',
      );
    const work = this.load(query);
    this.pending.set(query, work);
    try {
      const places = await work;
      if (this.cache.size >= 200)
        this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(query, { expires: this.now() + 3600000, places });
      return structuredClone(places);
    } finally {
      this.pending.delete(query);
    }
  }

  private async load(query: string): Promise<SearchPlace[]> {
    const config = providerConfig('ORS', this.env);
    const url = new URL('https://api.heigit.org/pelias/v1/search');
    url.search = new URLSearchParams({
      text: query,
      'boundary.country': 'KOR',
      size: '8',
      lang: 'ko',
    }).toString();
    const data = await providerJson(
      'ORS',
      url,
      {
        method: 'GET',
        headers: { Authorization: config.key, Accept: 'application/geo+json' },
      },
      config.timeoutMs,
      this.transport,
    );
    if (
      !object(data) ||
      data.type !== 'FeatureCollection' ||
      !Array.isArray(data.features) ||
      data.features.length > 40
    )
      throw providerError('ORS');
    const places: SearchPlace[] = [];
    for (const feature of data.features) {
      if (
        !object(feature) ||
        !object(feature.geometry) ||
        feature.geometry.type !== 'Point' ||
        !Array.isArray(feature.geometry.coordinates) ||
        !object(feature.properties)
      )
        throw providerError('ORS');
      const [longitude, latitude] = feature.geometry.coordinates;
      const p = feature.properties;
      if (
        !coordinate(longitude, 180) ||
        !coordinate(latitude, 90) ||
        typeof p.gid !== 'string' ||
        typeof p.label !== 'string' ||
        !p.label.trim()
      )
        throw providerError('ORS');
      if (places.some((place) => place.id === p.gid)) continue;
      places.push({
        id: p.gid.slice(0, 200),
        name:
          typeof p.name === 'string' && p.name.trim()
            ? p.name.slice(0, 255)
            : p.label.slice(0, 255),
        address: p.label.slice(0, 1000),
        latitude,
        longitude,
      });
    }
    return places;
  }
}

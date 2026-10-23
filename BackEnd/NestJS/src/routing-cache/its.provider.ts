import { finite, object, providerError } from './routing.errors';
import { providerConfig, providerJson } from './provider-http';
import type {
  DataProvider,
  TrafficData,
  TrafficLink,
  TrafficRequest,
} from './routing.types';

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;
function measurement(value: unknown, positive: boolean): number | null {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !value.trim())
  )
    return null;
  const result = Number(value);
  return finite(result) && (positive ? result > 0 : true) ? result : null;
}
function observed(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{14}$/.test(value)) return null;
  const formatted = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+09:00`;
  const time = Date.parse(formatted);
  return Number.isFinite(time) &&
    new Date(time + 9 * 3600000).toISOString().slice(0, 19) ===
      formatted.slice(0, 19)
    ? new Date(time).toISOString()
    : null;
}
export function validateTrafficData(value: unknown): TrafficData {
  if (
    !object(value) ||
    !Array.isArray(value.items) ||
    value.items.length > 40000
  )
    throw providerError('ITS');
  const byId = new Map<string, TrafficLink>();
  for (const item of value.items) {
    if (
      !object(item) ||
      typeof item.linkId !== 'string' ||
      !/^\d{1,30}$/.test(item.linkId) ||
      ![
        'startNodeId',
        'endNodeId',
        'roadName',
        'roadDirection',
        'linkNo',
      ].every((key) => item[key] === null || typeof item[key] === 'string') ||
      (item.speed !== null && !finite(item.speed)) ||
      (item.travelTimeSeconds !== null &&
        (!finite(item.travelTimeSeconds) || item.travelTimeSeconds <= 0)) ||
      (item.observedAt !== null &&
        (typeof item.observedAt !== 'string' ||
          !Number.isFinite(Date.parse(item.observedAt))))
    )
      throw providerError('ITS');
    const row: TrafficLink = {
      linkId: item.linkId,
      startNodeId: item.startNodeId as string | null,
      endNodeId: item.endNodeId as string | null,
      roadName: item.roadName as string | null,
      roadDirection: item.roadDirection as string | null,
      linkNo: item.linkNo as string | null,
      speed: item.speed as number | null,
      travelTimeSeconds: item.travelTimeSeconds as number | null,
      observedAt:
        item.observedAt === null
          ? null
          : new Date(item.observedAt as string).toISOString(),
    };
    const prior = byId.get(row.linkId);
    if (prior && JSON.stringify(prior) !== JSON.stringify(row))
      throw providerError('ITS');
    byId.set(row.linkId, row);
  }
  return {
    items: [...byId.values()].sort((a, b) => a.linkId.localeCompare(b.linkId)),
  };
}
export function parseIts(value: unknown): TrafficData {
  if (
    !object(value) ||
    !object(value.header) ||
    !['0', '0000'].includes(String(value.header.resultCode)) ||
    !object(value.body)
  )
    throw providerError('ITS');
  const count = value.body.totalCount;
  if (
    (typeof count !== 'string' && typeof count !== 'number') ||
    String(count).trim() === '' ||
    !Number.isSafeInteger(Number(count)) ||
    Number(count) < 0
  )
    throw providerError('ITS');
  const items = Array.isArray(value.body.items)
    ? value.body.items
    : Number(count) === 0 &&
        (value.body.items == null || value.body.items === '')
      ? []
      : null;
  if (!items || items.length !== Number(count) || items.length > 40000)
    throw providerError('ITS');
  return validateTrafficData({
    items: items.map((item: unknown) => {
      if (!object(item)) throw providerError('ITS');
      return {
        linkId: text(item.linkId),
        startNodeId: text(item.startNodeId),
        endNodeId: text(item.endNodeId),
        roadName: text(item.roadName),
        roadDirection: text(item.roadDrcType),
        linkNo: text(item.linkNo),
        speed: measurement(item.speed, false),
        travelTimeSeconds: measurement(item.travelTime, true),
        observedAt: observed(item.createdDate),
      };
    }),
  });
}
export class ItsProvider implements DataProvider<TrafficRequest, TrafficData> {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: typeof fetch = fetch,
  ) {}
  sourceUrl(): string {
    return 'https://openapi.its.go.kr:9443/trafficInfo';
  }
  async fetch(request: TrafficRequest): Promise<TrafficData> {
    const config = providerConfig('ITS', this.env),
      url = new URL(this.sourceUrl());
    const { contractVersion: _version, ...params } = request;
    url.search = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(params).map(([key, value]) => [key, String(value)]),
      ),
      apiKey: config.key,
    }).toString();
    return parseIts(
      await providerJson(
        'ITS',
        url,
        { headers: { Accept: 'application/json' } },
        config.timeoutMs,
        this.transport,
      ),
    );
  }
}

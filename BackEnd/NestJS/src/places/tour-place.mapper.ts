import { basicPatch, detailPatch, imagePatch } from './tour-mapping';
import { sanitize, sourceUrl } from './tour-provenance';
import type { PlaceMapper, PreparedPlace } from './tour-ingestion.ports';
import type { References, Snapshots, TourItem } from './tour-types';

export const PLACE_FIELDS = ['content_id', 'content_type_id', 'name', 'description', 'address', 'address_detail', 'latitude', 'longitude',
  'region_code', 'region_name', 'district_code', 'district_name', 'category_id', 'phone', 'website_url', 'opening_hours',
  'closed_days', 'main_image_url', 'images', 'fee_text', 'fees', 'event_start_date', 'event_end_date', 'source_updated_at', 'is_active', 'source_url', 'source_type'];
function stable(value: unknown): string {
  const normalize = (item: unknown): unknown => {
    if (item instanceof Date) return item.toISOString();
    if (Array.isArray(item)) return item.map(normalize);
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, normalize(v)]));
    return item;
  };
  return JSON.stringify(normalize(value));
}
function comparable(row: TourItem): TourItem {
  const data = Object.fromEntries(PLACE_FIELDS.filter(key => !['source_url', 'source_type'].includes(key)).map(key => [key, row[key] ?? null]));
  for (const key of ['latitude', 'longitude']) if (data[key] !== null) data[key] = Number(data[key]);
  for (const key of ['source_updated_at', 'event_start_date', 'event_end_date']) {
    if (data[key]) data[key] = key === 'source_updated_at' ? new Date(String(data[key])).toISOString()
      : data[key] instanceof Date ? (data[key] as Date).toISOString().slice(0, 10) : String(data[key]).slice(0, 10);
  }
  return data;
}
export class TourPlaceMapper implements PlaceMapper {
  basic(item: TourItem, fresh: Snapshots, refs: References): TourItem {
    const endpoint = fresh.detailCommon2 ? 'detailCommon2' : Object.keys(fresh)[0] as keyof Snapshots;
    return basicPatch(item, refs, endpoint);
  }
  merge(old: TourItem | undefined, patch: TourItem, fresh: Snapshots): PreparedPlace {
    const safeFresh = sanitize(fresh) as Snapshots;
    // Also sanitize snapshot URLs at the persistence boundary, not only in the HTTP client.
    for (const snapshot of Object.values(safeFresh)) {
      if (snapshot.source_url) snapshot.source_url = sourceUrl(snapshot.source_url);
      if (snapshot.source_urls) snapshot.source_urls = snapshot.source_urls.map(sourceUrl);
    }
    const raw = { ...(old?.raw_data as Snapshots ?? {}), ...safeFresh };
    const next: TourItem = { images: [], fees: [], is_active: true, ...old, ...patch };
    const latest = Object.values(safeFresh).at(-1);
    next.source_url = latest?.source_url ?? old?.source_url ?? null;
    next.source_type = 'API';
    if (fresh.detailIntro2 || fresh.detailInfo2) Object.assign(next, detailPatch(Number(next.content_type_id), raw));
    Object.assign(next, imagePatch(next, raw));
    const contentOf = (data: Snapshots) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value.items]));
    const changed = !old || stable(comparable(old)) !== stable(comparable(next))
      || stable(contentOf(old.raw_data as Snapshots ?? {})) !== stable(contentOf(raw));
    return { next, raw, changed };
  }
}

import type { CategoryInput, References, Snapshots, TourItem, TourEndpoint } from './tour-types';
import { MappingError } from './tour-errors';
export { MappingError } from './tour-errors';
export type { CategoryInput, Snapshot, Snapshots, References } from './tour-types';

export const CONTENT_TYPES = [12, 14, 15, 28, 32, 38, 39];
export interface Fee { label: string; text: string; amount: number | null; unit: string | null }
export function text(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const result = String(value).trim();
  return result || null;
}
export function plain(value: unknown): string | null {
  const s = text(value);
  return s ? s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').trim() || null : null;
}
export function httpUrl(value: unknown): string | null {
  const s = text(value);
  if (!s) return null;
  const candidate = s.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? s;
  try { const url = new URL(candidate.replace(/&amp;/gi, '&')); return ['https:', 'http:'].includes(url.protocol) ? url.href : null; }
  catch { return null; }
}
export function dateValue(value: unknown): string | null {
  const s = text(value);
  if (!s || !/^\d{8}$/.test(s)) return null;
  const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}
export function sourceTime(value: unknown): string | null {
  const s = text(value);
  if (!s || !/^\d{14}$/.test(s) || !dateValue(s.slice(0, 8))) return null;
  if (+s.slice(8, 10) > 23 || +s.slice(10, 12) > 59 || +s.slice(12) > 59) return null;
  return new Date(`${dateValue(s.slice(0, 8))}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12)}+09:00`).toISOString();
}
export function categoriesFrom(items: TourItem[]): CategoryInput[] {
  const map = new Map<string, CategoryInput>();
  for (const item of items) {
    let parentCode: string | null = null;
    for (const level of [1, 2, 3]) {
      const code = text(item[`lclsSystm${level}Cd`]);
      const name = text(item[`lclsSystm${level}Nm`]);
      if (!code && !name) { parentCode = null; continue; }
      if (!code || !/^[A-Z0-9]{1,30}$/.test(code) || !name || name.length > 100 || (level > 1 && !parentCode)) {
        throw new MappingError('Invalid category hierarchy');
      }
      const entry = { code, name, level, parentCode };
      const previous = map.get(code);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry)) throw new MappingError('Conflicting category code');
      map.set(code, entry);
      parentCode = code;
    }
  }
  if (!map.size) throw new MappingError('Empty category reference');
  return [...map.values()].sort((a, b) => a.level - b.level);
}
export function codeNames(items: TourItem[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const row of items) {
    const code = text(row.code), name = text(row.name);
    if (!code || !name || name.length > 100) throw new MappingError('Invalid region reference');
    result.set(code, name);
  }
  return result;
}
function coordinates(item: TourItem): [number | null, number | null] {
  const x = text(item.mapx), y = text(item.mapy);
  const lon = x ? Number(x) : NaN, lat = y ? Number(y) : NaN;
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90 && !(lon === 0 && lat === 0)
    ? [Number(lat.toFixed(7)), Number(lon.toFixed(7))] : [null, null];
}
export function basicPatch(item: TourItem, refs: References, endpoint: TourEndpoint): TourItem {
  const id = text(item.contentid), name = plain(item.title), type = Number(item.contenttypeid);
  if (!id || !/^\d{1,30}$/.test(id) || !name || name.length > 255 || !CONTENT_TYPES.includes(type)) throw new MappingError('Invalid place identity');
  const patch: TourItem = { content_id: id, name, content_type_id: type };
  for (const [source, target] of [['addr1', 'address'], ['addr2', 'address_detail'], ['tel', 'phone'], ['overview', 'description']]) {
    if (Object.hasOwn(item, source)) patch[target] = plain(item[source]);
  }
  if (Object.hasOwn(item, 'homepage')) patch.website_url = httpUrl(item.homepage);
  // Empty list image fields do not erase an existing representative image.
  if (httpUrl(item.firstimage)) patch.main_image_url = httpUrl(item.firstimage);
  if (Object.hasOwn(item, 'mapx') || Object.hasOwn(item, 'mapy')) [patch.latitude, patch.longitude] = coordinates(item);
  if (Object.hasOwn(item, 'lDongRegnCd')) {
    const code = text(item.lDongRegnCd);
    patch.region_code = code && /^\d{2}$/.test(code) ? code : null;
    patch.region_name = patch.region_code ? refs.regions.get(String(patch.region_code)) ?? null : null;
  }
  if (Object.hasOwn(item, 'lDongSignguCd')) {
    const code = text(item.lDongSignguCd), region = text(item.lDongRegnCd);
    patch.district_code = region && code && /^\d{3}$/.test(code) ? code : null;
    patch.district_name = patch.district_code ? refs.districts.get(`${region}:${code}`) ?? null : null;
  }
  if (patch.region_code === null) { patch.district_code = null; patch.district_name = null; }
  if (Object.hasOwn(item, 'lclsSystm3')) {
    const category = refs.categories.get(text(item.lclsSystm3) ?? '');
    patch.category_id = category?.level === 3 ? category.id : null;
  }
  const modified = sourceTime(item.modifiedtime);
  if (modified) patch.source_updated_at = modified;
  if (endpoint === 'areaBasedSyncList2') {
    if (!['0', '1'].includes(String(item.showflag))) throw new MappingError('Invalid showflag');
    patch.is_active = String(item.showflag) === '1';
  }
  if (endpoint === 'searchFestival2') {
    patch.event_start_date = dateValue(item.eventstartdate);
    patch.event_end_date = dateValue(item.eventenddate);
    if (patch.event_start_date && patch.event_end_date && patch.event_end_date < patch.event_start_date) {
      patch.event_start_date = null; patch.event_end_date = null;
    }
  }
  return patch;
}
const introFields: Record<number, [string, string | null]> = {
  12: ['usetime', 'restdate'], 14: ['usetimeculture', 'restdateculture'], 15: ['playtime', null],
  28: ['usetimeleports', 'restdateleports'], 32: ['checkintime', null],
  38: ['opentime', 'restdateshopping'], 39: ['opentimefood', 'restdatefood'],
};
function fee(label: string, value: unknown, unit: string | null = null): Fee | null {
  const content = plain(value);
  if (!content) return null;
  let amount: number | null = null;
  if (/^무료[.!]?$/.test(content)) amount = 0;
  else {
    const prices = [...content.matchAll(/([\d,]+)\s*원/g)];
    if (!unit && /1인|성인|청소년|어린이/.test(content)) unit = 'person';
    if (unit && prices.length === 1 && !/부터|이상|이하|최소|최대|할인|~|∼|\d\s*[-–]/.test(content)) {
      const n = Number(prices[0][1].replaceAll(',', ''));
      if (Number.isSafeInteger(n) && n >= 0) amount = n;
    }
  }
  return { label, text: content, amount, unit };
}
export function detailPatch(type: number, snapshots: Snapshots): TourItem {
  const patch: TourItem = {};
  const intro = snapshots.detailIntro2?.items[0];
  if (intro) {
    const [hours, closed] = introFields[type];
    patch.opening_hours = type === 32
      ? [plain(intro.checkintime) && `입실 ${plain(intro.checkintime)}`, plain(intro.checkouttime) && `퇴실 ${plain(intro.checkouttime)}`].filter(Boolean).join(' / ') || null
      : plain(intro[hours]);
    patch.closed_days = closed ? plain(intro[closed]) : null;
  }
  const fees: Fee[] = [];
  const add = (label: string, value: unknown, unit: string | null = null) => { const f = fee(label, value, unit); if (f) fees.push(f); };
  if (intro) {
    const fields: Record<number, string> = { 14: 'usefee', 15: 'usetimefestival', 28: 'usefeeleports' };
    if (fields[type]) add('이용요금', intro[fields[type]]);
    if (type === 14) add('주차요금', intro.parkingfee, 'vehicle');
    if (type === 28) add('주차요금', intro.parkingfeeleports, 'vehicle');
  }
  for (const item of snapshots.detailInfo2?.items ?? []) {
    if (type === 32) {
      for (const [field, label] of [['roomoffseasonminfee1', '비수기 주중'], ['roomoffseasonminfee2', '비수기 주말'],
        ['roompeakseasonminfee1', '성수기 주중'], ['roompeakseasonminfee2', '성수기 주말']]) {
        const value = text(item[field]);
        if (value && /^\d+$/.test(value)) {
          const amount = Number(value);
          fees.push({ label: `${plain(item.roomtitle) ?? '객실'} ${label} 최소 요금`, text: `${value}원`,
            amount: Number.isSafeInteger(amount) && amount > 0 ? amount : null, unit: 'room_night' });
        }
      }
    } else {
      const label = plain(item.infoname);
      if (label && /입장료|이용료|이용요금|체험료|주차료|주차요금/.test(label.replace(/\s/g, ''))) {
        add(label, item.infotext, /주차/.test(label) ? 'vehicle' : /입장료/.test(label.replace(/\s/g, '')) ? 'person' : null);
      }
    }
  }
  if (snapshots.detailIntro2 || snapshots.detailInfo2) {
    patch.fees = fees;
    patch.fee_text = fees.map(f => `${f.label}: ${f.text}`).join('\n') || null;
  }
  return patch;
}
export function imagePatch(place: TourItem, raw: Snapshots): TourItem {
  const images = new Map<string, TourItem>();
  for (const item of raw.detailImage2?.items ?? []) {
    const url = httpUrl(item.originimgurl);
    if (url) images.set(url, { url, thumbnail_url: httpUrl(item.smallimageurl), copyright_code: text(item.cpyrhtDivCd), attribution: null });
  }
  const main = httpUrl(place.main_image_url);
  if (main && !images.has(main)) {
    const sources = Object.values(raw).sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));
    const original = sources.flatMap(s => s.items).find(item => httpUrl(item.firstimage) === main);
    images.set(main, { url: main, thumbnail_url: httpUrl(original?.firstimage2), copyright_code: text(original?.cpyrhtDivCd), attribution: null });
  }
  return { images: [...images.values()], main_image_url: main ?? images.keys().next().value ?? null };
}

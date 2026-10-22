export type TourItem = Record<string, unknown>;
export type TourEndpoint = 'lclsSystmCode2' | 'ldongCode2' | 'areaBasedList2'
  | 'areaBasedSyncList2' | 'searchFestival2' | 'detailCommon2' | 'detailIntro2'
  | 'detailInfo2' | 'detailImage2';
export type TourParams = Record<string, string | number>;
export interface TourPage { items: TourItem[]; totalCount: number; pageNo: number; sourceUrl: string }
export interface TourCollection { items: TourItem[]; sourceUrls: string[] }
export interface CategoryInput { code: string; name: string; level: number; parentCode: string | null }
export interface Snapshot { fetched_at: string; items: TourItem[]; source_url?: string; source_urls?: string[] }
export type Snapshots = Partial<Record<TourEndpoint, Snapshot>>;
export interface References {
  categories: Map<string, { id: string; level: number }>;
  regions: Map<string, string>;
  districts: Map<string, string>;
}
export type SaveStatus = 'inserted' | 'updated' | 'unchanged';
export interface SaveResult { id: string; status: SaveStatus }
export function record(value: unknown): value is TourItem {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

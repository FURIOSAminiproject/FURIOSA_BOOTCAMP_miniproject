import type { IngestionOptions } from './tour-ingestion.options';
import type { CategoryInput, References, SaveResult, Snapshots, TourCollection, TourEndpoint, TourItem, TourPage, TourParams } from './tour-types';

// Consumers receive only the operations they need. Implementations are wired in Nest modules.
export interface PageReader { page(endpoint: TourEndpoint, params?: TourParams): Promise<TourPage> }
export interface ReferenceReader { all(endpoint: TourEndpoint, params?: TourParams): Promise<TourItem[]> }
export interface DetailReader extends PageReader {
  allWithSources(endpoint: TourEndpoint, params?: TourParams): Promise<TourCollection>;
}
export interface RequestMetrics { readonly requests: number }
export interface IngestionGate {
  withLock<T>(work: () => Promise<T>): Promise<T>;
  assertSchema(): Promise<void>;
}
export interface CategoryWriter { categories(entries: CategoryInput[]): Promise<References['categories']> }
export interface PlaceWriter { save(item: TourItem, fresh: Snapshots, refs: References): Promise<SaveResult> }
export interface ReferenceContext {
  refs: References;
  categoryCount: number;
  ensureDistrict(item: TourItem): Promise<void>;
}
export interface ReferenceLoader { load(): Promise<ReferenceContext> }
export interface DetailLoader { load(contentId: string): Promise<{ item: TourItem; snapshots: Snapshots }> }
export interface ListPlan { endpoint: TourEndpoint; params: TourParams; partitions: { key: string; params: TourParams }[] }
export interface ListPlanResolver { resolve(options: IngestionOptions): ListPlan }
export interface PreparedPlace { next: TourItem; raw: Snapshots; changed: boolean }
export interface PlaceMapper {
  basic(item: TourItem, fresh: Snapshots, refs: References): TourItem;
  merge(old: TourItem | undefined, patch: TourItem, fresh: Snapshots): PreparedPlace;
}
export interface IngestionDependencies {
  api: PageReader & RequestMetrics;
  gate: IngestionGate;
  references: ReferenceLoader;
  details: DetailLoader;
  places: PlaceWriter;
  plans: ListPlanResolver;
}

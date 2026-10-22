import { TourIngestionService } from './tour-ingestion.service';
import { TourReferenceService } from './tour-reference.service';
import { TourDetailService } from './tour-detail.service';
import { TourListPlans, DEFAULT_LIST_STRATEGIES } from './tour-list-plans';
import type { CategoryWriter, DetailReader, IngestionGate, PlaceWriter, ReferenceReader, RequestMetrics } from './tour-ingestion.ports';

// Shared composition for CLI and batch. The caller supplies a fresh API client for each run.
export function createTourRun(api: DetailReader & ReferenceReader & RequestMetrics,
  gate: IngestionGate, categories: CategoryWriter, places: PlaceWriter): TourIngestionService {
  return new TourIngestionService({ api, gate, places,
    references: new TourReferenceService(api, categories), details: new TourDetailService(api),
    plans: new TourListPlans(DEFAULT_LIST_STRATEGIES),
  });
}

import { Module } from '@nestjs/common';
import { TourApiModule } from './tour-api.module';
import { TourPersistenceModule } from './tour-persistence.module';
import { TourApiClient } from './tour-api.client';
import { TourDbSession } from './tour-db.session';
import { TourCategoryRepository } from './tour-category.repository';
import { TourStore } from './tour-store';
import { TourReferenceService } from './tour-reference.service';
import { TourDetailService } from './tour-detail.service';
import { TourListPlans, DEFAULT_LIST_STRATEGIES } from './tour-list-plans';
import type { CategoryWriter, DetailLoader, DetailReader, IngestionGate, ListPlanResolver, PageReader, PlaceWriter, ReferenceLoader, ReferenceReader, RequestMetrics } from './tour-ingestion.ports';
import { TourIngestionService } from './tour-ingestion.service';

@Module({
  imports: [TourApiModule, TourPersistenceModule],
  providers: [
    { provide: TourReferenceService, useFactory: (api: ReferenceReader, categories: CategoryWriter) => new TourReferenceService(api, categories),
      inject: [TourApiClient, TourCategoryRepository] },
    { provide: TourDetailService, useFactory: (api: DetailReader) => new TourDetailService(api), inject: [TourApiClient] },
    { provide: TourListPlans, useFactory: () => new TourListPlans(DEFAULT_LIST_STRATEGIES) },
    { provide: TourIngestionService, useFactory: (api: PageReader & RequestMetrics, gate: IngestionGate,
      references: ReferenceLoader, details: DetailLoader, places: PlaceWriter, plans: ListPlanResolver) =>
      new TourIngestionService({ api, gate, references, details, places, plans }),
      inject: [TourApiClient, TourDbSession, TourReferenceService, TourDetailService, TourStore, TourListPlans] },
  ],
  exports: [TourIngestionService],
})
export class TourIngestionModule {}

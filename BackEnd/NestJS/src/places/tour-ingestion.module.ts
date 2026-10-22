import { Module } from '@nestjs/common';
import { TourApiModule } from './tour-api.module';
import { TourPersistenceModule } from './tour-persistence.module';
import { TourApiClient } from './tour-api.client';
import { TourDbSession } from './tour-db.session';
import { TourCategoryRepository } from './tour-category.repository';
import { TourStore } from './tour-store';
import type { CategoryWriter, DetailReader, IngestionGate, PlaceWriter, ReferenceReader, RequestMetrics } from './tour-ingestion.ports';
import { TourIngestionService } from './tour-ingestion.service';
import { createTourRun } from './tour-run.factory';

@Module({
  imports: [TourApiModule, TourPersistenceModule],
  providers: [
    { provide: TourIngestionService, useFactory: (api: DetailReader & ReferenceReader & RequestMetrics,
      gate: IngestionGate, categories: CategoryWriter, places: PlaceWriter) => createTourRun(api,gate,categories,places),
      inject: [TourApiClient,TourDbSession,TourCategoryRepository,TourStore] },
  ],
  exports: [TourIngestionService],
})
export class TourIngestionModule {}

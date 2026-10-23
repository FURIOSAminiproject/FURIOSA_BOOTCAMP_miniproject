import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { TourDbSession } from './tour-db.session';
import { TourCategoryRepository } from './tour-category.repository';
import { TourPlaceMapper } from './tour-place.mapper';
import { TourStore } from './tour-store';
import type { PlaceMapper } from './tour-ingestion.ports';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: TourDbSession, useFactory: (database: DataSource) => new TourDbSession(database), inject: [DataSource] },
    TourPlaceMapper,
    { provide: TourCategoryRepository, useFactory: (session: TourDbSession) => new TourCategoryRepository(session), inject: [TourDbSession] },
    { provide: TourStore, useFactory: (session: TourDbSession, mapper: PlaceMapper) => new TourStore(session, mapper),
      inject: [TourDbSession, TourPlaceMapper] },
  ],
  exports: [TourDbSession, TourCategoryRepository, TourStore],
})
export class TourPersistenceModule {}

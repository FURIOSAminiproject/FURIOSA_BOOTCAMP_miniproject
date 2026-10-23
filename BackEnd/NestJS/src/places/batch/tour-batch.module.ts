import { Logger, Module, type DynamicModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { tourConfig, TourApiClient } from '../tour-api.client';
import { TourPersistenceModule } from '../tour-persistence.module';
import { TourDbSession } from '../tour-db.session';
import { TourCategoryRepository } from '../tour-category.repository';
import { TourStore } from '../tour-store';
import type { CategoryWriter, IngestionGate, PlaceWriter } from '../tour-ingestion.ports';
import { createTourRun } from '../tour-run.factory';
import { tourBatchConfig } from './tour-batch.config';
import { FileTourBatchState } from './tour-batch.state';
import { TourBatchRunner } from './tour-batch.runner';
import { TourBatchScheduler } from './tour-batch.scheduler';
import { TourBatchController } from './tour-batch.controller';

@Module({})
export class TourBatchModule {
  static register(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const config = tourBatchConfig(env);
    const apiEnv = { ...env };
    return { module:TourBatchModule, imports:[ScheduleModule.forRoot(),TourPersistenceModule], controllers:[TourBatchController], providers:[
      { provide:TourBatchRunner, useFactory:(gate:IngestionGate,categories:CategoryWriter,places:PlaceWriter) =>
        new TourBatchRunner(config, new FileTourBatchState(config.statePath),
          // Validate credentials at collection time; scheduling itself needs no enable flag or API call.
          () => createTourRun(new TourApiClient(tourConfig(apiEnv)),gate,categories,places), new Logger('TourBatch')),
        inject:[TourDbSession,TourCategoryRepository,TourStore] },
      { provide:TourBatchScheduler, useFactory:(task:TourBatchRunner) => new TourBatchScheduler(task,new Logger('TourBatch')),
        inject:[TourBatchRunner] },
    ], exports:[TourBatchRunner] };
  }
}

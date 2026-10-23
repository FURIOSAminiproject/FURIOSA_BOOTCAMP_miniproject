import { Module } from '@nestjs/common';
import { TourApiClient, tourConfig } from './tour-api.client';

@Module({
  providers: [{ provide: TourApiClient, useFactory: () => new TourApiClient(tourConfig(process.env)) }],
  exports: [TourApiClient],
})
export class TourApiModule {}

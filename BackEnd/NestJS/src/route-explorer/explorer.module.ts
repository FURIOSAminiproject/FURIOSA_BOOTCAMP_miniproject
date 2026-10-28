import { Module } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { RoutingCacheModule } from '../routing-cache/routing-cache.module';
import { RoutingService } from '../routing-cache/routing.service';
import { ExplorerController } from './explorer.controller';
import { ExplorerRepository } from './explorer.repository';
import { ExplorerService } from './explorer.service';
import { GeocodingProvider } from './geocoding.provider';
import { DestinationCurator } from './destination-curator';

/** 기존 ORS 캐시/DB 연결을 공유하며 별도 서버나 스케줄러를 만들지 않는다. */
@Module({
  imports: [DatabaseModule, RoutingCacheModule],
  controllers: [ExplorerController],
  providers: [
    { provide: GeocodingProvider, useFactory: () => new GeocodingProvider() },
    {
      provide: ExplorerRepository,
      useFactory: (db: DataSource) => new ExplorerRepository(db),
      inject: [DataSource],
    },
    {
      provide: DestinationCurator,
      useFactory: (db: DataSource) => new DestinationCurator(db),
      inject: [DataSource],
    },
    {
      provide: ExplorerService,
      useFactory: (
        planner: RoutingService,
        places: ExplorerRepository,
        curator: DestinationCurator,
      ) => new ExplorerService(planner, places, curator),
      inject: [RoutingService, ExplorerRepository, DestinationCurator],
    },
  ],
})
export class ExplorerModule {}

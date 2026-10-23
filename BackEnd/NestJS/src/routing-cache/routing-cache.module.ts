import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { CacheDatabase } from './cache-database';
import { OrsCacheRepository, ItsCacheRepository } from './cache-repositories';
import { OrsProvider } from './ors.provider';
import { ItsProvider } from './its.provider';
import { CacheCoordinator } from './cache-coordinator';
import { CacheMaintenance } from './cache-maintenance';
import { RoutePointResolver, RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import type {
  OrsRequest,
  RouteData,
  TrafficData,
  TrafficRequest,
} from './routing.types';

const ORS_CACHE = Symbol('ORS_CACHE'),
  ITS_CACHE = Symbol('ITS_CACHE');
@Module({
  // The application already initializes ScheduleModule.forRoot() in TourBatchModule.
  imports: [DatabaseModule, ScheduleModule],
  controllers: [RoutingController],
  providers: [
    {
      provide: CacheDatabase,
      useFactory: (db: DataSource) => new CacheDatabase(db),
      inject: [DataSource],
    },
    {
      provide: OrsCacheRepository,
      useFactory: (db: CacheDatabase) => new OrsCacheRepository(db),
      inject: [CacheDatabase],
    },
    {
      provide: ItsCacheRepository,
      useFactory: (db: CacheDatabase) => new ItsCacheRepository(db),
      inject: [CacheDatabase],
    },
    { provide: OrsProvider, useFactory: () => new OrsProvider(process.env) },
    { provide: ItsProvider, useFactory: () => new ItsProvider(process.env) },
    {
      provide: ORS_CACHE,
      useFactory: (store: OrsCacheRepository, provider: OrsProvider) =>
        new CacheCoordinator(
          'ORS',
          store,
          provider,
          86400,
          new Logger('RoutingCache'),
        ),
      inject: [OrsCacheRepository, OrsProvider],
    },
    {
      provide: ITS_CACHE,
      useFactory: (store: ItsCacheRepository, provider: ItsProvider) =>
        new CacheCoordinator(
          'ITS',
          store,
          provider,
          300,
          new Logger('RoutingCache'),
        ),
      inject: [ItsCacheRepository, ItsProvider],
    },
    {
      provide: RoutePointResolver,
      useFactory: (db: DataSource) => new RoutePointResolver(db),
      inject: [DataSource],
    },
    {
      provide: RoutingService,
      useFactory: (
        resolver: RoutePointResolver,
        ors: CacheCoordinator<OrsRequest, RouteData>,
        its: CacheCoordinator<TrafficRequest, TrafficData>,
      ) => new RoutingService(resolver, ors, its),
      inject: [RoutePointResolver, ORS_CACHE, ITS_CACHE],
    },
    {
      provide: CacheMaintenance,
      useFactory: (db: CacheDatabase) =>
        new CacheMaintenance(db, new Logger('RoutingCache')),
      inject: [CacheDatabase],
    },
  ],
  exports: [RoutingService],
})
export class RoutingCacheModule {}

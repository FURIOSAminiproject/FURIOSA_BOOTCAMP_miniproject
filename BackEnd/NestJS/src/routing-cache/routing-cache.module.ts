import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { CacheDatabase } from './cache-database';
import { OrsCacheRepository } from './cache-repositories';
import { OrsProvider } from './ors.provider';
import { CacheCoordinator } from './cache-coordinator';
import { CacheMaintenance } from './cache-maintenance';
import { RoutePointResolver, RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import type { OrsRequest, RouteData } from './routing.types';

const ORS_CACHE = Symbol('ORS_CACHE');
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
    { provide: OrsProvider, useFactory: () => new OrsProvider(process.env) },
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
      provide: RoutePointResolver,
      useFactory: (db: DataSource) => new RoutePointResolver(db),
      inject: [DataSource],
    },
    {
      provide: RoutingService,
      useFactory: (
        resolver: RoutePointResolver,
        ors: CacheCoordinator<OrsRequest, RouteData>,
      ) => new RoutingService(resolver, ors),
      inject: [RoutePointResolver, ORS_CACHE],
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

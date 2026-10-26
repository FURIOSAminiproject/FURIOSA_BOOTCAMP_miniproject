/**
 * 경로 기능 전체 조립 지점. 구체 구현은 여기서 선택하고 업무 서비스에는 작은 계약만 주입한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { Logger, Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../database/database.module';
import { CacheDatabase } from './cache-database';
import { OrsCacheRepository } from './cache-repositories';
import { OrsCacheMaintenanceRepository } from './ors-cache-maintenance.repository';
import { OrsProvider } from './ors.provider';
import { CacheCoordinator } from './cache-coordinator';
import { CacheMaintenance } from './cache-maintenance';
import { PlaceCoordinateRepository } from './place-coordinate.repository';
import { RoutePointResolver } from './route-point.resolver';
import { RoutingService } from './routing.service';
import { RoutingController } from './routing.controller';
import { ORS_CACHE_POLICY } from './routing.policy';
import type {
  CacheMaintenanceStore,
  PlaceCoordinateReader,
  PointResolver,
  RouteLookup,
  SqlExecutor,
} from './routing.ports';

const ORS_CACHE = Symbol('ORS_CACHE');
@Module({
  // 애플리케이션 스케줄러 초기화는 TourBatchModule에서 한 번만 한다.
  imports: [DatabaseModule, ScheduleModule],
  controllers: [RoutingController],
  providers: [
    {
      provide: CacheDatabase,

      /**
       * CacheDatabase 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: db: 주입받은 SQL 실행기
       * @returns CacheDatabase 객체.
       * @example
       * new CacheDatabase(db);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (db: DataSource) => new CacheDatabase(db),
      inject: [DataSource],
    },
    {
      provide: OrsCacheRepository,

      /**
       * OrsCacheRepository 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: db: 주입받은 SQL 실행기
       * @returns OrsCacheRepository 객체.
       * @example
       * new OrsCacheRepository(db);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (db: SqlExecutor) => new OrsCacheRepository(db),
      inject: [CacheDatabase],
    },
    {
      provide: OrsCacheMaintenanceRepository,

      /**
       * OrsCacheMaintenanceRepository 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: db: 주입받은 SQL 실행기
       * @returns OrsCacheMaintenanceRepository 객체.
       * @example
       * new OrsCacheMaintenanceRepository(db);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (db: SqlExecutor) => new OrsCacheMaintenanceRepository(db),
      inject: [CacheDatabase],
    },
    {
      provide: OrsProvider,

      /**
       * OrsProvider 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: 인자 없음. 모듈에서 캡처한 설정 또는 process.env를 사용한다.
       * @returns OrsProvider 객체.
       * @example
       * new OrsProvider(process.env);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: () => new OrsProvider(process.env),
    },
    {
      provide: ORS_CACHE,

      /**
       * CacheCoordinator 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: store: 캐시 읽기/저장 또는 정리 기능(타입 참고); provider: 외부 경로 조회 기능
       * @returns CacheCoordinator 객체.
       * @example
       * new CacheCoordinator( 'ORS', store, provider, ORS_CACHE_POLICY.ttlSeconds, new Logger('RoutingCache'));
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (store: OrsCacheRepository, provider: OrsProvider) =>
        new CacheCoordinator(
          'ORS',
          store,
          provider,
          ORS_CACHE_POLICY.ttlSeconds,
          new Logger('RoutingCache'),
        ),
      inject: [OrsCacheRepository, OrsProvider],
    },
    {
      provide: PlaceCoordinateRepository,

      /**
       * PlaceCoordinateRepository 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: db: 주입받은 SQL 실행기
       * @returns PlaceCoordinateRepository 객체.
       * @example
       * new PlaceCoordinateRepository(db);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (db: DataSource) => new PlaceCoordinateRepository(db),
      inject: [DataSource],
    },
    {
      provide: RoutePointResolver,

      /**
       * RoutePointResolver 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: places: 장소 저장기 또는 활성 장소 좌표 조회기(선언된 타입 참고)
       * @returns RoutePointResolver 객체.
       * @example
       * new RoutePointResolver(places);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (places: PlaceCoordinateReader) =>
        new RoutePointResolver(places),
      inject: [PlaceCoordinateRepository],
    },
    {
      provide: RoutingService,

      /**
       * RoutingService 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: resolver: 지점 ID를 위도/경도로 바꾸는 기능; routes: ORS 경로 캐시 조회 기능
       * @returns RoutingService 객체.
       * @example
       * new RoutingService(resolver, routes);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (resolver: PointResolver, routes: RouteLookup) =>
        new RoutingService(resolver, routes),
      inject: [RoutePointResolver, ORS_CACHE],
    },
    {
      provide: CacheMaintenance,

      /**
       * CacheMaintenance 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: store: 캐시 읽기/저장 또는 정리 기능(타입 참고)
       * @returns CacheMaintenance 객체.
       * @example
       * new CacheMaintenance(store, new Logger('RoutingCache'));
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (store: CacheMaintenanceStore) =>
        new CacheMaintenance(store, new Logger('RoutingCache')),
      inject: [OrsCacheMaintenanceRepository],
    },
  ],
  exports: [RoutingService],
})
export class RoutingCacheModule {}

/**
 * 배치 모듈 조립 지점. 스케줄러는 자동 등록하고 API 클라이언트는 실제 수집 시 만든다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { Logger, Module, type DynamicModule } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { tourConfig, TourApiClient } from '../tour-api.client';
import { TourPersistenceModule } from '../tour-persistence.module';
import { TourDbSession } from '../tour-db.session';
import { TourCategoryRepository } from '../tour-category.repository';
import { TourStore } from '../tour-store';
import type {
  CategoryWriter,
  IngestionGate,
  PlaceWriter,
} from '../tour-ingestion.ports';
import { createTourRun } from '../tour-run.factory';
import { tourBatchConfig } from './tour-batch.config';
import { FileTourBatchState } from './tour-batch.state';
import { TourBatchRunner } from './tour-batch.runner';
import { TourBatchScheduler } from './tour-batch.scheduler';
import { TourBatchController } from './tour-batch.controller';

@Module({})
export class TourBatchModule {
  /**
   * 스케줄러·상태 파일·수집 서비스를 Nest 모듈에 연결한다.
   *
   * 입력: env: 배치 설정과 API 환경변수. 기본값은 process.env이며 등록 시 복사한다.
   * @returns Nest가 읽는 DynamicModule 설정.
   * @example
   * TourBatchModule.register(process.env); // 매일 한국 시간 01시 스케줄 등록
   *
   * API 클라이언트는 실제 수집 시작 시 새로 만든다. 등록만으로 장소를 수집하지 않는다.
   */
  static register(env: NodeJS.ProcessEnv = process.env): DynamicModule {
    const config = tourBatchConfig(env);
    const apiEnv = { ...env };
    return {
      module: TourBatchModule,
      imports: [ScheduleModule.forRoot(), TourPersistenceModule],
      controllers: [TourBatchController],
      providers: [
        {
          provide: TourBatchRunner,

          /**
           * TourBatchRunner 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
           *
           * 입력: gate: 수집 잠금/스키마 검사 기능; categories: 분류 저장 기능; places: 장소 저장기 또는 활성 장소 좌표 조회기(선언된
           * 타입 참고)
           * @returns TourBatchRunner 객체.
           * @example
           * new TourBatchRunner(config, state, createRun, logger);
           *
           * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
           */
          useFactory: (
            gate: IngestionGate,
            categories: CategoryWriter,
            places: PlaceWriter,
          ) =>
            new TourBatchRunner(
              config,
              new FileTourBatchState(config.statePath),
              // 인증 설정은 수집 시작 때 검사한다. 스케줄 등록에 활성화 플래그나 API 호출은 필요 없다.

              /**
               * 매 수집 시작 시 새로운 TourAPI 클라이언트와 수집 서비스를 만든다.
               *
               * 입력: 인자 없음. 바깥 apiEnv/gate/categories/places를 사용한다.
               * @returns 요청 카운터가 새로 시작하는 TourIngestionService.
               * @example
               * // createRun() → 새 TourApiClient + 새 수집 서비스
               *
               * 실제 수집 시 인증 설정을 검사한다. 스케줄 등록만으로 API를 호출하지 않는다.
               */
              () =>
                createTourRun(
                  new TourApiClient(tourConfig(apiEnv)),
                  gate,
                  categories,
                  places,
                ),
              new Logger('TourBatch'),
            ),
          inject: [TourDbSession, TourCategoryRepository, TourStore],
        },
        {
          provide: TourBatchScheduler,

          /**
           * TourBatchScheduler 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
           *
           * 입력: task: 예약 수집 실행 기능
           * @returns TourBatchScheduler 객체.
           * @example
           * new TourBatchScheduler(task, new Logger('TourBatch'));
           *
           * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
           */
          useFactory: (task: TourBatchRunner) =>
            new TourBatchScheduler(task, new Logger('TourBatch')),
          inject: [TourBatchRunner],
        },
      ],
      exports: [TourBatchRunner],
    };
  }
}

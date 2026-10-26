/**
 * CLI용 수집 서비스 조립 지점. HTTP 조회기와 DB 저장기를 연결한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { Module } from '@nestjs/common';
import { TourApiModule } from './tour-api.module';
import { TourPersistenceModule } from './tour-persistence.module';
import { TourApiClient } from './tour-api.client';
import { TourDbSession } from './tour-db.session';
import { TourCategoryRepository } from './tour-category.repository';
import { TourStore } from './tour-store';
import type {
  CategoryWriter,
  DetailReader,
  IngestionGate,
  PlaceWriter,
  ReferenceReader,
  RequestMetrics,
} from './tour-ingestion.ports';
import { TourIngestionService } from './tour-ingestion.service';
import { createTourRun } from './tour-run.factory';

@Module({
  imports: [TourApiModule, TourPersistenceModule],
  providers: [
    {
      provide: TourIngestionService,

      /**
       * createTourRun 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: api: 필요한 API 조회 기능; gate: 수집 잠금/스키마 검사 기능; categories: 분류 저장 기능; places: 장소 저장기
       * 또는 활성 장소 좌표 조회기(선언된 타입 참고)
       * @returns createTourRun이 조립한 수집 서비스.
       * @example
       * createTourRun(api, gate, categories, places);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (
        api: DetailReader & ReferenceReader & RequestMetrics,
        gate: IngestionGate,
        categories: CategoryWriter,
        places: PlaceWriter,
      ) => createTourRun(api, gate, categories, places),
      inject: [TourApiClient, TourDbSession, TourCategoryRepository, TourStore],
    },
  ],
  exports: [TourIngestionService],
})
export class TourIngestionModule {}

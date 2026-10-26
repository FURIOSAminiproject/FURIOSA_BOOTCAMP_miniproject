/**
 * 장소 DB 기능 조립 지점. 변환기와 트랜잭션 실행기를 저장소에 주입한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
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
    {
      provide: TourDbSession,

      /**
       * TourDbSession 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: database: TypeORM DB 연결/실행기
       * @returns TourDbSession 객체.
       * @example
       * new TourDbSession(database);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (database: DataSource) => new TourDbSession(database),
      inject: [DataSource],
    },
    TourPlaceMapper,
    {
      provide: TourCategoryRepository,

      /**
       * TourCategoryRepository 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: session: 트랜잭션 실행기
       * @returns TourCategoryRepository 객체.
       * @example
       * new TourCategoryRepository(session);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (session: TourDbSession) =>
        new TourCategoryRepository(session),
      inject: [TourDbSession],
    },
    {
      provide: TourStore,

      /**
       * TourStore 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: session: 트랜잭션 실행기; mapper: 원본 응답을 DB 컬럼으로 바꾸는 변환기
       * @returns TourStore 객체.
       * @example
       * new TourStore(session, mapper);
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: (session: TourDbSession, mapper: PlaceMapper) =>
        new TourStore(session, mapper),
      inject: [TourDbSession, TourPlaceMapper],
    },
  ],
  exports: [TourDbSession, TourCategoryRepository, TourStore],
})
export class TourPersistenceModule {}

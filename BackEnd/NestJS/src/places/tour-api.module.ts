/**
 * TourAPI 클라이언트의 조립 지점. 업무 코드는 이 모듈의 구체 생성 방식을 몰라도 된다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { Module } from '@nestjs/common';
import { TourApiClient, tourConfig } from './tour-api.client';

@Module({
  providers: [
    {
      provide: TourApiClient,

      /**
       * TourApiClient 구현을 Nest 의존성 컨테이너에 연결하는 생성 함수다.
       *
       * 입력: 인자 없음. 모듈에서 캡처한 설정 또는 process.env를 사용한다.
       * @returns TourApiClient 객체.
       * @example
       * new TourApiClient(tourConfig(process.env));
       *
       * inject 배열의 순서와 매개변수 순서를 맞춘다. 구체 구현 선택은 이 모듈에서만 한다.
       */
      useFactory: () => new TourApiClient(tourConfig(process.env)),
    },
  ],
  exports: [TourApiClient],
})
export class TourApiModule {}

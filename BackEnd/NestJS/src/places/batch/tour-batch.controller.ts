/**
 * 수동 수집 HTTP 진입점. 입력을 실행기에 넘기며 API 호출·SQL은 직접 처리하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { TourBatchRunner } from './tour-batch.runner';
import type { TourBatchCommands, TourBatchResult } from './tour-batch.runner';
import type { IngestionOptions } from '../tour-ingestion.options';
import { record } from '../tour-types';

@Controller(['places/batch', 'places'])
export class TourBatchController {
  /**
   * TourBatchController 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: runner: 일일/수동 수집 실행 기능
   * @returns new로 생성한 TourBatchController 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourBatchController(runner)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourBatchController(runner);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    @Inject(TourBatchRunner) private readonly runner: TourBatchCommands,
  ) {}

  /**
   * 수동 옵션 유무에 따라 수동 수집 또는 일일 증분 수집을 실행한다.
   *
   * 입력: body: 선택적 수집 조건. 속성이 하나라도 있으면 수동 실행하고, 없거나 빈 객체면 일일 증분 수집이다.
   * @returns 완료·실패·중복 실행 건너뜀 상태와 수집 집계.
   * @example
   * // POST /api/places/batch/run
   * // body: { "mode": "initial", "maxPages": 1 } → 수동 수집 결과
   *
   * body가 없으면 일일 배치와 같은 run()을 호출한다. HTTP 200 안에서도 status를 확인해야 한다.
   */
  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runBatch(
    @Body() body?: Partial<IngestionOptions>,
  ): Promise<TourBatchResult> {
    if (body && (Array.isArray(body) || Object.keys(body).length > 0)) {
      return await this.runner.runManual(body);
    }
    return await this.runner.run();
  }

  /**
   * POST 요청으로 장소 수집을 실행한다.
   *
   * 입력: body와 query: 수집 조건. 기본 mode=initial → query → body 순서로 덮어써 body가 우선한다.
   * @returns 수동 수집 결과 Promise<TourBatchResult>.
   * @example
   * // POST /api/places/batch/initial?maxPages=1
   * // body: { "maxPages": 2 } → 최대 2페이지 수집
   *
   * 이 요청은 외부 API 호출과 DB 저장을 일으킨다. /ingest 경로도 같은 동작이다.
   */
  @Post(['initial', 'ingest'])
  @HttpCode(HttpStatus.OK)
  async runInitialPost(
    @Body() body?: Partial<IngestionOptions>,
    @Query() query?: Partial<IngestionOptions>,
  ): Promise<TourBatchResult> {
    // 잘못된 본문을 펼치면 [] 등이 빈 객체가 되어 전체 초기 수집으로 바뀔 수 있다.
    if (body !== undefined && !record(body))
      return await this.runner.runManual(body);
    return await this.runner.runManual({ mode: 'initial', ...query, ...body });
  }

  /**
   * 기존 GET 수집 주소의 동작을 유지한다.
   *
   * 입력: query: URL 쿼리의 수집 옵션. 기본 mode는 initial이다.
   * @returns 수동 수집 결과. 조회 전용 요청이 아니라 DB에 저장하는 요청이다.
   * @example
   * // GET /api/places/batch/initial?maxPages=1 → 최대 1페이지 수집
   *
   * 호환성을 위해 남겨 둔 GET 주소이며 /ingest도 같은 동작이다.
   */
  @Get(['initial', 'ingest'])
  @HttpCode(HttpStatus.OK)
  async runInitialGet(
    @Query() query?: Partial<IngestionOptions>,
  ): Promise<TourBatchResult> {
    return await this.runner.runManual({ mode: 'initial', ...query });
  }
}

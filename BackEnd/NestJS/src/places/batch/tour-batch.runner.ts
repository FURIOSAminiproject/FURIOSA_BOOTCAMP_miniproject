/**
 * 일일/수동 수집 실행 관리. 중복 실행·로그·마지막 성공 날짜를 책임진다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import {
  IngestionRunError,
  type IngestionReport,
} from '../tour-ingestion.service';
import type { IngestionOptions } from '../tour-ingestion.options';
import { TourApiError, TourStoreError } from '../tour-errors';
import {
  seoulDate,
  shiftDate,
  type TourBatchConfig,
} from './tour-batch.config';
import {
  TourBatchStateError,
  type TourBatchStateStore,
} from './tour-batch.state';
import {
  manualIngestionOptions,
  type ManualOptionsParser,
} from './tour-manual.options';

export interface TourBatchIngestor {
  /**
   * 수집 전체를 조율하고 저장 결과를 집계한다.
   *
   * 입력: options: 초기 목록/증분/행사/상세/기준정보 모드와 지역·페이지 조건.
   * @returns 완료 보고서. 실패하면 부분 집계를 가진 IngestionRunError를 던진다.
   * @example
   * await service.run({ mode: "initial", pageSize: 20, startPage: 1, maxPages: 1, listOnly: true });
   *
   * 락 확보 → 스키마 확인 → 분류·지역 준비 → 목록 저장 → 선택적 상세 저장 순서다. 매핑 오류는 skipped, 지원하지 않는 타입은
   * ignored로 구분한다.
   */
  run(options: IngestionOptions): Promise<IngestionReport>;
}
export interface TourBatchLog {
  /**
   * 지정 수준(log)으로 처리 로그를 남기는 계약이다.
   *
   * 입력: message: 안전하게 정리한 문자열. 호출부에서 JSON.stringify한 구조화 로그를 주로 전달한다.
   * @returns 없음(void).
   * @example
   * logger.log(JSON.stringify({event:"example_event"}));
   *
   * 인증키나 원본 접속 설정을 message에 넣지 않는다.
   */
  log(message: string): void;

  /**
   * 지정 수준(warn)으로 처리 로그를 남기는 계약이다.
   *
   * 입력: message: 안전하게 정리한 문자열. 호출부에서 JSON.stringify한 구조화 로그를 주로 전달한다.
   * @returns 없음(void).
   * @example
   * logger.warn(JSON.stringify({event:"example_event"}));
   *
   * 인증키나 원본 접속 설정을 message에 넣지 않는다.
   */
  warn(message: string): void;

  /**
   * 지정 수준(error)으로 처리 로그를 남기는 계약이다.
   *
   * 입력: message: 안전하게 정리한 문자열. 호출부에서 JSON.stringify한 구조화 로그를 주로 전달한다.
   * @returns 없음(void).
   * @example
   * logger.error(JSON.stringify({event:"example_event"}));
   *
   * 인증키나 원본 접속 설정을 message에 넣지 않는다.
   */
  error(message: string): void;
}
export interface TourBatchResult {
  /** completed=완료, failed=실패, skipped=중복 실행 등으로 시작하지 않음. */
  status: 'completed' | 'failed' | 'skipped';
  /** 실패/건너뜀을 설명할 짧은 코드. */
  reason?: string;
  /** 수집이 시작되었다면 처리 건수와 진행 페이지가 있는 보고서. */
  report?: IngestionReport;
}
export interface TourBatchTask {
  /**
   * 마지막 성공 날짜를 기준으로 일일 증분 수집을 실행한다.
   *
   * 입력: 인자 없음. 주입된 config, state, createRun, now를 사용한다.
   * @returns {status, reason?, report?}. 중복이면 skipped, 실패하면 failed.
   * @example
   * await runner.run(); // 예: { status: "completed", report: ... }
   *
   * 수집 누락·건너뜀·미처리 페이지가 없을 때만 성공 날짜를 저장한다. 실패 시 이전 기준을 유지한다.
   */
  run(): Promise<TourBatchResult>;
}
export interface TourBatchCommands extends TourBatchTask {
  /**
   * HTTP에서 받은 조건으로 한 번 수집한다.
   *
   * 입력: options: 선택적 수집 옵션. parseManualOptions로 기본값과 숫자·불리언을 보정한다.
   * @returns 완료·실패·중복 실행 상태와 수집 보고서.
   * @example
   * await runner.runManual({ mode: "initial", maxPages: 1, listOnly: true });
   *
   * 일일 배치의 마지막 성공 날짜는 바꾸지 않는다. API 호출과 DB 저장은 수행한다.
   */
  runManual(options?: Partial<IngestionOptions>): Promise<TourBatchResult>;
}
export class TourBatchRunner implements TourBatchCommands {
  private running = false;

  /**
   * TourBatchRunner 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: config: 요청 제한 또는 배치 실행 설정; state: 성공 날짜 읽기/저장 기능; createRun: 매 수집 시 새 수집 서비스를 만드는
   * 함수; logger: 처리 로그 기록기; now: 현재 시각을 반환하는 함수(기본 현재 Date); parseManualOptions: HTTP 수집
   * 옵션 보정 함수
   * @returns new로 생성한 TourBatchRunner 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourBatchRunner(config, state, createRun, logger, now, parseManualOptions)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourBatchRunner(config, state, createRun, logger, now, parseManualOptions);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly config: TourBatchConfig,
    private readonly state: TourBatchStateStore,
    private readonly createRun: () => TourBatchIngestor,
    private readonly logger: TourBatchLog,

    /**
     * 현재 시각을 공급하는 기본 시계다.
     *
     * 입력: 인자 없음. 필요하면 테스트에서 고정 시각 함수로 교체한다.
     * @returns 호출 순간의 Date 객체.
     * @example
     * // () => new Date("2026-10-26T00:00:00Z")로 바꾸면 동일 시각 기준으로 검증 가능
     */
    private readonly now: () => Date = () => new Date(),
    private readonly parseManualOptions: ManualOptionsParser = manualIngestionOptions,
  ) {}

  /**
   * 마지막 성공 날짜를 기준으로 일일 증분 수집을 실행한다.
   *
   * 입력: 인자 없음. 주입된 config, state, createRun, now를 사용한다.
   * @returns {status, reason?, report?}. 중복이면 skipped, 실패하면 failed.
   * @example
   * await runner.run(); // 예: { status: "completed", report: ... }
   *
   * 수집 누락·건너뜀·미처리 페이지가 없을 때만 성공 날짜를 저장한다. 실패 시 이전 기준을 유지한다.
   */
  async run(): Promise<TourBatchResult> {
    if (this.running) {
      const reason = 'LOCAL_RUN_IN_PROGRESS';
      this.logger.warn(JSON.stringify({ event: 'tour_batch_skipped', reason }));
      return { status: 'skipped', reason };
    }
    this.running = true;
    let report: IngestionReport | undefined;
    try {
      const date = seoulDate(this.now());
      const previous = await this.state.read();
      let modifiedSince = shiftDate(date, -this.config.lookbackDays);
      if (previous?.scope === this.config.scope) {
        if (previous.lastSuccessfulDate > date)
          throw new TourBatchStateError('CHECKPOINT_IN_FUTURE');
        // 성공 날짜보다 하루 전까지 겹쳐 조회한다. 실패한 실행은 마지막 성공 기준을 바꾸지 않는다.
        const prior = shiftDate(previous.lastSuccessfulDate, -1);
        if (prior < modifiedSince) modifiedSince = prior;
      }
      this.logger.log(
        JSON.stringify({
          event: 'tour_batch_started',
          date,
          modifiedSince,
          scope: this.config.scope,
        }),
      );
      report = await this.createRun().run({
        ...this.config.options,
        modifiedSince,
      });
      if (
        report.status !== 'completed' ||
        report.skipped > 0 ||
        Object.values(report.nextPages).some(
          /**
           * 남은 페이지가 하나라도 있는지 판정한다.
           *
           * 입력: page: 분할 목록의 다음 페이지 번호 또는 null.
           * @returns 아직 다음 페이지가 있으면 true.
           * @example
           * // page=2 → true, page=null → false
           */
          (page) => page !== null,
        )
      ) {
        throw new TourBatchStateError('INCOMPLETE_COLLECTION');
      }
      await this.state.write({
        version: 1,
        scope: this.config.scope,
        lastSuccessfulDate: date,
      });
      this.logger.log(
        JSON.stringify({ event: 'tour_batch_completed', date, report }),
      );
      return { status: 'completed', report };
    } catch (error) {
      return this.failed('tour_batch', error, report);
    } finally {
      this.running = false;
    }
  }

  /**
   * HTTP에서 받은 조건으로 한 번 수집한다.
   *
   * 입력: options: 선택적 수집 옵션. parseManualOptions로 기본값과 숫자·불리언을 보정한다.
   * @returns 완료·실패·중복 실행 상태와 수집 보고서.
   * @example
   * await runner.runManual({ mode: "initial", maxPages: 1, listOnly: true });
   *
   * 일일 배치의 마지막 성공 날짜는 바꾸지 않는다. API 호출과 DB 저장은 수행한다.
   */
  async runManual(
    options?: Partial<IngestionOptions>,
  ): Promise<TourBatchResult> {
    if (this.running) {
      const reason = 'LOCAL_RUN_IN_PROGRESS';
      this.logger.warn(
        JSON.stringify({ event: 'tour_manual_skipped', reason }),
      );
      return { status: 'skipped', reason };
    }
    this.running = true;
    let report: IngestionReport | undefined;
    try {
      const targetOptions = this.parseManualOptions(options);
      this.logger.log(
        JSON.stringify({
          event: 'tour_manual_started',
          options: targetOptions,
        }),
      );
      report = await this.createRun().run(targetOptions);
      if (report.status !== 'completed') {
        throw new TourBatchStateError('INCOMPLETE_COLLECTION');
      }
      this.logger.log(
        JSON.stringify({ event: 'tour_manual_completed', report }),
      );
      return { status: 'completed', report };
    } catch (error) {
      return this.failed('tour_manual', error, report);
    } finally {
      this.running = false;
    }
  }

  /**
   * 수집 중 발생한 예외를 로그와 응답 상태로 바꾼다.
   *
   * 입력: prefix: 일일/수동 로그 구분, error: 잡힌 예외, report: 있으면 부분 집계.
   * @returns 락 충돌이면 skipped, 그 외에는 failed인 TourBatchResult.
   * @example
   * // INGESTION_ALREADY_RUNNING 보고서 → status: "skipped"
   *
   * 원본 오류나 인증키를 그대로 출력하지 않고 정해진 사유와 보고서를 기록한다.
   */
  private failed(
    prefix: 'tour_batch' | 'tour_manual',
    error: unknown,
    report?: IngestionReport,
  ): TourBatchResult {
    if (error instanceof IngestionRunError) report = error.report;
    const locked =
      error instanceof IngestionRunError &&
      report?.error === new TourStoreError('INGESTION_ALREADY_RUNNING').message;
    const reason = locked
      ? 'INGESTION_ALREADY_RUNNING'
      : error instanceof TourBatchStateError || error instanceof TourApiError
        ? error.code
        : 'COLLECTION_FAILED';
    const status = locked ? 'skipped' : 'failed';
    this.logger[locked ? 'warn' : 'error'](
      JSON.stringify({ event: `${prefix}_${status}`, reason, report }),
    );
    return { status, reason, report };
  }
}

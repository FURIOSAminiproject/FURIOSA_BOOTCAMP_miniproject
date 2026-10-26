/**
 * 예약 시간 연결 담당. 시작 로그와 실제 실행 로그는 서로 다른 의미다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TOUR_BATCH_CRON, TOUR_BATCH_TIME_ZONE } from './tour-batch.config';
import type { TourBatchLog, TourBatchTask } from './tour-batch.runner';

export class TourBatchScheduler implements OnApplicationBootstrap {
  /**
   * TourBatchScheduler 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: task: 예약 수집 실행 기능; logger: 처리 로그 기록기
   * @returns new로 생성한 TourBatchScheduler 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // TourBatchScheduler(task, logger)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new TourBatchScheduler(task, logger);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly task: TourBatchTask,
    private readonly logger: TourBatchLog,
  ) {}

  /**
   * 서버 시작 시 등록된 배치 시간표를 로그로 남긴다.
   *
   * 입력: 인자 없음. 미리 정해 둔 cron과 한국 시간대를 사용한다.
   * @returns 없음(void). 스케줄 등록 안내 로그만 기록한다.
   * @example
   * // 서버 시작 → tour_batch_scheduled, cron="0 0 1 * * *"
   *
   * 이 로그는 수집 성공 로그가 아니다. 시작 직후 수집을 실행하지 않는다.
   */
  onApplicationBootstrap(): void {
    this.logger.log(
      JSON.stringify({
        event: 'tour_batch_scheduled',
        cron: TOUR_BATCH_CRON,
        timeZone: TOUR_BATCH_TIME_ZONE,
      }),
    );
  }

  /**
   * 예약된 한국 시간 새벽 1시에 수집 작업을 실행한다.
   *
   * 입력: 인자 없음. Nest의 @Cron이 호출한다.
   * @returns 작업 종료 후 이행되는 Promise<void>. 결과 집계는 runner가 로그로 남긴다.
   * @example
   * // 매일 01:00 Asia/Seoul → await task.run()
   *
   * waitForCompletion으로 이 예약 작업의 중복 실행을 막는다.
   */
  @Cron(TOUR_BATCH_CRON, {
    name: 'tour-daily-collection',
    timeZone: TOUR_BATCH_TIME_ZONE,
    waitForCompletion: true,
  })
  async collect(): Promise<void> {
    await this.task.run();
  }
}

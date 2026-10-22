import type { OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { TOUR_BATCH_CRON, TOUR_BATCH_TIME_ZONE } from './tour-batch.config';
import type { TourBatchLog, TourBatchTask } from './tour-batch.runner';

export class TourBatchScheduler implements OnApplicationBootstrap {
  constructor(private readonly task: TourBatchTask, private readonly logger: TourBatchLog) {}
  onApplicationBootstrap(): void {
    this.logger.log(JSON.stringify({ event:'tour_batch_scheduled', cron:TOUR_BATCH_CRON, timeZone:TOUR_BATCH_TIME_ZONE }));
  }
  @Cron(TOUR_BATCH_CRON, { name:'tour-daily-collection', timeZone:TOUR_BATCH_TIME_ZONE, waitForCompletion:true })
  async collect(): Promise<void> { await this.task.run(); }
}

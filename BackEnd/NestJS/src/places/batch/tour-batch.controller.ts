import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { TourBatchRunner } from './tour-batch.runner';
import type { TourBatchResult } from './tour-batch.runner';

@Controller('places/batch')
export class TourBatchController {
  constructor(@Inject(TourBatchRunner) private readonly runner: TourBatchRunner) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runBatch(): Promise<TourBatchResult> {
    return await this.runner.run();
  }
}

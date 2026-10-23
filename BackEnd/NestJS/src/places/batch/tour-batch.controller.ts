import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Query } from '@nestjs/common';
import { TourBatchRunner } from './tour-batch.runner';
import type { TourBatchResult } from './tour-batch.runner';
import type { IngestionOptions } from '../tour-ingestion.options';

@Controller(['places/batch', 'places'])
export class TourBatchController {
  constructor(@Inject(TourBatchRunner) private readonly runner: TourBatchRunner) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  async runBatch(@Body() body?: Partial<IngestionOptions>): Promise<TourBatchResult> {
    if (body && (body.mode === 'initial' || body.maxPages !== undefined || body.listOnly !== undefined)) {
      return await this.runner.runManual(body);
    }
    return await this.runner.run();
  }

  @Post(['initial', 'ingest'])
  @HttpCode(HttpStatus.OK)
  async runInitialPost(
    @Body() body?: Partial<IngestionOptions>,
    @Query() query?: Partial<IngestionOptions>,
  ): Promise<TourBatchResult> {
    return await this.runner.runManual({ mode: 'initial', ...query, ...body });
  }

  @Get(['initial', 'ingest'])
  @HttpCode(HttpStatus.OK)
  async runInitialGet(@Query() query?: Partial<IngestionOptions>): Promise<TourBatchResult> {
    return await this.runner.runManual({ mode: 'initial', ...query });
  }
}

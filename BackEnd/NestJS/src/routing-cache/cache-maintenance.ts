import type { OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CacheDatabase } from './cache-database';
import { safeDiagnostics } from './routing.errors';
import type { RoutingLog } from './routing.types';

export class CacheMaintenance implements OnApplicationBootstrap {
  private running = false;
  constructor(
    private readonly db: CacheDatabase,
    private readonly logger: RoutingLog,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'routing_cache_cleanup_scheduled',
        cron: '0 * * * * *',
        timeZone: 'Asia/Seoul',
        batchLimitPerTable: 1000,
      }),
    );
    try {
      const missing = (await this.db.schema()).filter(
        (table) => table.missingColumns.length,
      );
      if (missing.length) {
        this.logger.error(
          JSON.stringify({
            event: 'routing_cache_schema_missing',
            code: 'CACHE_SCHEMA_REQUIRED',
            missing,
          }),
        );
        return;
      }
      this.logger.log(JSON.stringify({ event: 'routing_cache_schema_ready' }));
      await this.cleanup();
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'routing_cache_schema_check_failed',
          ...safeDiagnostics(error),
        }),
      );
    }
  }
  @Cron('0 * * * * *', {
    name: 'routing-cache-expiration',
    timeZone: 'Asia/Seoul',
    waitForCompletion: true,
  })
  async cleanup(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const started = Date.now();
    try {
      const counts = await this.db.cleanup(this.now());
      this.logger.log(
        JSON.stringify({
          event: 'routing_cache_cleanup_completed',
          ...counts,
          durationMs: Date.now() - started,
        }),
      );
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: 'routing_cache_cleanup_failed',
          ...safeDiagnostics(error),
        }),
      );
    } finally {
      this.running = false;
    }
  }
}

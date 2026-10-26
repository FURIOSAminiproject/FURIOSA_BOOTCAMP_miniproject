/**
 * 경로 캐시 스키마 확인과 만료 행 삭제 스케줄 담당. ORS 사전 수집이나 주기적 경로 갱신은 하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { CacheMaintenanceStore } from './routing.ports';
import { ORS_CACHE_POLICY } from './routing.policy';
import { safeDiagnostics } from './routing.errors';
import type { RoutingLog } from './routing.types';

export class CacheMaintenance implements OnApplicationBootstrap {
  private running = false;

  /**
   * CacheMaintenance 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: store: 캐시 읽기/저장 또는 정리 기능(타입 참고); logger: 처리 로그 기록기; now: 현재 시각을 반환하는 함수(기본 현재
   * Date)
   * @returns new로 생성한 CacheMaintenance 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // CacheMaintenance(store, logger, now)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new CacheMaintenance(store, logger, now);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly store: CacheMaintenanceStore,
    private readonly logger: RoutingLog,

    /**
     * 현재 시각을 공급하는 기본 시계다.
     *
     * 입력: 인자 없음. 필요하면 테스트에서 고정 시각 함수로 교체한다.
     * @returns 호출 순간의 Date 객체.
     * @example
     * // () => new Date("2026-10-26T00:00:00Z")로 바꾸면 동일 시각 기준으로 검증 가능
     */
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * 서버 시작 시 캐시 스키마를 검사하고 첫 만료 정리를 실행한다.
   *
   * 입력: 인자 없음. 주입된 저장소와 캐시 정책을 사용한다.
   * @returns Promise<void>. 누락 구조·검사 실패는 로그에 기록한다.
   * @example
   * // 스키마 정상 → routing_cache_schema_ready → cleanup()
   *
   * DDL은 실행하지 않으며 API 경로 데이터도 미리 수집하지 않는다.
   */
  async onApplicationBootstrap(): Promise<void> {
    this.logger.log(
      JSON.stringify({
        event: 'routing_cache_cleanup_scheduled',
        cron: ORS_CACHE_POLICY.cleanupCron,
        timeZone: ORS_CACHE_POLICY.timeZone,
        batchLimitPerTable: ORS_CACHE_POLICY.cleanupLimit,
      }),
    );
    try {
      const missing = (await this.store.schema()).filter(
        /**
         * 필요한 컬럼이 빠진 테이블만 고른다.
         *
         * 입력: table: 스키마 검사 결과 한 건.
         * @returns 누락 컬럼 수. filter는 0이면 제외하고 1 이상이면 남긴다.
         * @example
         * // missingColumns=[] → 제외; ["expires_at"] → 남김
         */
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

  /**
   * 매분 만료된 경로 캐시를 정리하고 삭제 수를 로그로 남긴다.
   *
   * 입력: 인자 없음. now()가 정리 기준 시각을 제공한다.
   * @returns Promise<void>. 이미 실행 중이면 바로 종료한다.
   * @example
   * // 만료 행 3건 삭제 → orsDeleted:3 로그
   *
   * 삭제만 수행한다. ORS 재호출은 해당 경로의 다음 사용자 요청 때 일어난다. 실패해도 running을 해제한다.
   */
  @Cron(ORS_CACHE_POLICY.cleanupCron, {
    name: 'routing-cache-expiration',
    timeZone: ORS_CACHE_POLICY.timeZone,
    waitForCompletion: true,
  })
  async cleanup(): Promise<void> {
    if (this.running) return;
    this.running = true;
    const started = Date.now();
    try {
      const counts = await this.store.cleanup(this.now());
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

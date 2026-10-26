/**
 * CLI와 배치가 동일한 수집 서비스를 쓰게 하는 조립 함수. 새 정책은 여기서 주입한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { TourIngestionService } from './tour-ingestion.service';
import { TourReferenceService } from './tour-reference.service';
import { TourDetailService } from './tour-detail.service';
import {
  TourListPlans,
  DEFAULT_LIST_STRATEGIES,
  type ListStrategy,
} from './tour-list-plans';
import type { DetailStep } from './tour-detail.plan';

import type {
  CategoryWriter,
  DetailReader,
  IngestionGate,
  PlaceWriter,
  ReferenceReader,
  RequestMetrics,
} from './tour-ingestion.ports';

export interface TourRunPolicies {
  /** 선택적 목록 조회 전략. 생략하면 initial/sync/festivals 기본 전략. */
  listStrategies?: readonly ListStrategy[];
  /** 선택적 상세 API 순서·파라미터 정책. 필수 세 단계는 모두 유지해야 한다. */
  detailSteps?: readonly DetailStep[];
  /** 인자 없음 → Date. 상세 수집 시각 공급 함수. 예: () => new Date("2026-10-26T00:00:00Z"). */
  now?: () => Date;
}
// CLI와 배치가 공유하는 조립 함수다. 호출자는 실행마다 새 API 클라이언트를 전달한다.

/**
 * CLI와 배치가 공유하는 장소 수집 서비스를 조립한다.
 *
 * 입력: api: 매 실행마다 새 API 클라이언트, gate: 락/스키마 검사, categories/places: 저장기, policies: 선택적
 * 목록·상세·시계 정책.
 * @returns 연결을 마친 TourIngestionService. 여기서는 run()을 실행하지 않는다.
 * @example
 * const run = createTourRun(api, gate, categories, places);
 * // 이후 await run.run(options)로 실제 수집 시작
 *
 * 구현을 교체할 때 이 조립 지점에 주입한다. 기본 정책을 생략하면 기존 동작을 유지한다.
 */
export function createTourRun(
  api: DetailReader & ReferenceReader & RequestMetrics,
  gate: IngestionGate,
  categories: CategoryWriter,
  places: PlaceWriter,
  policies: TourRunPolicies = {},
): TourIngestionService {
  return new TourIngestionService({
    api,
    gate,
    places,
    references: new TourReferenceService(api, categories),
    details: new TourDetailService(api, policies.detailSteps, policies.now),
    plans: new TourListPlans(
      policies.listStrategies ?? DEFAULT_LIST_STRATEGIES,
    ),
  });
}

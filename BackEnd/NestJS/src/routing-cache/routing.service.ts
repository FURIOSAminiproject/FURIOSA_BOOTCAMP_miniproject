/**
 * 검증된 경로 요청의 조율 담당. 좌표 해석 → 캐시 조회 → 응답 조립 순서이며 실시간 정체는 적용하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import type { PointResolver, RouteLookup, RoutePlanner } from './routing.ports';
import type { OrsRequest, RouteRequest, RouteResponse } from './routing.types';
export class RoutingService implements RoutePlanner {
  /**
   * RoutingService 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: resolver: 지점 ID를 위도/경도로 바꾸는 기능; routes: ORS 경로 캐시 조회 기능
   * @returns new로 생성한 RoutingService 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // RoutingService(resolver, routes)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new RoutingService(resolver, routes);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly resolver: PointResolver,
    private readonly routes: RouteLookup,
  ) {}

  /**
   * 좌표 해석·ORS 캐시 조회·최종 경로 응답 조립을 조율한다.
   *
   * 입력: request: 검증된 자동차/도보 모드, 경로 선호도, 순서가 있는 지점 목록.
   * @returns RouteResponse. 거리 m, 시간 초, 지도 선, 구간 시간, 캐시 시각 등을 포함한다.
   * @example
   * // durationSeconds=625.3이면 약 10분 25초. trafficApplied=false
   *
   * 위도/경도 객체를 ORS의 [경도, 위도] 배열로 바꾼다. calculatedAt은 캐시 최초 수집 시각이며 실시간 교통 정체는 반영하지 않는다.
   */
  async route(request: RouteRequest): Promise<RouteResponse> {
    // 1. UUID 입력은 DB 좌표로, 직접 좌표 입력은 그대로 통일한다.
    const points = await this.resolver.resolve(request.points);
    // 2. 같은 조건이 같은 캐시 키를 쓰도록 ORS 요청 형식을 고정한다.
    const canonical: OrsRequest = {
      contractVersion: 2,
      profile: request.mode === 'driving' ? 'driving-car' : 'foot-walking',
      preference: request.preference,
      coordinates: points.map(
        /**
         * 위도/경도 객체를 ORS 배열 순서로 바꾼다.
         *
         * 입력: point: 검증된 위도·경도 객체.
         * @returns [longitude,latitude] 배열.
         * @example
         * // {latitude:35.1,longitude:128.9} → [128.9,35.1]
         */
        (point) => [point.longitude, point.latitude],
      ),
      units: 'm',
      instructions: true,
    };
    // 3. 유효 캐시를 우선 조회하고, 없을 때만 ORS 호출과 DB 저장을 수행한다.
    const result = await this.routes.get(canonical);
    // 4. 경로 데이터에 요청 조건과 캐시 출처 정보를 붙여 HTTP 응답을 만든다.
    return {
      mode: request.mode,
      preference: request.preference,
      points,
      ...result.data,
      trafficApplied: false,
      cacheId: result.cacheId,
      cached: result.cached,
      fetchedAt: result.fetchedAt,
      expiresAt: result.expiresAt,
      calculatedAt: result.fetchedAt,
    };
  }
}

/**
 * POST /api/routes 진입점. JSON 검증 후 경로 서비스를 호출한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { RoutingService } from './routing.service';
import type { RoutePlanner } from './routing.ports';
import { routeRequest } from './routing.validation';

@Controller()
export class RoutingController {
  /**
   * RoutingController 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: service: 경로 조회 업무 기능
   * @returns new로 생성한 RoutingController 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // RoutingController(service)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new RoutingController(service);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(@Inject(RoutingService) private readonly service: RoutePlanner) {}

  /**
   * POST /api/routes의 원본 JSON을 검사하고 경로를 조회한다.
   *
   * 입력: body: mode, preference(선택), points(2~10개)인 요청 JSON.
   * @returns 거리·시간·지도 선·구간 시간·캐시 정보가 있는 RouteResponse.
   * @example
   * // body: {mode:"driving",points:[{longitude:128.95,latitude:35.1},{longitude:128.97,latitude:35.05}]}
   * // → 200, distanceMeters / durationSeconds 등 반환
   *
   * 캐시가 없으면 ORS 호출과 DB 저장이 일어난다. 인증키를 프런트에서 보낼 필요는 없다.
   */
  @Post('routes')
  @HttpCode(200)
  route(@Body() body: unknown) {
    return this.service.route(routeRequest(body));
  }
}

/**
 * ORS 경로 HTTP 요청 담당. 데이터 변환은 mapper, 캐시 저장은 coordinator/repository가 처리한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { providerConfig, providerJson } from './provider-http';
import { parseOrs } from './ors-response.mapper';
import type { DataProvider, OrsRequest, RouteData } from './routing.types';
export class OrsProvider implements DataProvider<OrsRequest, RouteData> {
  /**
   * OrsProvider 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: env: API 환경변수(기본 process.env); transport: 교체 가능한 HTTP fetch 함수(기본 전역 fetch)
   * @returns new로 생성한 OrsProvider 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // OrsProvider(env, transport)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new OrsProvider(env, transport);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: typeof fetch = fetch,
  ) {}

  /**
   * 자동차/도보 프로필에 맞는 ORS GeoJSON 주소를 만든다.
   *
   * 입력: request: profile이 driving-car 또는 foot-walking인 요청.
   * @returns 고정 HeiGIT HTTPS 호스트의 directions URL 문자열.
   * @example
   * // profile="foot-walking" → https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson
   *
   * 인증키나 좌표는 URL에 붙이지 않는다. 이 함수 자체는 HTTP 요청을 보내지 않는다.
   */
  sourceUrl(request: OrsRequest): string {
    return `https://api.heigit.org/openrouteservice/v2/directions/${request.profile}/geojson`;
  }

  /**
   * ORS에 경로를 POST로 요청하고 검증된 결과를 돌려준다.
   *
   * 입력: request: 좌표 배열·프로필·선호도·미터 단위·안내 요청 조건.
   * @returns parseOrs가 변환하고 검증한 RouteData.
   * @example
   * await provider.fetch(request); // geometry, distanceMeters, durationSeconds 등
   *
   * 인증은 Authorization 헤더로 보낸다. HTTP 오류·타임아웃·응답 오류는 providerJson에서 구분하며 여기서는 DB에 저장하지 않는다.
   */
  async fetch(request: OrsRequest): Promise<RouteData> {
    const config = providerConfig('ORS', this.env);
    const body = {
      coordinates: request.coordinates,
      preference: request.preference,
      units: request.units,
      instructions: request.instructions,
    };
    return parseOrs(
      await providerJson(
        'ORS',
        this.sourceUrl(request),
        {
          method: 'POST',
          headers: {
            Authorization: config.key,
            'Content-Type': 'application/json',
            Accept: 'application/geo+json',
          },
          body: JSON.stringify(body),
        },
        config.timeoutMs,
        this.transport,
      ),
    );
  }
}

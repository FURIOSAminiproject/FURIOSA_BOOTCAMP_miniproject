/**
 * 입력 지점 해석 담당. 내부 장소 UUID 또는 직접 좌표를 실제 위도/경도로 통일한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { RoutingError } from './routing.errors';
import { coordinate } from './routing.validation';
import type {
  PlaceCoordinateReader,
  PlaceCoordinateRecord,
  PointResolver,
} from './routing.ports';
import type { ResolvedPoint, RoutePoint } from './routing.types';
export class RoutePointResolver implements PointResolver {
  /**
   * RoutePointResolver 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: places: 장소 저장기 또는 활성 장소 좌표 조회기(선언된 타입 참고)
   * @returns new로 생성한 RoutePointResolver 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // RoutePointResolver(places)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new RoutePointResolver(places);
   *
   * 생성자에 전달하는 인증 설정은 출력하지 않는다. 실제 수집·조회는 해당 실행 메서드에서 시작한다.
   */
  constructor(private readonly places: PlaceCoordinateReader) {}

  /**
   * 장소 ID와 직접 입력한 좌표를 모두 실제 좌표로 맞춘다.
   *
   * 입력: points: 검증된 장소 UUID 또는 위도/경도 배열. 입력 순서가 이동 순서다.
   * @returns 같은 순서·개수의 ResolvedPoint[]. 직접 좌표의 placeId는 null.
   * @example
   * await resolver.resolve([{latitude:35.1,longitude:128.9}]); // [{latitude:35.1,longitude:128.9,placeId:null}]
   *
   * 장소 ID만 중복을 제거해 조회한다. 없는 장소는 404, 좌표 없는 장소는 422, DB 조회 실패는 503이다.
   */
  async resolve(points: RoutePoint[]): Promise<ResolvedPoint[]> {
    const ids = [
      ...new Set(
        points.flatMap(
          /**
           * 장소 ID가 있는 지점에서만 조회할 UUID를 꺼낸다.
           *
           * 입력: point: UUID 방식 또는 직접 좌표 방식의 지점.
           * @returns placeId가 있으면 [ID], 좌표만 있으면 [].
           * @example
           * // {latitude:35.1,longitude:128.9} → [] (DB 조회 대상 아님)
           */
          (point) => ('placeId' in point ? [point.placeId] : []),
        ),
      ),
    ];
    let rows: PlaceCoordinateRecord[] = [];
    if (ids.length) {
      try {
        rows = await this.places.findActive(ids);
      } catch {
        throw new RoutingError(
          503,
          'PLACES_UNAVAILABLE',
          '장소 좌표를 조회하지 못했습니다.',
        );
      }
    }
    const byId = new Map(
      rows.map(
        /**
         * 조회한 장소를 UUID로 빠르게 찾을 Map 항목으로 만든다.
         *
         * 입력: row: 활성 장소 좌표 행.
         * @returns [placeId,row] 쌍.
         * @example
         * // 행의 placeId가 UUID라면 byId.get(UUID)로 같은 행 조회
         */
        (row) => [row.placeId, row],
      ),
    );
    return points.map(
      /**
       * 입력 순서를 유지하며 지점을 실제 숫자 좌표로 변환한다.
       *
       * 입력: point: 입력 지점. 바깥 byId는 DB 조회 결과다.
       * @returns placeId와 숫자 latitude/longitude인 ResolvedPoint.
       * @example
       * // DB latitude="35.1" → 숫자 35.1; 직접 좌표는 placeId=null
       *
       * 장소가 없거나 좌표가 잘못되면 즉시 오류를 던진다.
       */
      (point) => {
        if (!('placeId' in point)) return { ...point, placeId: null };
        const row = byId.get(point.placeId);
        if (!row)
          throw new RoutingError(
            404,
            'PLACE_NOT_FOUND',
            '활성 장소를 찾지 못했습니다.',
          );
        const latitude = row.latitude === null ? null : Number(row.latitude),
          longitude = row.longitude === null ? null : Number(row.longitude);
        if (!coordinate(latitude, 90) || !coordinate(longitude, 180))
          throw new RoutingError(
            422,
            'PLACE_COORDINATES_MISSING',
            '장소의 경로 계산용 좌표가 없습니다.',
          );
        return { placeId: point.placeId, latitude, longitude };
      },
    );
  }
}

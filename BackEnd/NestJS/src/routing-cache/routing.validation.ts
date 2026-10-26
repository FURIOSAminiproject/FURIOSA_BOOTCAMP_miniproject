/**
 * 클라이언트 경로 요청 검증 담당. HTTP 응답/DB 저장 이전에 허용 필드와 좌표 범위를 확인한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { invalid, object } from './routing.errors';
import type { RoutePoint, RouteRequest } from './routing.types';

/**
 * 좌표가 허용 범위 안의 실제 숫자인지 검사한다.
 *
 * 입력: value: 원본 값, limit: 위도는 90, 경도는 180.
 * @returns 유한한 number이고 절댓값이 limit 이하면 true.
 * @example
 * coordinate(35.1, 90); // true
 * coordinate("35.1", 90); // false
 * coordinate(181, 180); // false
 */
export function coordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}

/**
 * 원본 경로 JSON의 허용 필드·모드·좌표·UUID를 검사한다.
 *
 * 입력: body: 클라이언트가 보낸 아직 신뢰하지 않는 JSON.
 * @returns 기본 preference=recommended를 적용한 RouteRequest. 잘못되면 HTTP 400.
 * @example
 * routeRequest({mode:"walking",points:[{latitude:35.1,longitude:128.9},{latitude:35.2,longitude:129}]});
 *
 * 지점은 2~10개. 각 지점은 placeId만 있거나 latitude/longitude만 있어야 하며 두 방식의 혼합 필드는 거절한다.
 */
export function routeRequest(body: unknown): RouteRequest {
  if (
    !object(body) ||
    Object.keys(body).some(
      /**
       * 허용하지 않은 최상위 요청 필드가 있는지 확인한다.
       *
       * 입력: key: body의 속성 이름.
       * @returns mode/preference/points가 아니면 true.
       * @example
       * // "speed" → true이므로 요청 거절
       */
      (key) => !['mode', 'preference', 'points'].includes(key),
    )
  )
    return invalid('body');
  if (body.mode !== 'driving' && body.mode !== 'walking')
    return invalid('mode');
  const preference =
    body.preference === undefined ? 'recommended' : body.preference;
  if (preference !== 'recommended' && preference !== 'shortest')
    return invalid('preference');
  if (
    !Array.isArray(body.points) ||
    body.points.length < 2 ||
    body.points.length > 10
  )
    return invalid('points (2~10개)');
  const points: RoutePoint[] = body.points.map(
    /**
     * 경로 지점 한 건의 형태와 값 범위를 검사한다.
     *
     * 입력: point: 원본 지점, index: 배열 위치(0부터).
     * @returns 소문자 placeId 객체 또는 숫자 위도/경도 객체.
     * @example
     * // {placeId:"대문자 UUID"} → 소문자 UUID; {latitude:"35.1",longitude:128.9} → 오류
     *
     * 추가 속성이나 UUID+좌표 혼합은 허용하지 않는다.
     */
    (point: unknown, index: number) => {
      if (!object(point)) return invalid(`points[${index}]`);
      if (Object.hasOwn(point, 'placeId')) {
        if (
          Object.keys(point).length !== 1 ||
          typeof point.placeId !== 'string' ||
          !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(point.placeId)
        )
          return invalid(`points[${index}].placeId`);
        return { placeId: point.placeId.toLowerCase() };
      }
      if (
        Object.keys(point).length !== 2 ||
        !coordinate(point.latitude, 90) ||
        !coordinate(point.longitude, 180)
      )
        return invalid(`points[${index}]`);
      return { latitude: point.latitude, longitude: point.longitude };
    },
  );
  return { mode: body.mode, preference, points };
}

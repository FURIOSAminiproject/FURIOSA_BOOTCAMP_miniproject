/**
 * ORS GeoJSON → 서비스 경로 데이터 변환/검증 담당. DB 캐시에도 같은 검증을 적용한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { finite, object, providerError } from './routing.errors';
import { coordinate } from './routing.validation';
import type { Coordinate, RouteData, TimeSpan } from './routing.types';

/**
 * 거리·시간·경로 좌표와 구간 연결이 일관적인지 검사한다.
 *
 * 입력: data: API에서 변환했거나 DB에서 꺼낸 아직 신뢰하지 않는 값.
 * @returns 불필요한 필드를 제외한 RouteData. 잘못되면 ORS 응답 형식 오류.
 * @example
 * // 좌표 3개면 구간의 toIndex는 최대 2다. [0→1, 1→2]는 연속 구간이다.
 *
 * 좌표 범위·유한한 음수 아닌 거리/시간·구간 연속성·합계 시간 허용오차를 확인한다. 단위는 m, 초다.
 */
export function validateRouteData(data: unknown): RouteData {
  /**
   * 현재 경로 데이터가 잘못되었다는 공통 예외를 던진다.
   *
   * 입력: 인자 없음.
   * @returns 정상 반환하지 않는다. PROVIDER_RESPONSE_INVALID 오류를 던진다.
   * @example
   * // 좌표가 [999, 35]이면 검증 도중 fail() 호출
   */
  const fail = () => {
    throw providerError('ORS');
  };
  if (
    !object(data) ||
    !finite(data.distanceMeters) ||
    !finite(data.durationSeconds) ||
    !object(data.geometry) ||
    data.geometry.type !== 'LineString' ||
    !Array.isArray(data.geometry.coordinates) ||
    data.geometry.coordinates.length < 2 ||
    data.geometry.coordinates.length > 200000 ||
    !Array.isArray(data.timeSpans) ||
    data.timeSpans.length === 0 ||
    !Array.isArray(data.warnings) ||
    (data.attribution !== null && typeof data.attribution !== 'string')
  )
    return fail();
  const coordinates: Coordinate[] = data.geometry.coordinates.map(
    /**
     * 경로의 좌표 한 쌍을 검사하고 새 배열로 복사한다.
     *
     * 입력: point: [경도,위도]로 예상되는 unknown 값.
     * @returns 검증된 Coordinate. 길이·숫자·범위가 잘못되면 fail().
     * @example
     * // [128.9,35.1] → [128.9,35.1]; [999,35] → 예외
     */
    (point: unknown) => {
      if (
        !Array.isArray(point) ||
        point.length !== 2 ||
        !coordinate(point[0], 180) ||
        !coordinate(point[1], 90)
      )
        return fail();
      return [point[0], point[1]];
    },
  );
  const timeSpans: TimeSpan[] = [];
  for (const span of data.timeSpans) {
    if (
      !object(span) ||
      !Number.isInteger(span.fromIndex) ||
      !Number.isInteger(span.toIndex) ||
      !finite(span.durationSeconds)
    )
      return fail();
    const from = span.fromIndex as number,
      to = span.toIndex as number;
    if (
      from !== (timeSpans.at(-1)?.toIndex ?? 0) ||
      to < from ||
      to >= coordinates.length ||
      (to === from && span.durationSeconds > 0)
    )
      return fail();
    timeSpans.push({
      fromIndex: from,
      toIndex: to,
      durationSeconds: span.durationSeconds,
    });
  }
  if (timeSpans.length) {
    const total = timeSpans.reduce(
      /**
       * 모든 경로 구간의 소요시간을 더한다.
       *
       * 입력: sum: 현재 합계 초, span: 다음 구간.
       * @returns sum+span.durationSeconds.
       * @example
       * // sum=10, span.durationSeconds=5.3 → 15.3
       */
      (sum, span) => sum + span.durationSeconds,
      0,
    );
    if (
      timeSpans.at(-1)!.toIndex !== coordinates.length - 1 ||
      Math.abs(total - data.durationSeconds) >
        Math.max(2, timeSpans.length * 0.11)
    )
      return fail();
  }
  const warnings = data.warnings.map(
    /**
     * ORS 경고의 코드·문자열 형식을 검사한다.
     *
     * 입력: warning: 원본 경고 객체.
     * @returns {code,message}. 정수 코드·문자열 메시지가 아니면 예외.
     * @example
     * // {code:1,message:"안내"} → 같은 두 필드만 반환
     */
    (warning: unknown) => {
      if (
        !object(warning) ||
        !Number.isInteger(warning.code) ||
        typeof warning.message !== 'string'
      )
        return fail();
      return { code: warning.code as number, message: warning.message };
    },
  );
  return {
    distanceMeters: data.distanceMeters,
    durationSeconds: data.durationSeconds,
    geometry: { type: 'LineString', coordinates },
    timeSpans,
    attribution: data.attribution as string | null,
    warnings,
  };
}

/**
 * ORS GeoJSON의 첫 경로를 서비스 공통 형식으로 변환한다.
 *
 * 입력: data: ORS의 FeatureCollection JSON 전체.
 * @returns 검증을 통과한 RouteData. 형식이 맞지 않으면 오류.
 * @example
 * // summary.distance=8383.3, duration=625.3 → distanceMeters=8383.3, durationSeconds=625.3
 *
 * steps.way_points는 geometry.coordinates의 인덱스다. 여러 feature 중 첫 번째를 선택하며 실시간 정체를 계산하지
 * 않는다.
 */
export function parseOrs(data: unknown): RouteData {
  if (
    !object(data) ||
    data.type !== 'FeatureCollection' ||
    !Array.isArray(data.features) ||
    !data.features.length
  )
    throw providerError('ORS');
  const feature = data.features[0];
  if (
    !object(feature) ||
    feature.type !== 'Feature' ||
    !object(feature.properties) ||
    !object(feature.properties.summary)
  )
    throw providerError('ORS');
  const segments = feature.properties.segments;
  if (!Array.isArray(segments) || !segments.length) throw providerError('ORS');
  const timeSpans: unknown[] = [];
  for (const segment of segments) {
    if (!object(segment) || !Array.isArray(segment.steps))
      throw providerError('ORS');
    for (const step of segment.steps) {
      if (
        !object(step) ||
        !Array.isArray(step.way_points) ||
        step.way_points.length !== 2
      )
        throw providerError('ORS');
      timeSpans.push({
        fromIndex: step.way_points[0],
        toIndex: step.way_points[1],
        durationSeconds: step.duration,
      });
    }
  }
  if (!timeSpans.length) throw providerError('ORS');
  if (data.metadata !== undefined && !object(data.metadata))
    throw providerError('ORS');
  return validateRouteData({
    distanceMeters: feature.properties.summary.distance,
    durationSeconds: feature.properties.summary.duration,
    geometry: feature.geometry,
    timeSpans,
    warnings: feature.properties.warnings ?? [],
    attribution: object(data.metadata)
      ? (data.metadata.attribution ?? null)
      : null,
  });
}

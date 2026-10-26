/** 같은 출처의 NestJS 경로 API만 호출한다. ORS 키나 외부 제공자 주소를 브라우저에 넣지 않는다. */
import type {
  CurrentLocation,
  LocationCoordinates,
  LocationRequestOptions,
  LocationRouteMode,
  LocationRouteRequest,
  LocationRouteResponse,
} from '../../types/location';
import { isLocationCoordinates } from './geolocation';

/** 전체 경로 HTTP 대기 제한 시간(ms). 응답 본문 읽기도 이 시간 안에 끝나야 한다. */
export const LOCATION_ROUTE_TIMEOUT_MS = 30000;

export class LocationRouteError extends Error {
  /**
   * 경로 조회 실패를 코드와 안전한 화면 문구로 만든다.
   * 입력: code: 오류 분류, message: 고정된 사용자 안내, status: HTTP 상태(선택).
   * @returns LocationRouteError 객체.
   * @example new LocationRouteError('ROUTE_TIMEOUT','경로 조회 시간이 초과되었습니다.');
   */
  constructor(
    readonly code: string,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'LocationRouteError';
  }
}

/**
 * JSON 객체인지 확인한다. 배열과 null은 제외한다.
 * 입력: value: 외부 JSON 값.
 * @returns 이름으로 필드를 읽을 수 있는 객체이면 true.
 * @example isRecord({mode:'walking'}); // true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 거리·시간 등 음수일 수 없는 값이 실제 숫자인지 검사한다.
 * 입력: value: 검증할 값.
 * @returns 0 이상의 유한한 숫자이면 true. 숫자 문자열은 false다.
 * @example nonnegative(625.3); // true
 */
function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * 잘못된 서버 응답을 공통 오류로 알린다.
 * 입력: 없음.
 * @returns 정상 반환하지 않는다(never).
 * @example 좌표 배열에 NaN/문자열/잘못된 인덱스가 있으면 invalidResponse() 호출
 */
function invalidResponse(): never {
  throw new LocationRouteError(
    'INVALID_ROUTE_RESPONSE',
    '경로 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요.',
  );
}

/**
 * 지도에 그리기 전 서버 응답의 숫자·좌표·구간 연결·캐시 시각을 검증한다.
 * 입력: value: 신뢰하지 않는 JSON, request: 실제로 보낸 이동 방식·선호도·좌표.
 * @returns 필요한 필드만 복사한 LocationRouteResponse. 잘못된 응답은 INVALID_ROUTE_RESPONSE 오류다.
 * @example distanceMeters=8383.3 → 약 8.38km, durationSeconds=625.3 → 약 10분 25초
 * 제네릭 타입만으로 JSON을 신뢰하지 않는다. 경고·출처 문자열은 JSX 텍스트로만 표시한다.
 */
export function parseLocationRoute(
  value: unknown,
  request: LocationRouteRequest,
): LocationRouteResponse {
  if (
    !isRecord(value) ||
    value.mode !== request.mode ||
    value.preference !== request.preference ||
    !nonnegative(value.distanceMeters) ||
    !nonnegative(value.durationSeconds) ||
    value.trafficApplied !== false ||
    typeof value.cached !== 'boolean' ||
    typeof value.cacheId !== 'string' ||
    !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value.cacheId) ||
    !isRecord(value.geometry) ||
    value.geometry.type !== 'LineString' ||
    !Array.isArray(value.geometry.coordinates) ||
    value.geometry.coordinates.length < 2 ||
    value.geometry.coordinates.length > 200000 ||
    !Array.isArray(value.timeSpans) ||
    value.timeSpans.length === 0 ||
    !Array.isArray(value.warnings) ||
    (value.attribution !== null && typeof value.attribution !== 'string')
  )
    return invalidResponse();
  /** GeoJSON 순서로 검증·복사할 경로 좌표 배열이다. Leaflet 변환은 지도에서만 한다. */
  const coordinates: [number, number][] = [];
  for (const point of value.geometry.coordinates) {
    if (
      !Array.isArray(point) ||
      point.length !== 2 ||
      !isLocationCoordinates({ longitude: point[0], latitude: point[1] })
    )
      return invalidResponse();
    coordinates.push([point[0], point[1]]);
  }
  /** 이어지는 구간의 인덱스와 시간을 복사한 배열이다. */
  const timeSpans: LocationRouteResponse['timeSpans'] = [];
  /** 앞 구간의 끝 좌표 인덱스다. 첫 구간은 0에서 시작해야 한다. */
  let previousEnd = 0;
  /** 모든 구간의 시간을 더해 전체 소요시간과 비교한다. 단위는 초다. */
  let totalDuration = 0;
  for (const span of value.timeSpans) {
    if (
      !isRecord(span) ||
      !Number.isInteger(span.fromIndex) ||
      !Number.isInteger(span.toIndex) ||
      span.fromIndex !== previousEnd ||
      !nonnegative(span.toIndex) ||
      span.toIndex < previousEnd ||
      span.toIndex >= coordinates.length ||
      !nonnegative(span.durationSeconds) ||
      (span.toIndex === previousEnd && span.durationSeconds !== 0)
    )
      return invalidResponse();
    previousEnd = span.toIndex;
    totalDuration += span.durationSeconds;
    timeSpans.push({
      fromIndex: span.fromIndex as number,
      toIndex: span.toIndex,
      durationSeconds: span.durationSeconds,
    });
  }
  if (
    previousEnd !== coordinates.length - 1 ||
    Math.abs(totalDuration - value.durationSeconds) >
      Math.max(2, timeSpans.length * 0.11)
  )
    return invalidResponse();
  /** 문자열 렌더링용 경고 목록이다. HTML로 해석하지 않는다. */
  const warnings: LocationRouteResponse['warnings'] = [];
  for (const warning of value.warnings) {
    if (
      !isRecord(warning) ||
      !Number.isInteger(warning.code) ||
      typeof warning.message !== 'string'
    )
      return invalidResponse();
    warnings.push({ code: warning.code as number, message: warning.message });
  }
  /** 수집 시각 문자열이다. Date 파싱과 만료 순서도 검사한다. */
  const fetchedAt = value.fetchedAt;
  /** 만료 시각 문자열이다. 브라우저 위치의 capturedAt과는 다른 시각이다. */
  const expiresAt = value.expiresAt;
  if (
    typeof fetchedAt !== 'string' ||
    typeof expiresAt !== 'string' ||
    !Number.isFinite(Date.parse(fetchedAt)) ||
    !Number.isFinite(Date.parse(expiresAt)) ||
    Date.parse(expiresAt) <= Date.parse(fetchedAt)
  )
    return invalidResponse();
  return {
    mode: request.mode,
    preference: request.preference,
    distanceMeters: value.distanceMeters,
    durationSeconds: value.durationSeconds,
    geometry: { type: 'LineString', coordinates },
    timeSpans,
    attribution: value.attribution as string | null,
    warnings,
    trafficApplied: false,
    cacheId: value.cacheId,
    cached: value.cached,
    fetchedAt,
    expiresAt,
  };
}

/**
 * 직접 좌표 경로 요청을 호출 전에 검사한다.
 * 입력: request: 이동 방식·선호도·2~10개 지점.
 * @returns void. 잘못되면 INVALID_ROUTE_REQUEST 오류이며 HTTP 요청은 보내지 않는다.
 * @example 자동차 출발/도착 두 좌표는 통과하고, latitude='35.1'은 거절한다.
 */
function validateRequest(request: LocationRouteRequest): void {
  if (
    !request ||
    !['driving', 'walking'].includes(request.mode) ||
    !['recommended', 'shortest'].includes(request.preference) ||
    !Array.isArray(request.points) ||
    request.points.length < 2 ||
    request.points.length > 10
  )
    throw new LocationRouteError(
      'INVALID_ROUTE_REQUEST',
      '이동 방식과 출발지·목적지 좌표를 확인해 주세요.',
    );
  for (const point of request.points)
    if (!isLocationCoordinates(point))
      throw new LocationRouteError(
        'INVALID_ROUTE_REQUEST',
        '출발지 또는 목적지의 좌표가 올바르지 않습니다.',
      );
}

/**
 * 기존 POST /api/routes에 직접 좌표를 보내고 검증된 경로를 받는다.
 * 입력: request: 경로 조건, options.signal: 화면 취소 신호, transport: 테스트용 fetch 대역(선택).
 * @returns Promise<LocationRouteResponse>. 취소·시간 초과·네트워크·서버 오류는 LocationRouteError다.
 * @example await requestLocationRoute({mode:'walking',preference:'recommended',points:[{latitude:35.1,longitude:128.9},{latitude:35.2,longitude:129}]});
 * 정확도·측정 시각·임의 추가 속성은 요청 본문에서 제외한다. 취소는 클라이언트 대기 중단이며 서버 계산 중단을 보증하지 않는다.
 */
export async function requestLocationRoute(
  request: LocationRouteRequest,
  options: LocationRequestOptions = {},
  transport: typeof fetch = fetch,
): Promise<LocationRouteResponse> {
  validateRequest(request);
  /** 외부 취소와 시간 초과를 하나의 fetch 취소로 연결할 내부 제어기다. */
  const controller = new AbortController();
  /** 화면에서 전달한 취소 신호다. */
  const signal = options.signal;
  /** 제한 시간으로 취소했는지 표시해 사용자 취소와 구분한다. */
  let timedOut = false;
  /** 응답 헤더·본문 읽기를 모두 포함하는 제한 타이머다. */
  const deadline = setTimeout(onTimeout, LOCATION_ROUTE_TIMEOUT_MS);
  /**
   * 화면 취소를 fetch 제어기에 전달한다.
   * 입력: 없음. 바깥 signal에서 호출한다.
   * @returns void.
   * @example 화면 이동 → options.signal.abort → fetch 취소
   */
  function onAbort(): void {
    controller.abort();
  }
  /**
   * 전체 경로 대기 제한 시간이 지나면 fetch를 중단한다.
   * 입력: 없음. 타이머가 호출한다.
   * @returns void.
   * @example 30초를 초과하면 ROUTE_TIMEOUT으로 변환된다.
   */
  function onTimeout(): void {
    timedOut = true;
    controller.abort();
  }
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    if (signal?.aborted) controller.abort();
    if (controller.signal.aborted)
      throw new LocationRouteError('ABORTED', '경로 조회를 취소했습니다.');
    /** 서버가 허용하는 필드만 새 객체에 담는다. 위치 정확도·측정 시각은 서버에 보내지 않는다. */
    const points: LocationCoordinates[] = [];
    for (const point of request.points)
      points.push({ latitude: point.latitude, longitude: point.longitude });
    /** 같은 출처의 경로 API 응답이다. 브라우저에서 ORS를 직접 호출하지 않는다. */
    const response = await transport('/api/routes', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: request.mode,
        preference: request.preference,
        points,
      }),
      signal: controller.signal,
    });
    if (!response.ok)
      throw new LocationRouteError(
        'ROUTE_HTTP_ERROR',
        response.status === 429
          ? '요청이 많습니다. 잠시 후 다시 시도해 주세요.'
          : '경로를 조회하지 못했습니다. 잠시 후 다시 시도해 주세요.',
        response.status,
      );
    /** 원본 응답은 unknown으로 읽어 실제 구조를 검사한다. */
    const payload: unknown = await response.json();
    if (controller.signal.aborted)
      throw new LocationRouteError('ABORTED', '경로 조회를 취소했습니다.');
    return parseLocationRoute(payload, request);
  } catch (error) {
    if (timedOut)
      throw new LocationRouteError(
        'ROUTE_TIMEOUT',
        '경로 조회 시간이 초과되었습니다. 다시 시도해 주세요.',
      );
    if (controller.signal.aborted)
      throw new LocationRouteError('ABORTED', '경로 조회를 취소했습니다.');
    if (error instanceof LocationRouteError) throw error;
    throw new LocationRouteError(
      'ROUTE_UNAVAILABLE',
      '경로 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * 확인한 현재 위치를 출발점으로 하여 목적지까지의 경로를 요청한다.
 * 입력: origin: 위치 조회 결과, destination: 목적지 위도/경도, mode: 자차/도보,
 * options.signal: 취소 신호, transport: 검증용 전송기(선택).
 * @returns Promise<LocationRouteResponse>. 이 함수는 휴대폰 위치를 다시 측정하지 않는다.
 * @example await routeFromCurrentLocation(location,{latitude:35.05,longitude:128.97},'driving');
 */
export function routeFromCurrentLocation(
  origin: CurrentLocation,
  destination: LocationCoordinates,
  mode: LocationRouteMode,
  options: LocationRequestOptions = {},
  transport: typeof fetch = fetch,
): Promise<LocationRouteResponse> {
  return requestLocationRoute(
    { mode, preference: 'recommended', points: [origin, destination] },
    options,
    transport,
  );
}

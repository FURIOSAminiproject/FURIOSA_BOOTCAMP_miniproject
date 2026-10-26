/**
 * 경로 공통 데이터 모양. 거리=m, 시간=초, GeoJSON 좌표 배열=[경도, 위도], 시각=UTC ISO 문자열.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
/** 현재 지원하는 외부 경로 제공자는 ORS 하나다. */
export type ProviderName = 'ORS';
/** GeoJSON/ORS 좌표 한 쌍: [경도, 위도]. 예: [128.9459775, 35.1044927]. */
export type Coordinate = [number, number];
/** 내부 장소 UUID만 넣거나 위도/경도 숫자만 넣는 두 입력 방식. 같은 지점 객체에 둘을 섞지 않는다. */
export type RoutePoint =
  { placeId: string } | { latitude: number; longitude: number };
export interface ResolvedPoint {
  /** 내부 장소 UUID. 사용자가 직접 좌표를 입력한 지점은 null. */
  placeId: string | null;
  /** 위도 숫자. -90~90. */
  latitude: number;
  /** 경도 숫자. -180~180. */
  longitude: number;
}
export interface RouteRequest {
  /** driving=자차, walking=도보. 대중교통은 현재 지원하지 않는다. */
  mode: 'driving' | 'walking';
  /** recommended=추천 경로, shortest=거리 우선 경로. */
  preference: 'recommended' | 'shortest';
  /** 이동 순서대로 2~10개 지점. 첫 지점=출발, 마지막=도착, 사이는 경유지. */
  points: RoutePoint[];
}
export interface OrsRequest {
  /** 서버의 캐시 요청 형식 버전. 현재 2이며 외부 API 파라미터로 보내지 않는다. */
  contractVersion: 2;
  /** driving-car=자동차, foot-walking=도보. */
  profile: 'driving-car' | 'foot-walking';
  /** 추천 경로 또는 거리 우선 경로. */
  preference: RouteRequest['preference'];
  /** 이동 순서의 [경도, 위도] 배열. 순서를 바꾸면 다른 경로다. */
  coordinates: Coordinate[];
  /** 거리 응답 단위 m(미터). */
  units: 'm';
  /** true로 요청해 steps 구간 소요시간을 받는다. */
  instructions: true;
}
export interface TimeSpan {
  /** geometry.coordinates에서 구간이 시작하는 위치. 0부터 센다. */
  fromIndex: number;
  /** geometry.coordinates에서 구간이 끝나는 위치. 앞 구간 끝과 다음 구간 시작이 연결된다. */
  toIndex: number;
  /** 이 구간의 예상 소요시간(초). 현재 실시간 정체 미반영. */
  durationSeconds: number;
}
export interface RouteData {
  /** 전체 경로 거리(미터). 예: 8383.3 → 약 8.38km. */
  distanceMeters: number;
  /** 전체 예상 소요시간(초). 예: 625.3 → 약 10분 25초. */
  durationSeconds: number;
  /** 지도를 그릴 GeoJSON LineString. coordinates는 [경도, 위도] 순서. */
  geometry: { type: 'LineString'; coordinates: Coordinate[] };
  /** 좌표 인덱스로 표현한 구간별 시간. 교통 체증 시간 데이터가 아니다. */
  timeSpans: TimeSpan[];
  /** 화면에 표시할 제공자/지도 데이터 출처 문구. 없으면 null. */
  attribution: string | null;
  /** ORS의 정수 code와 문자열 message 경고 목록. 없으면 []. */
  warnings: { code: number; message: string }[];
}
export interface CacheEntry<T> {
  /** DB 행의 내부 UUID. */
  cacheId: string;
  /** 성공 응답을 수집한 UTC ISO 시각. 캐시 재사용 시 그대로 유지한다. */
  fetchedAt: string;
  /** 응답 유효기간이 끝나는 UTC ISO 시각. */
  expiresAt: string;
  /** 캐시에 저장한 업무 데이터 T. */
  data: T;
}
export interface CacheResult<T> extends CacheEntry<T> {
  /** true=기존 유효 캐시 사용, false=이번에 외부 API에서 받아 저장. */
  cached: boolean;
}
export interface CacheStore<Q, T> {
  /**
   * 요청 해시가 같고 아직 만료되지 않은 경로 한 건을 읽는다.
   *
   * 입력: hash: 요청 해시, now: 만료 판정 시각.
   * @returns 검증된 CacheEntry<RouteData>. 없거나 expires_at<=now이면 null.
   * @example
   * await repository.find(hash, new Date()); // 유효한 행 또는 null
   *
   * DB JSON도 다시 검사한다. 손상된 좌표·시간 데이터는 CACHE_DATA_INVALID 예외다.
   */
  find(hash: string, now: Date): Promise<CacheEntry<T> | null>;

  /**
   * ORS 경로 결과와 요청 조건을 DB 캐시에 저장한다.
   *
   * 입력: hash: 검색 키, request: ORS 요청, data: 거리·시간·좌표·구간, sourceUrl: 출처,
   * fetchedAt/expiresAt: 수집·만료 시각.
   * @returns DB가 반환한 캐시 ID와 시각, 전달한 data를 담은 CacheEntry<RouteData>.
   * @example
   * // 같은 request_hash를 다시 저장 → 기존 cache_id 유지, 데이터와 유효기간 교체
   *
   * 좌표 배열은 [경도, 위도]. JSON 문자열은 SQL에 이어붙이지 않고 매개변수로 전달한다.
   */
  save(
    hash: string,
    request: Q,
    data: T,
    sourceUrl: string,
    fetchedAt: Date,
    expiresAt: Date,
  ): Promise<CacheEntry<T>>;
}
export interface DataProvider<Q, T> {
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
  sourceUrl(request: Q): string;

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
  fetch(request: Q): Promise<T>;
}
export interface RoutingLog {
  /**
   * 지정 수준(log)으로 처리 로그를 남기는 계약이다.
   *
   * 입력: message: 안전하게 정리한 문자열. 호출부에서 JSON.stringify한 구조화 로그를 주로 전달한다.
   * @returns 없음(void).
   * @example
   * logger.log(JSON.stringify({event:"example_event"}));
   *
   * 인증키나 원본 접속 설정을 message에 넣지 않는다.
   */
  log(message: string): void;

  /**
   * 지정 수준(error)으로 처리 로그를 남기는 계약이다.
   *
   * 입력: message: 안전하게 정리한 문자열. 호출부에서 JSON.stringify한 구조화 로그를 주로 전달한다.
   * @returns 없음(void).
   * @example
   * logger.error(JSON.stringify({event:"example_event"}));
   *
   * 인증키나 원본 접속 설정을 message에 넣지 않는다.
   */
  error(message: string): void;
}

export interface RouteResponse extends RouteData {
  /** 요청한 자차/도보 이동 방식. */
  mode: RouteRequest['mode'];
  /** 요청한 경로 선호도. */
  preference: RouteRequest['preference'];
  /** 요청 순서를 유지한 실제 위도·경도 지점. */
  points: ResolvedPoint[];
  /** 항상 false. 실시간 교통 정체를 적용한 예상시간이 아니다. */
  trafficApplied: false;
  /** 사용한 경로 캐시 행의 내부 UUID. */
  cacheId: string;
  /** 유효 DB 캐시 재사용이면 true, 이번 외부 API 수집이면 false. */
  cached: boolean;
  /** 경로가 실제로 수집된 UTC ISO 시각. */
  fetchedAt: string;
  /** 캐시 유효기간 종료 시각. 이 시각에 자동으로 ORS를 재호출하지 않는다. */
  expiresAt: string;
  /** 이 경로 결과의 계산 기준 시각. 현재 fetchedAt과 같은 값이다. */
  calculatedAt: string;
}

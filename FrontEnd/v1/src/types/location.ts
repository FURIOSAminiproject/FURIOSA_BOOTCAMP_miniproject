/** 현재 위치와 경로의 공개 자료형. 거리=m, 소요시간=초, 좌표 배열=[경도, 위도]다. */
export interface LocationCoordinates {
  /** 위도 숫자. 남극 -90부터 북극 90까지다. */
  latitude: number;
  /** 경도 숫자. -180부터 180까지다. */
  longitude: number;
}

export interface CurrentLocation extends LocationCoordinates {
  /** 브라우저가 보고한 수평 위치 정확도(m). 실제 오차를 서비스가 보증하는 값은 아니다. */
  accuracyMeters: number;
  /** 브라우저가 위치를 측정한 시각. UTC ISO 문자열이다. */
  capturedAt: string;
}

/** 자동차와 도보만 제공한다. 버스·택시 요금이나 실시간 교통정보는 포함하지 않는다. */
export type LocationRouteMode = 'driving' | 'walking';

export interface LocationRouteRequest {
  /** driving=자동차, walking=도보. */
  mode: LocationRouteMode;
  /** recommended=추천, shortest=거리 우선. */
  preference: 'recommended' | 'shortest';
  /** 출발→경유→도착 순서의 직접 좌표. 서버와 동일하게 2~10개를 받는다. */
  points: LocationCoordinates[];
}

export interface LocationRouteResponse {
  /** 요청한 이동 방식. */
  mode: LocationRouteMode;
  /** 서버에서 실제 적용한 경로 선호도. */
  preference: LocationRouteRequest['preference'];
  /** 실제 경로 길이(m). */
  distanceMeters: number;
  /** 실시간 정체를 반영하지 않은 예상 이동시간(초). */
  durationSeconds: number;
  /** 지도 선. coordinates의 각 원소는 [경도, 위도]다. */
  geometry: { type: 'LineString'; coordinates: [number, number][] };
  /** 지도 좌표의 시작/끝 인덱스와 해당 구간 예상시간이다. */
  timeSpans: { fromIndex: number; toIndex: number; durationSeconds: number }[];
  /** 화면에서 표시할 ORS·지도 데이터 출처 문구. */
  attribution: string | null;
  /** 서버가 전달한 경로 경고. JSX 텍스트로만 표시한다. */
  warnings: { code: number; message: string }[];
  /** 현재 서비스는 실시간 교통정보를 적용하지 않으므로 false여야 한다. */
  trafficApplied: false;
  /** 서버 캐시 행의 내부 UUID. */
  cacheId: string;
  /** true면 유효 캐시 재사용, false면 이번에 제공자에서 새로 조회한 결과다. */
  cached: boolean;
  /** 서버가 경로를 수집한 UTC ISO 시각. 휴대폰 위치 측정 시각과 구분한다. */
  fetchedAt: string;
  /** 서버의 경로 캐시가 만료되는 UTC ISO 시각. */
  expiresAt: string;
}

export interface LocationRouteDisplay {
  /** 이번 경로의 출발점으로 사용한 단발성 위치 측정값. */
  origin: CurrentLocation;
  /** 서버에서 검증된 경로 응답. */
  route: LocationRouteResponse;
}

export interface LocationRequestOptions {
  /** 화면 전환·취소 시 전달하는 신호. 이미 보낸 서버 작업의 취소를 보장하지는 않는다. */
  signal?: AbortSignal;
}

/** 브라우저 위치 조회만 담당한다. HTTP 전송·DB 저장·지속 추적을 하지 않는다. */
import type {
  CurrentLocation,
  LocationCoordinates,
  LocationRequestOptions,
} from '../../types/location';

/** 위치 사용자가 직접 이해할 수 있는 오류 분류다. */
export type CurrentLocationErrorCode =
  | 'UNSUPPORTED'
  | 'INSECURE_CONTEXT'
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'ABORTED'
  | 'INVALID_POSITION';

/** 플랫폼 오류 전문 대신 화면에 보여 줄 고정 문구다. 좌표나 내부 오류는 담지 않는다. */
const LOCATION_MESSAGES: Record<CurrentLocationErrorCode, string> = {
  UNSUPPORTED: '이 브라우저는 현재 위치 조회를 지원하지 않습니다.',
  INSECURE_CONTEXT: '현재 위치는 HTTPS로 접속한 화면에서 사용할 수 있습니다.',
  PERMISSION_DENIED:
    '위치 권한이 거부되었습니다. 브라우저와 휴대폰의 위치 권한을 확인해 주세요.',
  POSITION_UNAVAILABLE:
    '현재 위치를 확인하지 못했습니다. 휴대폰 위치 서비스를 켜고 다시 시도해 주세요.',
  TIMEOUT:
    '위치 확인 시간이 초과되었습니다. 권한과 수신 상태를 확인한 뒤 다시 시도해 주세요.',
  ABORTED: '현재 위치 조회를 취소했습니다.',
  INVALID_POSITION: '브라우저가 올바른 위치 정보를 반환하지 못했습니다.',
};

export class CurrentLocationError extends Error {
  /**
   * 위치 조회 오류를 화면용 코드와 고정 문구로 만든다.
   * 입력: code: 위에 선언된 위치 오류 코드.
   * @returns CurrentLocationError 객체. 생성만 하며 예외로 던지지는 않는다.
   * @example new CurrentLocationError('PERMISSION_DENIED').code; // 'PERMISSION_DENIED'
   */
  constructor(readonly code: CurrentLocationErrorCode) {
    super(LOCATION_MESSAGES[code]);
    this.name = 'CurrentLocationError';
  }
}

export interface LocationEnvironment {
  /** 실제 페이지가 HTTPS 또는 신뢰 가능한 로컬 환경인지 나타낸다. */
  secureContext: boolean;
  /** 브라우저 기본 Geolocation. 테스트에서는 같은 메서드를 가진 대역으로 바꾼다. */
  geolocation?: Pick<Geolocation, 'getCurrentPosition'>;
}

/** 브라우저의 위치 수신 제한 시간. maximumAge=0으로 브라우저의 이전 좌표를 재사용하지 않게 요청한다. */
export const CURRENT_LOCATION_OPTIONS: Readonly<PositionOptions> =
  Object.freeze({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
/** 권한 대기까지 포함한 UI 전체 제한 시간(ms). 브라우저 자체 timeout은 권한 대기를 포함하지 않을 수 있다. */
export const CURRENT_LOCATION_DEADLINE_MS = 15000;

/**
 * 필요한 브라우저 기능만 읽는다. 모듈을 import할 때는 위치 권한을 요청하지 않는다.
 * 입력: 없음.
 * @returns 보안 환경 여부와 위치 조회 객체. 브라우저 밖에서는 지원하지 않는 환경 정보다.
 * @example readLocationEnvironment().secureContext; // 실제 HTTPS 화면이면 true
 */
export function readLocationEnvironment(): LocationEnvironment {
  return {
    secureContext:
      typeof window !== 'undefined' && window.isSecureContext === true,
    geolocation:
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
  };
}

/**
 * 값이 이름 있는 위도·경도 객체이며 실제 유한한 숫자인지 확인한다.
 * 입력: value: 아직 검증하지 않은 좌표 값.
 * @returns 위도 -90~90, 경도 -180~180인 숫자 객체이면 true.
 * @example isLocationCoordinates({latitude:35.1,longitude:128.9}); // true
 * @example isLocationCoordinates({latitude:'35.1',longitude:128.9}); // false
 */
export function isLocationCoordinates(
  value: unknown,
): value is LocationCoordinates {
  if (!value || typeof value !== 'object') return false;
  /** 이름이 있는 원본 필드를 검사할 읽기용 객체다. 형변환으로 잘못된 숫자를 허용하지 않는다. */
  const point = value as Record<string, unknown>;
  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    Math.abs(point.latitude) <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.longitude) <= 180
  );
}

/**
 * 브라우저의 실제 측정값을 서비스가 사용할 형태로 검증하고 복사한다.
 * 입력: position: 브라우저가 반환한 좌표·정확도·측정 시각.
 * @returns 위도, 경도, 정확도(m), 측정 시각(UTC ISO)을 가진 CurrentLocation.
 * @example 위치 {latitude:35.1,longitude:128.9,accuracy:20}, timestamp=1792972800000 → accuracyMeters=20
 * 잘못된 좌표·정확도·시각은 INVALID_POSITION 오류다. 임의의 기본 좌표를 만들지 않는다.
 */
export function parseCurrentLocation(
  position: GeolocationPosition,
): CurrentLocation {
  /** 브라우저 좌표 객체다. latitude/longitude를 서로 바꾸지 않는다. */
  const coordinates = position?.coords;
  /** 위치를 측정한 원래 시각이다. 서버가 경로를 조회한 시각이 아니다. */
  const timestamp = position?.timestamp;
  if (
    !isLocationCoordinates(coordinates) ||
    typeof coordinates.accuracy !== 'number' ||
    !Number.isFinite(coordinates.accuracy) ||
    coordinates.accuracy < 0 ||
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp) ||
    !Number.isFinite(new Date(timestamp).getTime())
  )
    throw new CurrentLocationError('INVALID_POSITION');
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    accuracyMeters: coordinates.accuracy,
    capturedAt: new Date(timestamp).toISOString(),
  };
}

/**
 * 사용자가 요청한 순간의 현재 위치를 한 번만 조회한다.
 * 입력: options.signal: 취소 신호(선택), environment: 브라우저 기능 또는 테스트 대역(선택).
 * @returns Promise<CurrentLocation>. 권한 거부·미지원·시간 초과 등은 CurrentLocationError로 거절된다.
 * @example const point = await getCurrentLocation(); // point.latitude, point.longitude
 * @example await getCurrentLocation({signal:controller.signal}); // controller.abort()로 결과 대기 취소
 * 호출 시 권한 창이 뜰 수 있으므로 버튼 이벤트에서만 호출한다. 취소해도 브라우저 권한 창 자체를 닫을 수는 없다.
 */
export function getCurrentLocation(
  options: LocationRequestOptions = {},
  environment: LocationEnvironment = readLocationEnvironment(),
): Promise<CurrentLocation> {
  /** 호출한 화면의 취소 신호다. 이미 취소된 요청은 브라우저 권한도 요청하지 않는다. */
  const signal = options.signal;
  if (signal?.aborted)
    return Promise.reject(new CurrentLocationError('ABORTED'));
  if (!environment.geolocation)
    return Promise.reject(new CurrentLocationError('UNSUPPORTED'));
  if (!environment.secureContext)
    return Promise.reject(new CurrentLocationError('INSECURE_CONTEXT'));
  return new Promise(
    /**
     * 브라우저 콜백 API를 한 번만 완료되는 Promise로 감싼다.
     * 입력: resolve: 성공 값 전달 함수, reject: 실패 전달 함수.
     * @returns void. 실제 측정 결과는 바깥 Promise로 전달한다.
     * @example 성공 콜백 → resolve(CurrentLocation), 권한 거부 → reject(CurrentLocationError)
     */
    (resolve, reject) => {
      /** 시간 초과·취소 이후 늦게 온 브라우저 콜백을 무시할 완료 표시다. */
      let settled = false;
      /** 권한 대기까지 포함한 전체 대기 제한 타이머다. 완료 시 반드시 해제한다. */
      const deadline = setTimeout(onTimeout, CURRENT_LOCATION_DEADLINE_MS);

      /**
       * 모든 완료 경로에서 타이머와 취소 리스너를 제거한다.
       * 입력: 없음. 바깥 deadline/signal을 사용한다.
       * @returns void.
       * @example 성공·실패·취소 모두 cleanup() 후 더 이상 콜백을 처리하지 않는다.
       */
      function cleanup(): void {
        clearTimeout(deadline);
        signal?.removeEventListener('abort', onAbort);
      }
      /**
       * 실패를 처음 한 번만 전달한다.
       * 입력: error: 공개 위치 오류.
       * @returns void. Promise를 거절하고 리소스를 정리한다.
       * @example fail(new CurrentLocationError('TIMEOUT')); // 늦은 성공은 무시
       */
      function fail(error: CurrentLocationError): void {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      }
      /**
       * 호출한 화면의 취소를 위치 조회 취소로 변환한다.
       * 입력: 없음. AbortSignal이 호출한다.
       * @returns void.
       * @example controller.abort() → ABORTED
       */
      function onAbort(): void {
        fail(new CurrentLocationError('ABORTED'));
      }
      /**
       * 권한 대기를 포함해 전체 제한 시간이 지나면 종료한다.
       * 입력: 없음. deadline 타이머가 호출한다.
       * @returns void.
       * @example 권한 창을 15초 동안 응답하지 않음 → TIMEOUT
       */
      function onTimeout(): void {
        fail(new CurrentLocationError('TIMEOUT'));
      }
      /**
       * 브라우저의 성공 측정값을 검증한 뒤 한 번만 반환한다.
       * 입력: position: 브라우저 위치 결과.
       * @returns void. 검증 성공이면 바깥 Promise가 CurrentLocation으로 완료된다.
       * @example 취소 후 success 콜백이 와도 settled=true이므로 무시한다.
       */
      function onSuccess(position: GeolocationPosition): void {
        if (settled) return;
        try {
          /** 화면에 전달할 검증된 복사본이다. 원본 브라우저 객체는 저장하지 않는다. */
          const location = parseCurrentLocation(position);
          settled = true;
          cleanup();
          resolve(location);
        } catch {
          fail(new CurrentLocationError('INVALID_POSITION'));
        }
      }
      /**
       * 브라우저 숫자 오류 코드를 고정된 서비스 오류로 바꾼다.
       * 입력: error: GeolocationPositionError. 원본 message는 출력하지 않는다.
       * @returns void. 위치 Promise를 거절한다.
       * @example code=1 → PERMISSION_DENIED, 2 → POSITION_UNAVAILABLE, 3 → TIMEOUT
       */
      function onError(error: GeolocationPositionError): void {
        fail(
          new CurrentLocationError(
            error.code === 1
              ? 'PERMISSION_DENIED'
              : error.code === 3
                ? 'TIMEOUT'
                : 'POSITION_UNAVAILABLE',
          ),
        );
      }

      signal?.addEventListener('abort', onAbort, { once: true });
      if (signal?.aborted) {
        onAbort();
        return;
      }
      try {
        environment.geolocation!.getCurrentPosition(
          onSuccess,
          onError,
          CURRENT_LOCATION_OPTIONS,
        );
      } catch {
        fail(new CurrentLocationError('POSITION_UNAVAILABLE'));
      }
    },
  );
}

/** 사용자가 버튼을 눌러야 위치를 조회한다. 현재 위치는 이 컴포넌트의 메모리에만 보관한다. */
import React, { useEffect, useRef, useState } from 'react';
import {
  CurrentLocationError,
  getCurrentLocation,
  isLocationCoordinates,
} from '../services/location/geolocation';
import {
  LocationRouteError,
  routeFromCurrentLocation,
} from '../services/location/route-client';
import type {
  CurrentLocation,
  LocationRouteDisplay,
  LocationRouteMode,
} from '../types/location';

export interface CurrentLocationDestination {
  /** 같은 장소가 여러 일차에 나와도 구분할 화면용 키다. DB 장소 ID로 서버에 보내지 않는다. */
  key: string;
  /** 선택 상자에 표시할 일차와 장소 이름이다. */
  name: string;
  /** 목적지 위도. 임의의 기본 좌표로 대체하지 않는다. */
  latitude: number;
  /** 목적지 경도. */
  longitude: number;
}

export interface CurrentLocationRoutePanelProps {
  /** 현재 지도에 표시한 방문지 선택지다. */
  destinations: CurrentLocationDestination[];
  /** 새 경로 또는 null을 부모 지도에 전달한다. null은 기존 실제 경로를 지우라는 뜻이다. */
  onRouteChange: (result: LocationRouteDisplay | null) => void;
  /** 위치 권한·성공·실패를 실제 장치 없이 검증할 조회 대역. 운영에서는 기본 함수를 사용한다. */
  locate?: typeof getCurrentLocation;
  /** 경로 호출을 검증할 대역. 운영에서는 같은 출처 POST /api/routes를 사용한다. */
  findRoute?: typeof routeFromCurrentLocation;
}

/**
 * 초 단위 예상시간을 올림한 분/시간으로 표시한다.
 * 입력: seconds: 검증된 0 이상의 예상시간(초).
 * @returns 한국어 소요시간 문자열.
 * @example formatLocationDuration(625.3); // '11분'
 */
export function formatLocationDuration(seconds: number): string {
  /** 초의 일부를 버려 실제보다 짧게 보이지 않도록 분으로 올림한다. */
  const minutes = Math.ceil(seconds / 60);
  /** 전체 시간 중 완전히 채워진 시간 수다. */
  const hours = Math.floor(minutes / 60);
  /** 시간 단위로 빼고 남은 분이다. */
  const remainingMinutes = minutes % 60;
  return hours > 0 ? `${hours}시간 ${remainingMinutes}분` : `${minutes}분`;
}

/**
 * 측정 시각을 휴대폰 브라우저의 현지 시간으로 표시한다.
 * 입력: iso: 검증된 UTC ISO 시각.
 * @returns 한국어 형식의 브라우저 현지 시각 문자열.
 * @example formatLocationTime('2026-10-26T00:00:00Z'); // 한국 시간대 장치에서는 09시 표시
 */
function formatLocationTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR');
}

/**
 * 현재 위치 확인과 확인한 위치에서의 자동차·도보 경로 조회 UI를 렌더링한다.
 * 입력: destinations: 지도 방문지, onRouteChange: 지도 갱신 콜백, locate/findRoute: 선택적 검증 대역.
 * @returns React 화면. 초기 렌더링만으로 권한 요청이나 서버 호출은 일어나지 않는다.
 * @example <CurrentLocationRoutePanel destinations={places} onRouteChange={setRoute} />
 * 부모는 일정·일차 범위가 바뀌면 key를 바꿔 이전 측정값과 요청을 폐기한다.
 */
export function CurrentLocationRoutePanel({
  destinations,
  onRouteChange,
  locate = getCurrentLocation,
  findRoute = routeFromCurrentLocation,
}: CurrentLocationRoutePanelProps): React.ReactElement {
  /** 사용자가 고른 목적지의 화면용 키와 변경 함수다. */
  const [destinationKey, setDestinationKey] = useState(
    destinations[0]?.key ?? '',
  );
  /** driving=자동차, walking=도보 선택과 변경 함수다. */
  const [mode, setMode] = useState<LocationRouteMode>('driving');
  /** 마지막으로 사용자가 확인한 위치와 변경 함수다. 서버에 별도 위치 저장 요청을 보내지 않는다. */
  const [origin, setOrigin] = useState<CurrentLocation | null>(null);
  /** 조회된 경로와 변경 함수다. 현재 위치/목적지/방식 변경 시 지운다. */
  const [result, setResult] = useState<LocationRouteDisplay | null>(null);
  /** 진행 중인 작업 종류와 변경 함수다. 위치/경로 중 하나만 진행한다. */
  const [busy, setBusy] = useState<'idle' | 'locating' | 'routing'>('idle');
  /** 화면에 보여 줄 실패 안내와 변경 함수다. 원본 오류는 출력하지 않는다. */
  const [error, setError] = useState<string | null>(null);
  /** 현재 진행 중인 비동기 요청의 취소 제어기다. 이전 콜백의 상태 덮어쓰기도 방지한다. */
  const activeRequest = useRef<AbortController | null>(null);
  /** 선택된 목적지다. 방문지가 없어도 임의의 출발/도착 좌표를 만들지 않는다. */
  let destination: CurrentLocationDestination | undefined;
  for (const candidate of destinations)
    if (candidate.key === destinationKey) destination = candidate;
  /** JSX 선택 항목 배열이다. 장소 이름은 React 텍스트 escaping을 사용한다. */
  const destinationOptions: React.ReactElement[] = [];
  for (const place of destinations)
    destinationOptions.push(
      <option key={place.key} value={place.key}>
        {place.name}
      </option>,
    );
  /** 잘못된 목적지 좌표에서는 경로 버튼을 막고 실제 API 호출도 하지 않는다. */
  const destinationValid = isLocationCoordinates(destination);

  useEffect(
    /**
     * 처음 표시할 때 이전 지도 경로를 지우고, 화면을 떠날 때 남은 요청을 취소한다.
     * 입력: 없음. 안정적인 부모 onRouteChange와 요청 ref를 사용한다.
     * @returns 언마운트 정리 함수. 권한 창 자체를 닫지는 못한다.
     * @example 일정 전환 → cleanup → 이전 GPS/HTTP 성공 콜백 무시
     */
    function managePanelLifetime() {
      onRouteChange(null);
      /**
       * 화면에서 사라진 요청을 더 이상 상태에 반영하지 않게 취소한다.
       * 입력: 없음.
       * @returns void.
       * @example 이전 일차 화면의 늦은 응답은 새 일차 경로가 되지 않는다.
       */
      return function cancelAfterUnmount(): void {
        activeRequest.current?.abort();
        activeRequest.current = null;
      };
    },
    [onRouteChange],
  );

  /**
   * 진행 중 요청과 화면의 이전 경로·오류를 정리한다.
   * 입력: 없음. origin은 유지한다.
   * @returns void. 부모 지도에서도 실제 경로를 지운다.
   * @example 이동 방식을 바꾸면 이전 자동차 경로는 즉시 사라진다.
   */
  function resetRoute(): void {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setResult(null);
    setError(null);
    setBusy('idle');
    onRouteChange(null);
  }

  /**
   * 사용자 버튼으로 단발성 현재 위치를 조회한다.
   * 입력: 없음. 주입된 locate와 새 AbortController를 사용한다.
   * @returns Promise<void>. 위치 결과는 화면 상태에 저장하며 서버에는 아직 전송하지 않는다.
   * @example '현재 위치 확인' → 허용 → 위도/경도/정확도/측정 시각 표시
   */
  async function handleLocate(): Promise<void> {
    resetRoute();
    setOrigin(null);
    /** 이번 위치 요청만 취소하기 위한 제어기다. */
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy('locating');
    try {
      /** 브라우저가 실제로 반환하고 검증한 단발성 위치다. */
      const location = await locate({ signal: controller.signal });
      if (controller.signal.aborted || activeRequest.current !== controller)
        return;
      setOrigin(location);
    } catch (failure) {
      if (!controller.signal.aborted && activeRequest.current === controller)
        setError(
          failure instanceof CurrentLocationError
            ? failure.message
            : '현재 위치를 확인하지 못했습니다. 다시 시도해 주세요.',
        );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setBusy('idle');
      }
    }
  }

  /**
   * 확인한 위치를 출발지로 하여 선택 목적지까지 경로를 요청한다.
   * 입력: 없음. 현재 origin/destination/mode 선택을 사용한다.
   * @returns Promise<void>. 성공한 결과를 화면과 부모 지도에 함께 전달한다.
   * @example 도보 선택 → '확인한 위치에서 길찾기' → 거리·시간·파란 실제 경로 표시
   */
  async function handleRoute(): Promise<void> {
    if (!origin || !destination || !destinationValid) return;
    resetRoute();
    /** 이번 HTTP 요청의 취소 제어기다. */
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy('routing');
    try {
      /** 경로 응답에는 휴대폰 위치의 정확도/측정 시각을 섞지 않는다. */
      const route = await findRoute(origin, destination, mode, {
        signal: controller.signal,
      });
      if (controller.signal.aborted || activeRequest.current !== controller)
        return;
      /** 지도와 화면이 같은 출발 좌표·같은 경로를 사용하도록 묶은 결과다. */
      const display = { origin, route };
      setResult(display);
      onRouteChange(display);
    } catch (failure) {
      if (!controller.signal.aborted && activeRequest.current === controller)
        setError(
          failure instanceof LocationRouteError
            ? failure.message
            : '경로를 조회하지 못했습니다. 다시 시도해 주세요.',
        );
    } finally {
      if (activeRequest.current === controller) {
        activeRequest.current = null;
        setBusy('idle');
      }
    }
  }

  /**
   * 목적지를 바꾸고 이전 목적지의 요청·경로를 폐기한다.
   * 입력: event: 목적지 select 변경 이벤트.
   * @returns void. 확인한 출발 위치는 유지한다.
   * @example 목적지 A→B 변경 중 도착한 A 응답은 무시한다.
   */
  function handleDestination(
    event: React.ChangeEvent<HTMLSelectElement>,
  ): void {
    resetRoute();
    setDestinationKey(event.currentTarget.value);
  }
  /**
   * 자동차/도보 선택을 바꾸고 이전 방식의 결과를 폐기한다.
   * 입력: event: 이동 방식 select 변경 이벤트.
   * @returns void.
   * @example driving→walking 후에는 새 길찾기 버튼으로 도보 경로를 조회한다.
   */
  function handleMode(event: React.ChangeEvent<HTMLSelectElement>): void {
    resetRoute();
    setMode(event.currentTarget.value as LocationRouteMode);
  }
  /**
   * 화면의 위치와 경로를 지운다. 서버에 이미 생성된 캐시를 삭제하는 기능은 아니다.
   * 입력: 없음.
   * @returns void.
   * @example '화면에서 위치 지우기' → 위도/경도 표시 제거
   */
  function handleForget(): void {
    resetRoute();
    setOrigin(null);
  }

  /** 서버 경고를 HTML이 아닌 텍스트 항목으로 표시할 배열이다. */
  const warningItems: React.ReactElement[] = [];
  if (result)
    for (const [index, warning] of result.route.warnings.entries())
      warningItems.push(
        <li key={`${warning.code}:${index}`}>{warning.message}</li>,
      );

  return (
    <section
      aria-label="현재 위치에서 길찾기"
      className="border-t border-stone-200 bg-sky-50/50 p-4 sm:p-5 space-y-3"
    >
      <div>
        <h4 className="font-bold text-stone-900">현재 위치에서 길찾기</h4>
        <p className="text-xs text-stone-600 mt-1">
          위치를 한 번 확인해 출발지로 사용합니다. 이동했다면 다시 확인해
          주세요.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-stone-700">
          일정 속 목적지
          <select
            aria-label="현재 위치 길찾기 목적지"
            value={destinationKey}
            onChange={handleDestination}
            disabled={!destinations.length}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm"
          >
            {destinationOptions}
          </select>
        </label>
        <label className="text-xs font-semibold text-stone-700">
          이동 방식
          <select
            aria-label="현재 위치 길찾기 이동 방식"
            value={mode}
            onChange={handleMode}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white p-2 text-sm"
          >
            <option value="driving">자동차</option>
            <option value="walking">도보</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleLocate}
          disabled={busy !== 'idle'}
          className="rounded-xl bg-[#064e43] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          현재 위치 확인
        </button>
        <button
          type="button"
          onClick={handleRoute}
          disabled={!origin || !destinationValid || busy !== 'idle'}
          className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          확인한 위치에서 길찾기
        </button>
        {busy !== 'idle' && (
          <button
            type="button"
            onClick={resetRoute}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm"
          >
            조회 취소
          </button>
        )}
        {origin && (
          <button
            type="button"
            onClick={handleForget}
            className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm"
          >
            화면에서 위치 지우기
          </button>
        )}
      </div>
      <p className="text-xs text-stone-500">
        길찾기를 실행하면 출발지·목적지 좌표가 서버와 경로 제공자에게 전달되고,
        서버의 경로 캐시에 저장될 수 있습니다(유효기간 24시간).
      </p>
      {!destinationValid && (
        <p className="text-xs text-amber-800">
          길찾기를 하려면 올바른 좌표가 있는 목적지를 선택해 주세요. 기존 지도
          검색 링크도 사용할 수 있습니다.
        </p>
      )}
      <div role="status" aria-live="polite" className="text-sm text-stone-700">
        {busy === 'locating' && (
          <p>현재 위치를 확인하고 있습니다. 위치 권한 요청에 응답해 주세요.</p>
        )}
        {busy === 'routing' && (
          <p>선택한 목적지까지의 경로를 조회하고 있습니다.</p>
        )}
        {origin && (
          <div className="rounded-xl bg-white p-3 border border-sky-100 text-xs space-y-1">
            <p>
              위도 {origin.latitude.toFixed(6)} · 경도{' '}
              {origin.longitude.toFixed(6)}
            </p>
            <p>
              브라우저 보고 정확도: 약{' '}
              {Math.ceil(origin.accuracyMeters).toLocaleString()}m · 측정:{' '}
              {formatLocationTime(origin.capturedAt)}
            </p>
          </div>
        )}
        {result && (
          <div className="mt-3 rounded-xl bg-white p-3 border border-sky-200 space-y-1">
            <p className="font-bold">
              {(result.route.distanceMeters / 1000).toFixed(2)}km · 약{' '}
              {formatLocationDuration(result.route.durationSeconds)}
            </p>
            <p className="text-xs">
              실시간 교통상황이 반영되지 않은 예상시간입니다.
            </p>
            <p className="text-xs text-stone-500">
              경로 기준: {formatLocationTime(result.route.fetchedAt)}
              {result.route.cached ? ' · 저장된 경로 사용' : ''}
            </p>
            {result.route.attribution && (
              <p className="text-xs text-stone-500">
                {result.route.attribution}
              </p>
            )}
            {warningItems.length > 0 && (
              <ul className="text-xs text-amber-800 list-disc pl-4">
                {warningItems}
              </ul>
            )}
          </div>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
        >
          {error}
        </p>
      )}
    </section>
  );
}

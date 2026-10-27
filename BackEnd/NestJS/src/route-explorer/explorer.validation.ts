import { invalid, object } from '../routing-cache/routing.errors';
import { coordinate, routeRequest } from '../routing-cache/routing.validation';
import {
  CONTENT_TYPES,
  type ExplorerRequest,
  type NearbyPlacesRequest,
  type TimelineRequest,
} from './explorer.types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** 자동완성의 검색어만 받는다. URL·인증키 등 임의 제공자 설정은 받지 않는다. */
export function searchQuery(value: unknown): string {
  if (typeof value !== 'string') return invalid('q');
  const query = value.trim().replace(/\s+/g, ' ');
  if (
    query.length < 2 ||
    query.length > 100 ||
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    return invalid('q (2~100자)');
  return query;
}

/** 비교 요청은 출발/도착 2곳만 받으며 기존 단일 경로 API의 계약은 바꾸지 않는다. */
export function explorerRequest(value: unknown): ExplorerRequest {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'mode',
          'points',
          'contentTypeIds',
          'categoryIds',
          'radiusMeters',
          'limit',
        ].includes(key),
    )
  )
    return invalid('body');
  const route = routeRequest({ mode: value.mode, points: value.points });
  if (route.points.length !== 2) return invalid('points (출발·도착 2개)');
  const types = value.contentTypeIds ?? [];
  if (
    !Array.isArray(types) ||
    types.length > 7 ||
    types.some((id) => !CONTENT_TYPES.some((type) => type.id === id))
  )
    return invalid('contentTypeIds');
  const categories = value.categoryIds ?? [];
  if (
    !Array.isArray(categories) ||
    categories.length > 200 ||
    categories.some(
      (id) =>
        typeof id !== 'string' ||
        !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id),
    )
  )
    return invalid('categoryIds');
  const radiusMeters = value.radiusMeters ?? 1000;
  const limit = value.limit ?? 10;
  if (
    typeof radiusMeters !== 'number' ||
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 100 ||
    radiusMeters > 5000
  )
    return invalid('radiusMeters (100~5000m)');
  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 20
  )
    return invalid('limit (1~20개)');
  return {
    mode: route.mode,
    points: route.points,
    contentTypeIds: [...new Set<number>(types)],
    categoryIds: [
      ...new Set<string>(categories.map((id: string) => id.toLowerCase())),
    ],
    radiusMeters,
    limit,
  };
}

/** 타임라인 경로 추천 요청 검증 (출발/도착 2곳, 출발시각, 경유 스팟 목록) */
export function timelineRequest(value: unknown): TimelineRequest {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'mode',
          'points',
          'departureTime',
          'preference',
          'stops',
        ].includes(key),
    )
  )
    return invalid('body');

  const route = routeRequest({
    mode: value.mode,
    points: value.points,
    preference: value.preference,
  });
  if (route.points.length !== 2) return invalid('points (출발·도착 2개)');

  const departureTime =
    typeof value.departureTime === 'string' &&
    TIME_REGEX.test(value.departureTime.trim())
      ? value.departureTime.trim()
      : '09:00';

  if (
    !Array.isArray(value.stops) ||
    value.stops.length === 0 ||
    value.stops.length > 10
  ) {
    return invalid('stops (1~10개)');
  }

  const stops = value.stops.map((item, idx) => {
    if (!object(item)) return invalid(`stops[${idx}]`);
    const label =
      typeof item.label === 'string' && item.label.trim().length > 0
        ? item.label.trim().slice(0, 50)
        : `경유 스팟 ${idx + 1}`;

    if (
      typeof item.targetTime !== 'string' ||
      !TIME_REGEX.test(item.targetTime.trim())
    ) {
      return invalid(`stops[${idx}].targetTime (HH:mm 형식)`);
    }

    const types = item.contentTypeIds ?? [];
    if (
      !Array.isArray(types) ||
      types.length > 7 ||
      types.some((id) => !CONTENT_TYPES.some((type) => type.id === id))
    )
      return invalid(`stops[${idx}].contentTypeIds`);

    const categories = item.categoryIds ?? [];
    if (
      !Array.isArray(categories) ||
      categories.length > 200 ||
      categories.some(
        (id) =>
          typeof id !== 'string' ||
          !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id),
      )
    )
      return invalid(`stops[${idx}].categoryIds`);

    const radiusMeters = item.radiusMeters ?? 5000;
    const limit = item.limit ?? 5;
    if (
      typeof radiusMeters !== 'number' ||
      !Number.isInteger(radiusMeters) ||
      radiusMeters < 100 ||
      radiusMeters > 20000
    )
      return invalid(`stops[${idx}].radiusMeters (100~20000m)`);

    if (
      typeof limit !== 'number' ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 20
    )
      return invalid(`stops[${idx}].limit (1~20개)`);

    return {
      label,
      targetTime: item.targetTime.trim(),
      contentTypeIds: [...new Set<number>(types)],
      categoryIds: [
        ...new Set<string>(categories.map((id: string) => id.toLowerCase())),
      ],
      radiusMeters,
      limit,
    };
  });

  return {
    mode: route.mode,
    points: route.points,
    departureTime,
    preference: route.preference,
    stops,
  };
}

/** 특정 위경도 거점 기준 주변 추천 요청 검증 */
export function nearbyPlacesRequest(value: unknown): NearbyPlacesRequest {
  if (
    !object(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          'latitude',
          'longitude',
          'contentTypeIds',
          'categoryIds',
          'radiusMeters',
          'limit',
        ].includes(key),
    )
  )
    return invalid('body');

  const latitude = typeof value.latitude === 'number' ? value.latitude : null;
  const longitude =
    typeof value.longitude === 'number' ? value.longitude : null;

  if (
    latitude === null ||
    !coordinate(latitude, 90) ||
    longitude === null ||
    !coordinate(longitude, 180)
  ) {
    return invalid('latitude / longitude (유효한 좌표)');
  }

  const types = value.contentTypeIds ?? [];
  if (
    !Array.isArray(types) ||
    types.length > 7 ||
    types.some((id) => !CONTENT_TYPES.some((type) => type.id === id))
  )
    return invalid('contentTypeIds');

  const categories = value.categoryIds ?? [];
  if (
    !Array.isArray(categories) ||
    categories.length > 200 ||
    categories.some(
      (id) =>
        typeof id !== 'string' ||
        !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id),
    )
  )
    return invalid('categoryIds');

  const radiusMeters = value.radiusMeters ?? 3000;
  const limit = value.limit ?? 5;

  if (
    typeof radiusMeters !== 'number' ||
    !Number.isInteger(radiusMeters) ||
    radiusMeters < 100 ||
    radiusMeters > 20000
  )
    return invalid('radiusMeters (100~20000m)');

  if (
    typeof limit !== 'number' ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 20
  )
    return invalid('limit (1~20개)');

  return {
    latitude,
    longitude,
    contentTypeIds: [...new Set<number>(types)],
    categoryIds: [
      ...new Set<string>(categories.map((id: string) => id.toLowerCase())),
    ],
    radiusMeters,
    limit,
  };
}


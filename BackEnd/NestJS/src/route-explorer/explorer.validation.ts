import { invalid, object } from '../routing-cache/routing.errors';
import { routeRequest } from '../routing-cache/routing.validation';
import { CONTENT_TYPES, type ExplorerRequest } from './explorer.types';

/** 검색 버튼에서 보낸 검색어만 받는다. URL·인증키 등 임의 제공자 설정은 받지 않는다. */
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
    categories.length > 10 ||
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

import { invalid, object } from './routing.errors';
import type { RoutePoint, RouteRequest, TrafficRequest } from './routing.types';

export function coordinate(value: unknown, limit: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Math.abs(value) <= limit
  );
}
export function routeRequest(body: unknown): RouteRequest {
  if (
    !object(body) ||
    Object.keys(body).some(
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
export function trafficRequest(query: unknown): TrafficRequest {
  if (
    !object(query) ||
    Object.keys(query).some(
      (key) =>
        !['minX', 'maxX', 'minY', 'maxY', 'type', 'drcType'].includes(key),
    )
  )
    return invalid('query');
  const number = (key: string) => {
    const value = query[key];
    if (
      typeof value !== 'string' ||
      !/^-?\d+(?:\.\d+)?$/.test(value) ||
      !Number.isFinite(Number(value))
    )
      return invalid(key);
    return Number(value);
  };
  const minX = number('minX'),
    maxX = number('maxX'),
    minY = number('minY'),
    maxY = number('maxY');
  if (
    minX < 124 ||
    maxX > 132 ||
    minY < 33 ||
    maxY > 39 ||
    minX >= maxX ||
    minY >= maxY ||
    maxX - minX > 0.200000001 ||
    maxY - minY > 0.200000001
  )
    return invalid('국내 조회 영역 (경도·위도 폭 각각 최대 0.2도)');
  if (
    (query.type !== undefined && query.type !== 'all') ||
    (query.drcType !== undefined && query.drcType !== 'all')
  )
    return invalid('type/drcType (all)');
  return {
    contractVersion: 2,
    minX,
    maxX,
    minY,
    maxY,
    type: 'all',
    drcType: 'all',
    getType: 'json',
  };
}

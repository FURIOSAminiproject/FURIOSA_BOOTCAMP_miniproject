import { invalid, object } from './routing.errors';
import type { RoutePoint, RouteRequest } from './routing.types';

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

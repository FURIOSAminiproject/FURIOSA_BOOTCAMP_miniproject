import { finite, object, providerError } from './routing.errors';
import { coordinate } from './routing.validation';
import { providerConfig, providerJson } from './provider-http';
import type {
  Coordinate,
  DataProvider,
  OrsRequest,
  RouteData,
  TimeSpan,
} from './routing.types';

export function validateRouteData(data: unknown): RouteData {
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
    !Array.isArray(data.warnings) ||
    (data.attribution !== null && typeof data.attribution !== 'string')
  )
    return fail();
  const coordinates: Coordinate[] = data.geometry.coordinates.map(
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
  const warnings = data.warnings.map((warning: unknown) => {
    if (
      !object(warning) ||
      !Number.isInteger(warning.code) ||
      typeof warning.message !== 'string'
    )
      return fail();
    return { code: warning.code as number, message: warning.message };
  });
  return {
    distanceMeters: data.distanceMeters,
    durationSeconds: data.durationSeconds,
    geometry: { type: 'LineString', coordinates },
    timeSpans,
    attribution: data.attribution as string | null,
    warnings,
  };
}
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
export class OrsProvider implements DataProvider<OrsRequest, RouteData> {
  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly transport: typeof fetch = fetch,
  ) {}
  sourceUrl(request: OrsRequest): string {
    return `https://api.heigit.org/openrouteservice/v2/directions/${request.profile}/geojson`;
  }
  async fetch(request: OrsRequest): Promise<RouteData> {
    const config = providerConfig('ORS', this.env);
    const body = {
      coordinates: request.coordinates,
      preference: request.preference,
      units: request.units,
      instructions: request.instructions,
    };
    return parseOrs(
      await providerJson(
        'ORS',
        this.sourceUrl(request),
        {
          method: 'POST',
          headers: {
            Authorization: config.key,
            'Content-Type': 'application/json',
            Accept: 'application/geo+json',
          },
          body: JSON.stringify(body),
        },
        config.timeoutMs,
        this.transport,
      ),
    );
  }
}

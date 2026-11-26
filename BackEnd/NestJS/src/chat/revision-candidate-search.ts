import type { DestinationItinerary } from '../route-explorer/destination-itinerary';
import type {
  ExplorerRepository,
  RevisionCandidateKind,
} from '../route-explorer/explorer.repository';
import type { SpotPlace } from '../route-explorer/explorer.types';
import { safeDiagnostics } from '../routing-cache/routing.errors';
import type { AiTrace } from './ai-diagnostics';
import { isSpotPlace } from './itinerary-revision';

export interface CandidateSearchRequest {
  kind: RevisionCandidateKind;
  dayNumber?: number;
  keyword?: string;
}
export interface CandidateSearchSummary {
  round: number;
  status: 'completed' | 'partial' | 'failed';
  kind: RevisionCandidateKind;
  radiusMeters: number;
  centerCount: number;
  newCandidateCount: number;
  failedLookups: number;
  limited: boolean;
}

/** 모델은 제한된 검색 조건만 요청할 수 있다. SQL·반경·조회 횟수는 서버가 정한다. */
export function parseCandidateSearch(
  value: unknown,
  itinerary: DestinationItinerary,
): CandidateSearchRequest | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (
    Object.keys(input).some(
      (key) => !['kind', 'dayNumber', 'keyword'].includes(key),
    ) ||
    typeof input.kind !== 'string' ||
    !['cafe', 'food', 'sightseeing'].includes(input.kind)
  )
    return null;
  if (
    input.dayNumber !== undefined &&
    (!Number.isInteger(input.dayNumber) ||
      !itinerary.days.some((day) => day.dayNumber === input.dayNumber))
  )
    return null;
  if (
    input.keyword !== undefined &&
    (typeof input.keyword !== 'string' ||
      !input.keyword.trim() ||
      input.keyword.trim().length > 50)
  )
    return null;
  return {
    kind: input.kind as RevisionCandidateKind,
    ...(input.dayNumber !== undefined
      ? { dayNumber: input.dayNumber as number }
      : {}),
    ...(typeof input.keyword === 'string'
      ? { keyword: input.keyword.trim() }
      : {}),
  };
}

/** 목적지와 지정 날짜의 첫·마지막 방문지에서 최대 3개 SELECT를 병렬 실행한다. */
export async function searchRevisionCandidates(
  repository: Pick<ExplorerRepository, 'revisionCandidates'>,
  request: CandidateSearchRequest,
  itinerary: DestinationItinerary,
  destination: { latitude: number; longitude: number },
  mode: 'driving' | 'walking',
  existing: SpotPlace[],
  trace: AiTrace,
  round = 1,
  serverRadiusMeters?: number,
): Promise<{ places: SpotPlace[]; summary: CandidateSearchSummary }> {
  const day = itinerary.days.find(
    (item) => item.dayNumber === request.dayNumber,
  );
  const centers = [
    ...new Map(
      [destination, day?.visits[0]?.place, day?.visits.at(-1)?.place]
        .filter(
          (point): point is { latitude: number; longitude: number } => !!point,
        )
        .map((point) => [
          `${point.longitude.toFixed(6)},${point.latitude.toFixed(6)}`,
          point,
        ]),
    ).values(),
  ].slice(0, 3);
  const steps = mode === 'walking' ? [1000, 5000] : [5000, 20000];
  const radiusMeters = serverRadiusMeters ?? steps[1];
  if (!steps.includes(radiusMeters))
    throw new Error('Invalid server search radius');
  const excluded = new Set(existing.map((place) => place.id));
  trace.emit('ai_revision_candidate_search_started', {
    round,
    kind: request.kind,
    dayNumber: request.dayNumber,
    keywordPresent: !!request.keyword,
    radiusMeters,
    centerCount: centers.length,
    excludedCount: excluded.size,
  });
  const results = await Promise.allSettled(
    centers.map((center) =>
      repository.revisionCandidates(center, destination, {
        kind: request.kind,
        keyword: request.keyword,
        excludePlaceIds: [...excluded],
        radiusMeters,
        limit: 24,
      }),
    ),
  );
  const found: SpotPlace[] = [];
  let failedLookups = 0;
  let limited = false;
  for (const result of results) {
    if (result.status === 'fulfilled') {
      found.push(...result.value.places);
      limited ||= result.value.limited;
    } else {
      failedLookups++;
      trace.emit(
        'ai_revision_candidate_search_lookup_failed',
        safeDiagnostics(result.reason),
        'warn',
      );
    }
  }
  const places = [
    ...new Map(
      found
        .filter(isSpotPlace)
        .filter((place) => !excluded.has(place.id))
        .map((place) => [place.id, place]),
    ).values(),
  ];
  const summary: CandidateSearchSummary = {
    round,
    status:
      failedLookups === results.length
        ? 'failed'
        : failedLookups
          ? 'partial'
          : 'completed',
    kind: request.kind,
    radiusMeters,
    centerCount: centers.length,
    newCandidateCount: places.length,
    failedLookups,
    limited,
  };
  trace.emit(
    'ai_revision_candidate_search_completed',
    { ...summary },
    failedLookups ? 'warn' : 'log',
  );
  return { places, summary };
}

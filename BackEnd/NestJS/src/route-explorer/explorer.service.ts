import type { RoutePlanner } from '../routing-cache/routing.ports';
import { RoutingError } from '../routing-cache/routing.errors';
import type { ExplorerRepository } from './explorer.repository';
import { RouteProximity } from './route-proximity';
import { DestinationCurator } from './destination-curator';
import {
  buildDestinationItinerary,
  type DestinationItineraryRequest,
} from './destination-itinerary';
import {
  findCoordinateAtElapsedSeconds,
  formatSecondsToTime,
  parseTimeToSeconds,
} from './timeline-calculator';
import type {
  ExplorerRequest,
  ExplorerResponse,
  ExplorerRoute,
  NearbyPlacesRequest,
  NearbyPlacesResponse,
  TimelineRequest,
  TimelineResponse,
  TimelineStopResult,
} from './explorer.types';

/** ORS 두 경로와 TourAPI DB 추천, 타임라인 길목 추천 및 거점 반경 추천을 조립한다. */
export class ExplorerService {
  constructor(
    private readonly planner: RoutePlanner,
    private readonly places: Pick<
      ExplorerRepository,
      'candidates' | 'placesAroundSpot'
    >,
    private readonly curator?: DestinationCurator,
  ) {}

  /** 경로 위 후보와 별도로 도착지 주변 관광·식사·숙박 후보를 수집한다. */
  async destinationItinerary(request: DestinationItineraryRequest) {
    const route = await this.planner.route({
      mode: request.mode,
      preference: request.preference,
      points: request.points,
    });
    const center = request.points[request.points.length - 1];
    const warnings: string[] = [];
    const find = async (
      label: string,
      contentTypeIds: number[],
      categoryIds: string[] = [],
    ) => {
      try {
        const filter = {
          contentTypeIds,
          categoryIds,
          radiusMeters: request.mode === 'walking' ? 3000 : 10000,
          limit: 20,
        };
        let result = await this.places.placesAroundSpot(center, filter);
        if (!result.places.length)
          result = await this.places.placesAroundSpot(center, {
            ...filter,
            radiusMeters: request.mode === 'walking' ? 5000 : 20000,
          });
        if (!result.places.length)
          warnings.push(`${label}에 해당하는 등록 장소가 부족합니다.`);
        return result.places;
      } catch {
        warnings.push(
          `${label} 후보를 조회하지 못했습니다. 해당 항목은 재조회가 필요합니다.`,
        );
        return [];
      }
    };
    const [sights, food, themed, stays] = await Promise.all([
      find('관광·문화', [12, 14, 28, 38]),
      find('맛집·카페', [39]),
      request.categoryIds.length
        ? find('선호 장소', [], request.categoryIds)
        : Promise.resolve([]),
      request.startDate !== request.endDate
        ? find('숙박', [32])
        : Promise.resolve([]),
    ]);
    const candidates = { sights, food, themed, stays };
    const curatedDays = this.curator
      ? await this.curator.choose(request, route.durationSeconds, candidates)
      : [];
    return buildDestinationItinerary(
      request,
      route,
      candidates,
      warnings,
      curatedDays,
    );
  }

  async compare(request: ExplorerRequest): Promise<ExplorerResponse> {
    const errors: unknown[] = [];
    const routes = await Promise.all(
      (['recommended', 'shortest'] as const).map(async (preference) => {
        const result: ExplorerRoute = {
          preference,
          route: null,
          places: [],
          candidateLimitReached: false,
          routeError: null,
          recommendationError: null,
        };
        try {
          result.route = await this.planner.route({
            mode: request.mode,
            points: request.points,
            preference,
          });
        } catch (error) {
          errors.push(error);
          result.routeError = safeMessage(error, '경로를 조회하지 못했습니다.');
          return result;
        }
        if (!request.contentTypeIds.length && !request.categoryIds.length)
          return result;
        try {
          const proximity = new RouteProximity(
            result.route.geometry.coordinates,
            request.radiusMeters,
          );
          const candidates = await this.places.candidates(
            request,
            proximity.bounds,
          );
          result.candidateLimitReached = candidates.limited;
          result.places = candidates.places
            .map((place) => ({
              ...place,
              distanceToRouteMeters: proximity.distance([
                place.longitude,
                place.latitude,
              ]),
            }))
            .filter(
              (place) => place.distanceToRouteMeters <= request.radiusMeters,
            )
            .sort(
              (a, b) =>
                a.distanceToRouteMeters - b.distanceToRouteMeters ||
                a.id.localeCompare(b.id),
            )
            .slice(0, request.limit)
            .map((place) => ({
              ...place,
              distanceToRouteMeters: Math.round(place.distanceToRouteMeters),
            }));
        } catch (error) {
          result.recommendationError = safeMessage(
            error,
            '경로 주변 장소 추천을 처리하지 못했습니다.',
          );
        }
        return result;
      }),
    );
    // 둘 다 실패하면 HTTP 오류다. 한 경로만 실패했을 때는 성공한 경로를 보존한다.
    if (routes.every((result) => !result.route)) {
      const error = errors.find((item) => item instanceof RoutingError);
      if (error) throw error;
      throw new RoutingError(
        503,
        'PROVIDER_UNAVAILABLE',
        '경로를 조회하지 못했습니다.',
      );
    }
    return {
      routes,
      radiusMeters: request.radiusMeters,
      recommendationBasis: 'distance_to_route',
    };
  }

  /**
   * 출발 시간과 식사/휴식 시각을 기반으로 경로 통과 지점의 좌표를 찾고 주변 장소를 추천한다.
   */
  async timeline(request: TimelineRequest): Promise<TimelineResponse> {
    const route = await this.planner.route({
      mode: request.mode,
      points: request.points,
      preference: request.preference ?? 'recommended',
    });

    const departureSeconds = parseTimeToSeconds(request.departureTime);
    const arrivalSeconds = departureSeconds + route.durationSeconds;
    const estimatedArrivalTime = formatSecondsToTime(arrivalSeconds);

    const stops: TimelineStopResult[] = await Promise.all(
      request.stops.map(async (stop) => {
        const targetSeconds = parseTimeToSeconds(stop.targetTime);
        let elapsedSeconds = targetSeconds - departureSeconds;
        // 자정을 넘기는 일정 처리 (예: 출발 23:00, 목표 01:00)
        if (elapsedSeconds < 0) {
          elapsedSeconds += 86400;
        }

        const isAtDestination = elapsedSeconds >= route.durationSeconds;
        const waypointCoord = findCoordinateAtElapsedSeconds(
          route.geometry.coordinates,
          route.timeSpans,
          route.durationSeconds,
          elapsedSeconds,
        );

        const result: TimelineStopResult = {
          label: stop.label,
          targetTime: stop.targetTime,
          elapsedSeconds,
          isAtDestination,
          waypoint: {
            longitude: waypointCoord[0],
            latitude: waypointCoord[1],
          },
          places: [],
          candidateLimitReached: false,
          error: null,
        };

        try {
          let found = await this.places.placesAroundSpot(
            { latitude: waypointCoord[1], longitude: waypointCoord[0] },
            {
              categoryIds: stop.categoryIds,
              contentTypeIds: stop.contentTypeIds,
              radiusMeters: stop.radiusMeters,
              limit: stop.limit,
            },
          );
          // 주변 장소가 0건인 경우 고속도로 및 국도 특성을 감안해 최대 20km까지 반경을 단계적으로 확장 검색
          if (found.places.length === 0 && stop.radiusMeters < 20000) {
            const fallbackRadius = Math.min(
              20000,
              Math.max(15000, stop.radiusMeters * 2),
            );
            const retry = await this.places.placesAroundSpot(
              { latitude: waypointCoord[1], longitude: waypointCoord[0] },
              {
                categoryIds: stop.categoryIds,
                contentTypeIds: stop.contentTypeIds,
                radiusMeters: fallbackRadius,
                limit: stop.limit,
              },
            );
            if (retry.places.length > 0) {
              found = retry;
            }
          }
          result.places = found.places;
          result.candidateLimitReached = found.limited;
        } catch (err) {
          result.error = safeMessage(
            err,
            '경유 스팟 주변 장소를 조회하지 못했습니다.',
          );
        }

        return result;
      }),
    );

    return {
      departureTime: request.departureTime,
      estimatedArrivalTime,
      totalDistanceMeters: route.distanceMeters,
      totalDurationSeconds: route.durationSeconds,
      routeGeometry: route.geometry,
      stops,
    };
  }

  /**
   * 특정 위경도 좌표(거점) 반경 내 장소들을 거리순으로 추천한다.
   */
  async nearby(request: NearbyPlacesRequest): Promise<NearbyPlacesResponse> {
    const found = await this.places.placesAroundSpot(
      { latitude: request.latitude, longitude: request.longitude },
      {
        categoryIds: request.categoryIds,
        contentTypeIds: request.contentTypeIds,
        radiusMeters: request.radiusMeters,
        limit: request.limit,
      },
    );

    return {
      center: {
        latitude: request.latitude,
        longitude: request.longitude,
      },
      radiusMeters: request.radiusMeters,
      places: found.places,
      candidateLimitReached: found.limited,
    };
  }
}

function safeMessage(error: unknown, fallback: string): string {
  if (error instanceof RoutingError) {
    const response = error.getResponse();
    if (
      typeof response === 'object' &&
      response !== null &&
      'message' in response &&
      typeof response.message === 'string'
    )
      return response.message;
  }
  return fallback;
}

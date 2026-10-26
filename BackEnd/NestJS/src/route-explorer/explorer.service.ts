import type { RoutePlanner } from '../routing-cache/routing.ports';
import { RoutingError } from '../routing-cache/routing.errors';
import type { ExplorerRepository } from './explorer.repository';
import { RouteProximity } from './route-proximity';
import type {
  ExplorerRequest,
  ExplorerResponse,
  ExplorerRoute,
} from './explorer.types';

/** ORS 두 경로와 TourAPI DB 추천을 조립한다. 추천 장소를 원래 경로의 경유지로 바꾸지 않는다. */
export class ExplorerService {
  constructor(
    private readonly planner: RoutePlanner,
    private readonly places: Pick<ExplorerRepository, 'candidates'>,
  ) {}

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

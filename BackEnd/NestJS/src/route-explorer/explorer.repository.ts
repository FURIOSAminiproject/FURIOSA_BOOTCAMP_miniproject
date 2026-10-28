import type { DataSource } from 'typeorm';
import { coordinate } from '../routing-cache/routing.validation';
import type { Coordinate } from '../routing-cache/routing.types';
import { RoutingError } from '../routing-cache/routing.errors';
import type {
  ExplorerRequest,
  PlaceCategory,
  RecommendedPlace,
  SpotPlace,
} from './explorer.types';

export const CANDIDATE_LIMIT = 2000;
const SELECTED_CATEGORIES = `WITH RECURSIVE selected(category_id) AS (
  SELECT category_id FROM public.place_categories WHERE category_id=ANY($1::uuid[])
  UNION
  SELECT c.category_id FROM public.place_categories c JOIN selected s ON c.parent_category_id=s.category_id
)`;
const CATEGORY_FILTER = `AND (cardinality($2::smallint[])=0 OR p.content_type_id=ANY($2::smallint[]))
  AND (cardinality($1::uuid[])=0 OR p.category_id IN (SELECT category_id FROM selected))`;

/** places.location의 PostGIS 공간 좌표를 조회한다. 스키마 변경은 관리자가 별도로 수행한다. */
export class ExplorerRepository {
  constructor(private readonly db: Pick<DataSource, 'query'>) {}

  async categories(): Promise<PlaceCategory[]> {
    try {
      const rows: {
        category_id: string;
        category_name: string;
        category_level: number;
        parent_category_id: string | null;
      }[] = await this.db.query(
        'SELECT category_id,category_name,category_level,parent_category_id FROM place_categories ORDER BY category_level,category_name,category_id',
      );
      return rows.map((row) => ({
        id: row.category_id,
        name: row.category_name,
        level: Number(row.category_level),
        parentId: row.parent_category_id,
      }));
    } catch {
      throw new RoutingError(
        503,
        'PLACE_CATEGORIES_UNAVAILABLE',
        '장소 상세 분류를 조회하지 못했습니다.',
      );
    }
  }

  /** 경로 좌표 전체를 받아 DB에서 반경 필터·측지거리 정렬 후 최대 후보 수만 반환한다. */
  async candidates(
    request: ExplorerRequest,
    coordinates: Coordinate[],
  ): Promise<{ places: RecommendedPlace[]; limited: boolean }> {
    try {
      const rows: Record<string, unknown>[] = await this.db.query(
        `${SELECTED_CATEGORIES}, search_area AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON($3::text),4326)::geography AS location
        )
        SELECT p.place_id,p.name,p.address,p.latitude,p.longitude,p.content_type_id,c.category_name,
               ST_Distance(p.location,q.location) AS distance_meters
        FROM public.places p CROSS JOIN search_area q
        LEFT JOIN public.place_categories c ON c.category_id=p.category_id
        WHERE p.is_active=true AND p.location IS NOT NULL
          AND ST_DWithin(p.location,q.location,$4::double precision)
          ${CATEGORY_FILTER}
        ORDER BY distance_meters ASC,p.place_id LIMIT $5`,
        [
          request.categoryIds,
          request.contentTypeIds,
          JSON.stringify({ type: 'LineString', coordinates }),
          request.radiusMeters,
          CANDIDATE_LIMIT + 1,
        ],
      );
      const places = this.mapPlaces(
        rows,
        CANDIDATE_LIMIT,
        request.radiusMeters,
      ).map(({ distanceMeters, ...place }) => ({
        ...place,
        distanceToRouteMeters: distanceMeters,
      }));
      return { places, limited: rows.length > CANDIDATE_LIMIT };
    } catch {
      throw new RoutingError(
        503,
        'PLACE_RECOMMENDATIONS_UNAVAILABLE',
        '경로 주변 장소를 조회하지 못했습니다. PostGIS와 장소 공간 컬럼 설정을 확인해 주세요.',
      );
    }
  }

  /** 거점 좌표와 조건으로 주변 장소를 조회한다. 경도=X, 위도=Y이며 거리 단위는 m다. */
  async placesAroundSpot(
    spot: { latitude: number; longitude: number },
    filter: {
      contentTypeIds: number[];
      categoryIds: string[];
      radiusMeters: number;
      limit: number;
    },
  ): Promise<{ places: SpotPlace[]; limited: boolean }> {
    try {
      const rows: Record<string, unknown>[] = await this.db.query(
        `${SELECTED_CATEGORIES}, search_area AS (
          SELECT ST_SetSRID(ST_MakePoint($3::double precision,$4::double precision),4326)::geography AS location
        )
        SELECT p.place_id,p.name,p.address,p.latitude,p.longitude,p.content_type_id,c.category_name,
               ST_Distance(p.location,q.location) AS distance_meters
        FROM public.places p CROSS JOIN search_area q
        LEFT JOIN public.place_categories c ON c.category_id=p.category_id
        WHERE p.is_active=true AND p.location IS NOT NULL
          AND ST_DWithin(p.location,q.location,$5::double precision)
          ${CATEGORY_FILTER}
        ORDER BY distance_meters ASC,p.place_id LIMIT $6`,
        [
          filter.categoryIds,
          filter.contentTypeIds,
          spot.longitude,
          spot.latitude,
          filter.radiusMeters,
          filter.limit + 1,
        ],
      );
      return {
        places: this.mapPlaces(rows, filter.limit, filter.radiusMeters).map(
          (place) => ({
            ...place,
            distanceMeters: Math.round(place.distanceMeters),
          }),
        ),
        limited: rows.length > filter.limit,
      };
    } catch {
      throw new RoutingError(
        503,
        'PLACE_RECOMMENDATIONS_UNAVAILABLE',
        '거점 주변 장소를 조회하지 못했습니다. PostGIS와 장소 공간 컬럼 설정을 확인해 주세요.',
      );
    }
  }

  private mapPlaces(
    rows: Record<string, unknown>[],
    limit: number,
    radius: number,
  ): SpotPlace[] {
    const places: SpotPlace[] = [];
    for (const row of rows.slice(0, limit)) {
      const latitude =
        row.latitude === null || row.latitude === undefined
          ? null
          : Number(row.latitude);
      const longitude =
        row.longitude === null || row.longitude === undefined
          ? null
          : Number(row.longitude);
      const distance =
        row.distance_meters === null || row.distance_meters === undefined
          ? NaN
          : Number(row.distance_meters);
      if (
        !coordinate(latitude, 90) ||
        !coordinate(longitude, 180) ||
        !Number.isFinite(distance) ||
        distance < 0 ||
        distance > radius ||
        typeof row.place_id !== 'string' ||
        typeof row.name !== 'string'
      )
        continue;
      places.push({
        id: row.place_id,
        name: row.name,
        address: typeof row.address === 'string' ? row.address : '',
        latitude,
        longitude,
        contentTypeId: Number(row.content_type_id),
        categoryName:
          typeof row.category_name === 'string' ? row.category_name : null,
        distanceMeters: distance,
      });
    }
    return places;
  }
}

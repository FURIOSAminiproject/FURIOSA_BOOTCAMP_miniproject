import type { DataSource } from 'typeorm';
import { coordinate } from '../routing-cache/routing.validation';
import { RoutingError } from '../routing-cache/routing.errors';
import type {
  ExplorerRequest,
  PlaceCandidate,
  PlaceCategory,
} from './explorer.types';
import type { RouteProximity } from './route-proximity';

export const CANDIDATE_LIMIT = 2000;

/** 기존 TourAPI 장소/분류 테이블을 읽기만 한다. PostGIS나 자동 DDL을 요구하지 않는다. */
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

  /**
   * 유형과 선택한 상세 분류(하위 분류 포함), 경로 경계상자로 먼저 제한한다.
   * 두 필터를 함께 지정하면 교집합이다. SQL 값은 모두 매개변수로 전달한다.
   * 후보 한도 초과는 호출자가 사용자에게 알리고 빈 결과로 숨기지 않는다.
   */
  async candidates(
    request: ExplorerRequest,
    bounds: RouteProximity['bounds'],
  ): Promise<{ places: PlaceCandidate[]; limited: boolean }> {
    try {
      const rows: Record<string, unknown>[] = await this.db.query(
        `
        WITH RECURSIVE selected(category_id) AS (
          SELECT category_id FROM place_categories WHERE category_id=ANY($1::uuid[])
          UNION
          SELECT c.category_id FROM place_categories c JOIN selected s ON c.parent_category_id=s.category_id
        )
        SELECT p.place_id,p.name,p.address,p.latitude,p.longitude,p.content_type_id,c.category_name
        FROM places p LEFT JOIN place_categories c ON c.category_id=p.category_id
        WHERE p.is_active=true AND p.latitude BETWEEN $3 AND $4 AND p.longitude BETWEEN $5 AND $6
          AND (cardinality($2::smallint[])=0 OR p.content_type_id=ANY($2::smallint[]))
          AND (cardinality($1::uuid[])=0 OR p.category_id IN (SELECT category_id FROM selected))
        ORDER BY p.place_id LIMIT $7
      `,
        [
          request.categoryIds,
          request.contentTypeIds,
          bounds.minLat,
          bounds.maxLat,
          bounds.minLon,
          bounds.maxLon,
          CANDIDATE_LIMIT + 1,
        ],
      );
      const places: PlaceCandidate[] = [];
      for (const row of rows.slice(0, CANDIDATE_LIMIT)) {
        const latitude = row.latitude === null ? null : Number(row.latitude);
        const longitude = row.longitude === null ? null : Number(row.longitude);
        if (
          !coordinate(latitude, 90) ||
          !coordinate(longitude, 180) ||
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
        });
      }
      return { places, limited: rows.length > CANDIDATE_LIMIT };
    } catch {
      throw new RoutingError(
        503,
        'PLACE_RECOMMENDATIONS_UNAVAILABLE',
        '경로 주변 장소를 조회하지 못했습니다.',
      );
    }
  }
}

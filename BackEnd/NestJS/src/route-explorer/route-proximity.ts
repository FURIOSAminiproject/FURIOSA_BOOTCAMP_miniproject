import type { Coordinate } from '../routing-cache/routing.types';
import { RoutingError } from '../routing-cache/routing.errors';

const RADIANS = Math.PI / 180;
const EARTH_RADIUS = 6371008.8;
type XY = [number, number];
interface Segment {
  start: XY;
  dx: number;
  dy: number;
  squared: number;
}

/**
 * 전체 경로 선분을 지역 평면에 투영해 인접 격자만 검사한다.
 * 장소/경로의 직선거리 근사이며 실제 진입로·우회시간을 의미하지 않는다.
 * 꼭짓점만 검사하지 않으므로 긴 선분 중간에 있는 장소도 찾는다.
 */
export class RouteProximity {
  readonly bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  private readonly xScale: number;
  private readonly yScale = EARTH_RADIUS * RADIANS;
  private readonly origin: Coordinate;
  private readonly segments: Segment[] = [];
  private readonly cells = new Map<string, Set<number>>();

  constructor(
    coordinates: Coordinate[],
    private readonly radius: number,
  ) {
    let minLat = 90,
      maxLat = -90,
      minLon = 180,
      maxLon = -180;
    for (const [lon, lat] of coordinates) {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLon = Math.min(minLon, lon);
      maxLon = Math.max(maxLon, lon);
    }
    this.origin = [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
    this.xScale =
      this.yScale * Math.max(0.01, Math.cos(this.origin[1] * RADIANS));
    const latMargin = radius / this.yScale;
    const lonMargin = radius / this.xScale;
    this.bounds = {
      minLat: minLat - latMargin,
      maxLat: maxLat + latMargin,
      minLon: minLon - lonMargin,
      maxLon: maxLon + lonMargin,
    };
    let work = 0;
    for (let i = 1; i < coordinates.length; i++) {
      const start = this.project(coordinates[i - 1]),
        end = this.project(coordinates[i]);
      const dx = end[0] - start[0],
        dy = end[1] - start[1];
      const segment = { start, dx, dy, squared: dx * dx + dy * dy };
      const index = this.segments.push(segment) - 1;
      // 반 셀 이하 간격으로 통과 셀을 등록한다. 거리는 원래 선분 전체에서 계산한다.
      const count = Math.max(
        1,
        Math.ceil(Math.sqrt(segment.squared) / (radius / 2)),
      );
      work += count + 1;
      if (work > 500000)
        throw new RoutingError(
          422,
          'ROUTE_RECOMMENDATION_TOO_COMPLEX',
          '장소 추천을 계산하기에 경로가 너무 깁니다. 더 짧은 구간으로 나누어 조회해 주세요.',
        );
      for (let step = 0; step <= count; step++) {
        const x = Math.floor((start[0] + (dx * step) / count) / radius);
        const y = Math.floor((start[1] + (dy * step) / count) / radius);
        const key = `${x}:${y}`;
        const cell = this.cells.get(key) ?? new Set<number>();
        cell.add(index);
        this.cells.set(key, cell);
      }
    }
  }

  /** 반경 안에 있는 선분까지의 최소 거리(m), 반경 밖이면 Infinity. */
  distance(coordinate: Coordinate): number {
    const point = this.project(coordinate);
    const x = Math.floor(point[0] / this.radius),
      y = Math.floor(point[1] / this.radius);
    const candidates = new Set<number>();
    for (let a = -2; a <= 2; a++)
      for (let b = -2; b <= 2; b++)
        for (const index of this.cells.get(`${x + a}:${y + b}`) ?? [])
          candidates.add(index);
    let squared = Infinity;
    for (const index of candidates) {
      const s = this.segments[index];
      const t =
        s.squared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((point[0] - s.start[0]) * s.dx +
                  (point[1] - s.start[1]) * s.dy) /
                  s.squared,
              ),
            );
      const dx = point[0] - s.start[0] - t * s.dx,
        dy = point[1] - s.start[1] - t * s.dy;
      squared = Math.min(squared, dx * dx + dy * dy);
    }
    return Math.sqrt(squared);
  }

  private project([lon, lat]: Coordinate): XY {
    return [
      (lon - this.origin[0]) * this.xScale,
      (lat - this.origin[1]) * this.yScale,
    ];
  }
}

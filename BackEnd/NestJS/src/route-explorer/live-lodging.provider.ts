import { TourApiClient, tourConfig } from '../places/tour-api.client';
import type { SpotPlace } from './explorer.types';

type Center = { latitude: number; longitude: number };
type TourPageReader = Pick<TourApiClient, 'page'>;

function distanceMeters(a: Center, b: Center): number {
  const rad = Math.PI / 180;
  const lat = (b.latitude - a.latitude) * rad;
  const lon = (b.longitude - a.longitude) * rad;
  const value =
    Math.sin(lat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(lon / 2) ** 2;
  return (
    6371008.8 *
    2 *
    Math.atan2(Math.sqrt(value), Math.sqrt(Math.max(0, 1 - value)))
  );
}

/** DB에 가까운 숙박 후보가 없을 때 TourAPI의 실제 숙박 유형을 직접 조회한다. */
export class LiveLodgingProvider {
  constructor(
    private readonly clientFactory: () => TourPageReader = () =>
      new TourApiClient(tourConfig(process.env)),
  ) {}

  async nearby(center: Center): Promise<SpotPlace[]> {
    const page = await this.clientFactory().page('locationBasedList2', {
      mapX: center.longitude,
      mapY: center.latitude,
      radius: 20000,
      contentTypeId: 32,
      arrange: 'E',
      numOfRows: 30,
      pageNo: 1,
    });
    const results: SpotPlace[] = [];
    for (const item of page.items) {
      const latitude = Number(item.mapy);
      const longitude = Number(item.mapx);
      const name =
        typeof item.title === 'string' ? item.title.trim().slice(0, 120) : '';
      const contentId =
        typeof item.contentid === 'string' || typeof item.contentid === 'number'
          ? String(item.contentid).trim()
          : '';
      if (
        Number(item.contenttypeid) !== 32 ||
        !/^\d{1,20}$/.test(contentId) ||
        !name ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      )
        continue;
      const distance = distanceMeters(center, { latitude, longitude });
      if (distance > 20000) continue;
      results.push({
        id: `tourapi:${contentId}`,
        name,
        address: [item.addr1, item.addr2]
          .filter((part): part is string => typeof part === 'string')
          .join(' ')
          .trim(),
        latitude,
        longitude,
        contentTypeId: 32,
        categoryName: '숙박',
        distanceMeters: Math.round(distance),
      });
    }
    return [...new Map(results.map((place) => [place.id, place])).values()]
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 3);
  }
}

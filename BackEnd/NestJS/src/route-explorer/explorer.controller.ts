import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { ExplorerService } from './explorer.service';
import { ExplorerRepository } from './explorer.repository';
import { GeocodingProvider } from './geocoding.provider';
import { CONTENT_TYPES } from './explorer.types';
import {
  explorerRequest,
  nearbyPlacesRequest,
  timelineRequest,
} from './explorer.validation';

/** 지도 검색·경로 비교·타임라인 추천 API. 검색어/키/원본 제공자 오류를 로그에 출력하지 않는다. */
@Controller()
export class ExplorerController {
  constructor(
    @Inject(GeocodingProvider) private readonly search: GeocodingProvider,
    @Inject(ExplorerRepository) private readonly places: ExplorerRepository,
    @Inject(ExplorerService) private readonly explorer: ExplorerService,
  ) {}

  @Get('map/search')
  async searchPlaces(@Query('q') query: unknown) {
    return { places: await this.search.search(query) };
  }

  @Get('routes/categories')
  async categories() {
    // DB 상세 분류 조회 실패가 기본 유형 선택과 경로 비교까지 막지는 않는다.
    try {
      return {
        contentTypes: CONTENT_TYPES,
        categories: await this.places.categories(),
        warning: null,
      };
    } catch {
      return {
        contentTypes: CONTENT_TYPES,
        categories: [],
        warning:
          '카테고리를 불러오지 못했습니다. 경로 비교는 계속 사용할 수 있습니다.',
      };
    }
  }

  @Post('routes/compare')
  @HttpCode(200)
  compare(@Body() body: unknown) {
    return this.explorer.compare(explorerRequest(body));
  }

  /**
   * 출발 시간과 식사/휴식 시각을 입력받아, 해당 시간대에 지나는 도로 주변 실제 장소를 추천한다.
   * 각 스팟별로 categoryIds(DB 분류)와 contentTypeIds를 모두 지정할 수 있다.
   */
  @Post('routes/timeline')
  @HttpCode(200)
  timeline(@Body() body: unknown) {
    return this.explorer.timeline(timelineRequest(body));
  }

  /**
   * 특정 위경도 좌표(거점/관광지) 주변의 실제 등록 장소들을 거리순으로 추천한다. (POST)
   */
  @Post('places/nearby')
  @HttpCode(200)
  nearby(@Body() body: unknown) {
    return this.explorer.nearby(nearbyPlacesRequest(body));
  }

  /**
   * 특정 위경도 좌표 주변 추천 조회 (GET 쿼리스트링 지원)
   * 예: /api/places/nearby?lat=37.55&lng=126.97&radius=3000&contentTypes=39,12
   */
  @Get('places/nearby')
  nearbyQuery(
    @Query('lat') lat: unknown,
    @Query('lng') lng: unknown,
    @Query('radius') radius?: unknown,
    @Query('limit') limit?: unknown,
    @Query('contentTypes') contentTypes?: unknown,
    @Query('categories') categories?: unknown,
  ) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    const radiusMeters = radius !== undefined ? Number(radius) : undefined;
    const limitNum = limit !== undefined ? Number(limit) : undefined;
    const contentTypeIds =
      typeof contentTypes === 'string'
        ? contentTypes
            .split(',')
            .map((s) => Number(s.trim()))
            .filter(Number.isInteger)
        : undefined;
    const categoryIds =
      typeof categories === 'string'
        ? categories
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    return this.explorer.nearby(
      nearbyPlacesRequest({
        latitude,
        longitude,
        radiusMeters,
        limit: limitNum,
        contentTypeIds,
        categoryIds,
      }),
    );
  }
}


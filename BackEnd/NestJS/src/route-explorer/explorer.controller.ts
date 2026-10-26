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
import { explorerRequest } from './explorer.validation';

/** 지도 검색·경로 비교 API. 검색어/키/원본 제공자 오류를 로그에 출력하지 않는다. */
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
          '상세 분류를 불러오지 못했습니다. 기본 카테고리를 선택할 수 있습니다.',
      };
    }
  }

  @Post('routes/compare')
  @HttpCode(200)
  compare(@Body() body: unknown) {
    return this.explorer.compare(explorerRequest(body));
  }
}

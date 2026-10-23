import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { RoutingService } from './routing.service';
import { routeRequest, trafficRequest } from './routing.validation';

@Controller()
export class RoutingController {
  constructor(
    @Inject(RoutingService) private readonly service: RoutingService,
  ) {}
  @Post('routes')
  @HttpCode(200)
  route(@Body() body: unknown) {
    return this.service.route(routeRequest(body));
  }
  @Get('traffic')
  traffic(@Query() query: unknown) {
    return this.service.traffic(trafficRequest(query));
  }
}

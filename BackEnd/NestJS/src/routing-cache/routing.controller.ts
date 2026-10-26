import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';
import { RoutingService } from './routing.service';
import { routeRequest } from './routing.validation';

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
}

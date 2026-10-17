import { Body, Controller, Inject, Post } from '@nestjs/common';
import { TravelService } from './travel.service';
import { parseTravelRequest, parseTravelPlace } from './validation';
@Controller('travel')
export class TravelController {
  constructor(@Inject(TravelService) private readonly travel: TravelService) {}
  @Post('plans') createPlan(@Body() body: unknown) { return this.travel.createPlan(parseTravelRequest(body)); }
  @Post('poetic-reviews') createPoeticReview(@Body() body: unknown) { return this.travel.createPoeticReview(parseTravelPlace(body)); }
}

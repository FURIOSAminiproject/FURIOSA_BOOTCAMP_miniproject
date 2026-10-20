import { Injectable } from '@nestjs/common';
import { buildFullTravelPlan } from './travel-engine';
import { generatePoeticReview } from './poetry.service';
import { TravelRequest, TravelPlace } from './travel.types';
@Injectable()
export class TravelService {
  createPlan(request: TravelRequest) { return buildFullTravelPlan(request); }
  createPoeticReview(place: TravelPlace) { return generatePoeticReview(place); }
}

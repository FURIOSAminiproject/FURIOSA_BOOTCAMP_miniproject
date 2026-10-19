import type { LiteraryReview, TravelPlace } from '../types/travel';
import { postJson } from './api';
export function generatePoeticReview(place: TravelPlace): Promise<LiteraryReview> {
  return postJson<LiteraryReview>('/travel/poetic-reviews', place);
}

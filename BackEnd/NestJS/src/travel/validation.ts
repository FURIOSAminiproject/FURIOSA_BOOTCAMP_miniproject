import { BadRequestException } from '@nestjs/common';
import { TravelRequest, TravelPlace } from './travel.types';
const fail = (field: string): never => { throw new BadRequestException(field + ' 값이 올바르지 않습니다.'); };
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('요청');
  return value as Record<string, unknown>;
}
function text(data: Record<string, unknown>, key: string, optional = false) {
  const value = data[key];
  if (optional && value === undefined) return;
  if (typeof value !== 'string' || value.length > 5000 || (!optional && !value.trim())) fail(key);
}
function number(data: Record<string, unknown>, key: string, min: number, max: number, integer = false) {
  const value = data[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) fail(key);
}
function choice(data: Record<string, unknown>, key: string, options: string[]) {
  if (!options.includes(data[key] as string)) fail(key);
}
function date(data: Record<string, unknown>, key: string) {
  const value = data[key];
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fail(key);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(key);
}
export function parseTravelRequest(body: unknown): TravelRequest {
  const data = object(body);
  for (const key of ['id', 'clientName', 'departureCity', 'destination']) text(data, key);
  for (const key of ['clientContact', 'specialRequests', 'createdAt', 'adminNote', 'approvedAt', 'approverName']) text(data, key, true);
  date(data, 'startDate'); date(data, 'endDate');
  const days = (Date.parse(data.endDate as string) - Date.parse(data.startDate as string)) / 86400000 + 1;
  if (days < 1 || days > 10) fail('여행 기간 (1~10일)');
  number(data, 'adultCount', 1, 100, true); number(data, 'childCount', 0, 100, true);
  number(data, 'budget', 1, 1000000000, true);
  if (!Array.isArray(data.style) || data.style.length > 20 || data.style.some(value => typeof value !== 'string' || value.length > 100)) fail('style');
  choice(data, 'transportType', ['KTX_TRAIN', 'RENTAL_CAR', 'OWN_CAR', 'FLIGHT', 'PUBLIC_TRANSIT']);
  choice(data, 'accommodationType', ['HOTEL', 'HANOK', 'RESORT', 'PENSION', 'POOL_VILLA']);
  choice(data, 'status', ['ANALYZING', 'PENDING_APPROVAL', 'APPROVED', 'REVISING', 'REJECTED']);
  return data as unknown as TravelRequest;
}
export function parseTravelPlace(body: unknown): TravelPlace {
  const data = object(body);
  for (const key of ['id', 'name', 'categoryLabel', 'description', 'address']) text(data, key);
  text(data, 'specialTip', true);
  choice(data, 'category', ['CAFE', 'RESTAURANT']);
  return data as unknown as TravelPlace;
}

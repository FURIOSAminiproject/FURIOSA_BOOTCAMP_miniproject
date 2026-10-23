import { HttpException } from '@nestjs/common';

export class RoutingError extends HttpException {
  constructor(status: number, code: string, message: string) {
    super({ statusCode: status, code, message }, status);
  }
}
export function invalid(field: string): never {
  throw new RoutingError(
    400,
    'INVALID_REQUEST',
    `${field} 요청값을 확인해 주세요.`,
  );
}
export function databaseError(error: unknown): RoutingError {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
  return new RoutingError(
    503,
    code === '42P01' || code === '42703'
      ? 'CACHE_SCHEMA_REQUIRED'
      : 'CACHE_DATABASE_ERROR',
    code === '42P01' || code === '42703'
      ? 'ITS·ORS 캐시 DDL v2를 적용해야 합니다.'
      : '캐시 DB 작업을 완료하지 못했습니다.',
  );
}
export function safeCode(error: unknown): string {
  if (error instanceof RoutingError)
    return (error.getResponse() as { code: string }).code;
  return 'INTERNAL_ERROR';
}
export function providerError(provider: string): RoutingError {
  return new RoutingError(
    502,
    'PROVIDER_RESPONSE_INVALID',
    `${provider} 응답을 처리하지 못했습니다.`,
  );
}
export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function finite(value: unknown, min = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min;
}

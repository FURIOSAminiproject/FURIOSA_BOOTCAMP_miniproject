import { HttpException } from '@nestjs/common';

export class RoutingError extends HttpException {
  constructor(
    status: number,
    code: string,
    message: string,
    readonly databaseDiagnostic?: DatabaseDiagnostic,
  ) {
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
export interface DatabaseDiagnostic {
  dbCode: string;
  dbOperation: string;
  dbReason: string;
}
const networkCodes = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'CERT_HAS_EXPIRED',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);
const reasons: Record<string, string> = {
  '42501': 'insufficient_privilege',
  '42P01': 'undefined_table',
  '42703': 'undefined_column',
  '42804': 'datatype_mismatch',
  '42883': 'undefined_function_or_operator',
  '22P02': 'invalid_text_representation',
  '57014': 'query_cancelled_or_timeout',
  '28P01': 'invalid_password',
  '28000': 'invalid_authorization',
  '3D000': 'invalid_database',
  '23502': 'not_null_violation',
  '23503': 'foreign_key_violation',
  '23505': 'unique_violation',
  '23514': 'check_violation',
  '55P03': 'lock_not_available',
};
export function databaseDiagnostic(
  error: unknown,
  operation = 'query',
): DatabaseDiagnostic {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  let code = 'UNKNOWN';
  // TypeORM and connection errors may wrap the original PostgreSQL driver error.
  while (pending.length && seen.size < 8) {
    const value = pending.shift();
    if (!value || typeof value !== 'object' || seen.has(value)) continue;
    seen.add(value);
    const record = value as Record<string, unknown>;
    if (
      typeof record.code === 'string' &&
      (/^[0-9A-Z]{5}$/.test(record.code) || networkCodes.has(record.code))
    ) {
      code = record.code;
      break;
    }
    pending.push(record.driverError, record.cause);
  }
  return {
    dbCode: code,
    dbOperation: operation,
    dbReason:
      reasons[code] ??
      (networkCodes.has(code) || code.startsWith('08')
        ? 'connection_or_tls_error'
        : 'unclassified_database_error'),
  };
}
export function databaseError(
  error: unknown,
  operation = 'query',
): RoutingError {
  if (error instanceof RoutingError) return error;
  const diagnostic = databaseDiagnostic(error, operation);
  const code = diagnostic.dbCode;
  return new RoutingError(
    503,
    code === '42P01' || code === '42703'
      ? 'CACHE_SCHEMA_REQUIRED'
      : 'CACHE_DATABASE_ERROR',
    code === '42P01' || code === '42703'
      ? 'ORS 경로 캐시 테이블 구조를 확인해 주세요.'
      : '캐시 DB 작업을 완료하지 못했습니다.',
    diagnostic,
  );
}
export function safeDiagnostics(error: unknown): {
  code: string;
  dbCode?: string;
  dbOperation?: string;
  dbReason?: string;
} {
  return {
    code: safeCode(error),
    ...(error instanceof RoutingError ? error.databaseDiagnostic : undefined),
  };
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

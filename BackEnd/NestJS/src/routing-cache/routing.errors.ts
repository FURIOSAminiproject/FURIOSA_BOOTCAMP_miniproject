/**
 * 경로 API 오류·안전한 DB 진단·기본 JSON 검증 도구. 공개 메시지와 서버용 진단을 구분한다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { HttpException } from '@nestjs/common';

export class RoutingError extends HttpException {
  /**
   * RoutingError 인스턴스에 필요한 설정과 기능을 연결한다.
   *
   * 입력: status: HTTP 상태 코드; code: 외부에 노출해도 되는 오류 식별 코드; message: 사용자에게 보여줄 오류 문구;
   * databaseDiagnostic: 선택적 서버 로그용 DB 진단
   * @returns new로 생성한 RoutingError 객체. 생성자는 별도 결과값을 반환하지 않는다.
   * @example
   * // RoutingError(status, code, message, databaseDiagnostic)에 실제 구현 또는 테스트 대역을 주입한다.
   * const instance = new RoutingError(status, code, message, databaseDiagnostic);
   *
   * DB 진단은 서버용 속성이며 HTTP 응답 본문에는 statusCode/code/message만 포함한다.
   */
  constructor(
    status: number,
    code: string,
    message: string,
    readonly databaseDiagnostic?: DatabaseDiagnostic,
  ) {
    super({ statusCode: status, code, message }, status);
  }
}

/**
 * 입력 필드 오류를 일관된 HTTP 400 예외로 알린다.
 *
 * 입력: field: 잘못된 필드 이름 또는 위치.
 * @returns 반환 없음(never). INVALID_REQUEST RoutingError를 던진다.
 * @example
 * invalid("mode"); // HTTP 400, code="INVALID_REQUEST"
 */
export function invalid(field: string): never {
  throw new RoutingError(
    400,
    'INVALID_REQUEST',
    `${field} 요청값을 확인해 주세요.`,
  );
}
export interface DatabaseDiagnostic {
  /** SQLSTATE 또는 허용한 연결 오류 코드. 예: 42501=권한 부족. */
  dbCode: string;
  /** 실패한 작업 이름. query/schema_check/cleanup 등. */
  dbOperation: string;
  /** 정해진 진단 분류. 원본 SQL 오류 메시지가 아니다. */
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

/**
 * 중첩된 DB 예외에서 로그에 필요한 제한된 진단 정보만 추출한다.
 *
 * 입력: error: 드라이버/TypeORM 예외, operation: query/schema_check/cleanup 같은 작업명.
 * @returns dbCode, dbOperation, dbReason. 찾지 못하면 UNKNOWN 코드.
 * @example
 * databaseDiagnostic({driverError:{code:"42501"}}, "query"); // dbReason="insufficient_privilege"
 *
 * 순환 참조를 피하고 최대 8개 객체만 탐색한다. SQL 원문·접속 정보·오류 message는 복사하지 않는다.
 */
export function databaseDiagnostic(
  error: unknown,
  operation = 'query',
): DatabaseDiagnostic {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  let code = 'UNKNOWN';
  // TypeORM/연결 오류 안에 실제 PostgreSQL 오류가 감싸져 있을 수 있어 내부 원인을 찾는다.
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

/**
 * DB 오류를 API 응답용 RoutingError로 바꾼다.
 *
 * 입력: error: 원본 오류, operation: 서버 로그에 쓸 작업명.
 * @returns 테이블/컬럼 누락은 CACHE_SCHEMA_REQUIRED, 나머지는 CACHE_DATABASE_ERROR인 503 오류.
 * @example
 * databaseError({code:"42501"}); // 권한 부족 → CACHE_DATABASE_ERROR
 *
 * 기존 RoutingError는 유지한다. 상세 DB 진단은 서버용 속성에만 담는다.
 */
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

/**
 * 로그에 기록할 안전한 오류 코드와 DB 진단만 고른다.
 *
 * 입력: error: 잡힌 예외.
 * @returns code 및 선택적 dbCode/dbOperation/dbReason 객체.
 * @example
 * safeDiagnostics(new Error("내부 정보")); // {code:"INTERNAL_ERROR"}
 */
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

/**
 * 알려진 경로 오류에서 공개 코드를 읽는다.
 *
 * 입력: error: 임의의 예외.
 * @returns RoutingError이면 응답 code, 그 외 INTERNAL_ERROR.
 * @example
 * safeCode(providerError("ORS")); // "PROVIDER_RESPONSE_INVALID"
 */
export function safeCode(error: unknown): string {
  if (error instanceof RoutingError)
    return (error.getResponse() as { code: string }).code;
  return 'INTERNAL_ERROR';
}

/**
 * 잘못된 외부 응답을 나타낼 공통 오류 객체를 만든다.
 *
 * 입력: provider: 메시지에 넣을 제공자 이름.
 * @returns 502 PROVIDER_RESPONSE_INVALID RoutingError. 여기서는 던지지 않고 생성만 한다.
 * @example
 * throw providerError("ORS"); // 호출한 쪽에서 예외로 던짐
 */
export function providerError(provider: string): RoutingError {
  return new RoutingError(
    502,
    'PROVIDER_RESPONSE_INVALID',
    `${provider} 응답을 처리하지 못했습니다.`,
  );
}

/**
 * 알 수 없는 JSON 값이 배열 아닌 객체인지 검사한다.
 *
 * 입력: value: 원본 JSON 값.
 * @returns 객체이면 true, null·배열·기본값이면 false.
 * @example
 * object({ error: {} }); // true
 * object(null); // false
 */
export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * 값이 최소값 이상인 유한한 숫자인지 확인한다.
 *
 * 입력: value: 검사 대상, min: 최솟값(기본 0). 숫자 문자열은 허용하지 않는다.
 * @returns 조건에 맞으면 true인 자료형 가드.
 * @example
 * finite(625.3); // true
 * finite("625.3"); // false
 * finite(-1); // false
 */
export function finite(value: unknown, min = 0): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min;
}

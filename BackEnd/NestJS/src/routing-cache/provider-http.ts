/**
 * 외부 경로 API의 인증 설정·HTTP 제한 시간·오류 분류 담당. 원본 오류 본문은 공개하지 않는다.
 * 읽는 순서: 이 파일의 설명 → 자료형/설정 → 생성자 주입 → 실행 메서드 → 내부 보조 함수.
 */
import { RoutingError, object, providerError } from './routing.errors';
import type { ProviderName } from './routing.types';

/**
 * ORS 인증 설정과 HTTP 제한 시간을 검사한다.
 *
 * 입력: name: ORS, env: ORS_API_KEY 또는 ORS_API_key와 선택적 ORS_API_TIMEOUT_MS.
 * @returns {key, timeoutMs}. 기본 제한 시간은 15000ms.
 * @example
 * // 인증키가 설정된 환경에서 providerConfig("ORS", process.env).timeoutMs → 기본 15000
 *
 * 키가 없거나 줄바꿈이 있으면 인증 오류. 제한 시간은 100~60000ms 정수만 허용한다.
 */
export function providerConfig(
  name: ProviderName,
  env: NodeJS.ProcessEnv,
): { key: string; timeoutMs: number } {
  const raw = env[`${name}_API_KEY`] ?? env[`${name}_API_key`];
  let key = raw?.trim();
  if (
    key &&
    ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'")))
  )
    key = key.slice(1, -1).trim();
  if (!key || /[\r\n]/.test(key))
    throw new RoutingError(
      502,
      'PROVIDER_AUTH_ERROR',
      `${name} 서버 인증키 설정이 필요합니다.`,
    );
  const timeoutMs = Number(env[`${name}_API_TIMEOUT_MS`] ?? 15000);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60000)
    throw new RoutingError(
      503,
      'PROVIDER_CONFIG_ERROR',
      `${name} 시간 제한 설정이 올바르지 않습니다.`,
    );
  return { key, timeoutMs };
}

/**
 * 외부 HTTP 응답을 읽고 실패 사유를 서비스 오류로 바꾼다.
 *
 * 입력: name: 제공자, url: 호출 주소, options: 메서드·헤더·본문, timeoutMs: 제한 시간, transport: fetch 구현.
 * @returns 성공 JSON을 unknown으로 반환. 호출부가 업무 데이터 구조를 검증한다.
 * @example
 * // ORS HTTP 429 → PROVIDER_QUOTA_EXCEEDED
 * // 제한 시간 경과 → PROVIDER_TIMEOUT
 *
 * 리다이렉트는 허용하지 않는다. 인증 실패·호출 한도·연결 실패·경로 없음 등을 구분한다.
 */
export async function providerJson(
  name: ProviderName,
  url: URL | string,
  options: RequestInit,
  timeoutMs: number,
  transport: typeof fetch,
): Promise<unknown> {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await transport(url, {
      ...options,
      signal,
      redirect: 'error',
    });
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      if (signal.aborted)
        throw new RoutingError(
          504,
          'PROVIDER_TIMEOUT',
          `${name} 응답 시간이 초과됐습니다.`,
        );
      if (response.ok) throw providerError(name);
    }
    const error = object(body) && object(body.error) ? body.error : undefined;
    const code = error ? Number(error.code) : NaN;
    const message = error?.message;
    if (
      response.status === 429 ||
      (response.status === 403 &&
        typeof message === 'string' &&
        /quota|limit/i.test(message))
    ) {
      throw new RoutingError(
        503,
        'PROVIDER_QUOTA_EXCEEDED',
        `${name} 호출 한도에 도달했습니다.`,
      );
    }
    if (response.status === 401 || response.status === 403)
      throw new RoutingError(
        502,
        'PROVIDER_AUTH_ERROR',
        `${name} 인증 설정을 확인해 주세요.`,
      );
    if (code === 2009 || code === 2010)
      throw new RoutingError(
        422,
        code === 2009 ? 'ROUTE_NOT_FOUND' : 'POINT_NOT_ROUTABLE',
        '입력 지점의 경로를 계산할 수 없습니다.',
      );
    if (response.status === 408 || response.status === 504)
      throw new RoutingError(
        504,
        'PROVIDER_TIMEOUT',
        `${name} 응답 시간이 초과됐습니다.`,
      );
    if (!response.ok || (object(body) && body.error !== undefined))
      throw providerError(name);
    return body;
  } catch (error) {
    if (error instanceof RoutingError) throw error;
    if (signal.aborted)
      throw new RoutingError(
        504,
        'PROVIDER_TIMEOUT',
        `${name} 응답 시간이 초과됐습니다.`,
      );
    throw new RoutingError(
      503,
      'PROVIDER_UNAVAILABLE',
      `${name} 서비스에 연결하지 못했습니다.`,
    );
  }
}

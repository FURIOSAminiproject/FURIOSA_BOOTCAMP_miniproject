import { RoutingError, object, providerError } from './routing.errors';
import type { ProviderName } from './routing.types';

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

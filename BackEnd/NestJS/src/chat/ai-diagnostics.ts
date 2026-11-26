import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { GenerateContentParameters, GoogleGenAI } from '@google/genai';

type Operation = 'chat' | 'planner' | 'revision' | 'curation' | 'configuration';
type Fields = Record<string, unknown>;
export interface AiTrace {
  emit(event: string, fields?: Fields, level?: 'log' | 'warn' | 'error'): void;
}

/** 같은 요청의 설정 선택·API·검증을 연결한다. 본문이나 예외 객체는 전달하지 않는다. */
export function createAiTrace(operation: Operation): AiTrace {
  const logger = new Logger('AiDiagnostics');
  const requestId = randomUUID();
  const started = performance.now();
  return {
    emit(event, fields = {}, level = 'log') {
      logger[level](
        JSON.stringify({
          ...fields,
          event,
          operation,
          requestId,
          elapsedMs: Math.round(performance.now() - started),
        }),
      );
    },
  };
}

/** 모델 설정에 잘못 들어간 비밀값도 로그로 복사하지 않는다. */
export function diagnosticModel(model: string): string {
  return /^gemini-[a-z0-9][a-z0-9.-]{0,79}$/.test(model)
    ? model
    : 'unrecognized_model_name';
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const count = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
const providerCodes = new Set([
  'INVALID_ARGUMENT',
  'UNAUTHENTICATED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'RESOURCE_EXHAUSTED',
  'FAILED_PRECONDITION',
  'DEADLINE_EXCEEDED',
  'INTERNAL',
  'UNAVAILABLE',
  'CANCELLED',
  'UNKNOWN',
]);
const providerReasons = new Set([
  'API_KEY_INVALID',
  'API_KEY_EXPIRED',
  'API_KEY_SERVICE_BLOCKED',
  'API_KEY_HTTP_REFERRER_BLOCKED',
  'API_KEY_IP_ADDRESS_BLOCKED',
  'SERVICE_DISABLED',
  'CONSUMER_INVALID',
  'BILLING_DISABLED',
  'QUOTA_EXCEEDED',
  'RATE_LIMIT_EXCEEDED',
  'ACCESS_TOKEN_EXPIRED',
]);

/** SDK 예외의 허용된 상태·할당량 수치만 추출한다. message/stack/URL은 기록하지 않는다. */
export function aiErrorDiagnostic(error: unknown): Fields {
  const source = record(error);
  const message = typeof source.message === 'string' ? source.message : '';
  let detail: Record<string, unknown> = {};
  try {
    if (message.length <= 100000)
      detail = record(record(JSON.parse(message)).error);
  } catch {
    /* SDK가 JSON 아닌 오류를 반환할 수 있다. */
  }
  const rawStatus = source.status ?? detail.code;
  const status =
    typeof rawStatus === 'number' && rawStatus >= 400 && rawStatus <= 599
      ? rawStatus
      : null;
  const timeout =
    source.name === 'AbortError' ||
    source.name === 'TimeoutError' ||
    /timeout|timed out|aborted/i.test(message);
  const details = Array.isArray(detail.details)
    ? detail.details.slice(0, 10).map(record)
    : [];
  const retry = details.find(
    (item) => item['@type'] === 'type.googleapis.com/google.rpc.RetryInfo',
  );
  const delay =
    typeof retry?.retryDelay === 'string' &&
    /^\d{1,8}(?:\.\d{1,9})?s$/.test(retry.retryDelay)
      ? Number(retry.retryDelay.slice(0, -1))
      : undefined;
  const quota = details.find(
    (item) => item['@type'] === 'type.googleapis.com/google.rpc.QuotaFailure',
  );
  const violations = Array.isArray(quota?.violations)
    ? quota.violations.slice(0, 10)
    : [];
  return {
    httpStatus: status,
    providerCode:
      typeof detail.status === 'string' && providerCodes.has(detail.status)
        ? detail.status
        : null,
    errorCategory:
      error instanceof SyntaxError
        ? 'invalid_json'
        : status === 429
          ? 'rate_limit_or_quota'
          : status === 401 || status === 403
            ? 'authentication_or_permission'
            : status === 404
              ? 'model_or_resource_not_found'
              : status === 400
                ? 'invalid_request'
                : status && status >= 500
                  ? 'provider_unavailable'
                  : timeout
                    ? 'timeout'
                    : 'unclassified_error',
    timeout,
    schemaRelated: /schema/i.test(message),
    credentialRelated:
      /API_KEY_|API[ _-]?key.{0,80}(?:invalid|not valid|expired)/i.test(
        message,
      ),
    providerReasons: details
      .map((item) => item.reason)
      .filter(
        (reason) => typeof reason === 'string' && providerReasons.has(reason),
      ),
    retryAfterSeconds: delay,
    quotaViolations: violations.map((value) => {
      const violation = record(value);
      const id = typeof violation.quotaId === 'string' ? violation.quotaId : '';
      const metric =
        typeof violation.quotaMetric === 'string' ? violation.quotaMetric : '';
      const limit =
        typeof violation.quotaValue === 'string' &&
        /^\d{1,16}$/.test(violation.quotaValue)
          ? violation.quotaValue
          : undefined;
      return {
        window: /PerDay/.test(id)
          ? 'day'
          : /PerMinute/.test(id)
            ? 'minute'
            : 'unknown',
        resource: /token/i.test(id + metric)
          ? 'tokens'
          : /request/i.test(id + metric)
            ? 'requests'
            : 'unknown',
        tier: /FreeTier|free_tier/.test(id + metric)
          ? 'free'
          : /PaidTier|paid_tier/.test(id + metric)
            ? 'paid'
            : 'unknown',
        limit,
      };
    }),
  };
}

const finishReasons = new Set([
  'STOP',
  'MAX_TOKENS',
  'SAFETY',
  'RECITATION',
  'LANGUAGE',
  'OTHER',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'MALFORMED_FUNCTION_CALL',
  'UNEXPECTED_TOOL_CALL',
  'FINISH_REASON_UNSPECIFIED',
]);
const blockReasons = new Set([
  'SAFETY',
  'OTHER',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'BLOCK_REASON_UNSPECIFIED',
]);

/** 호출 시각·응답 메타데이터만 남기고 원본 결과/예외는 기존 처리기로 전달한다. */
export async function generateGeminiContent(
  client: { ai: GoogleGenAI; modelName: string },
  request: GenerateContentParameters,
  trace: AiTrace,
) {
  const started = performance.now();
  trace.emit('ai_provider_request_started', {
    model: diagnosticModel(client.modelName),
    structuredOutput: !!request.config?.responseJsonSchema,
  });
  try {
    const response = await client.ai.models.generateContent(request);
    const finish = response.candidates?.[0]?.finishReason;
    const block = response.promptFeedback?.blockReason;
    trace.emit('ai_provider_request_completed', {
      durationMs: Math.round(performance.now() - started),
      candidateCount: response.candidates?.length ?? 0,
      finishReason:
        finish && finishReasons.has(finish) ? finish : finish ? 'OTHER' : null,
      blockReason:
        block && blockReasons.has(block) ? block : block ? 'OTHER' : null,
      promptTokens: count(response.usageMetadata?.promptTokenCount),
      outputTokens: count(response.usageMetadata?.candidatesTokenCount),
      thoughtTokens: count(response.usageMetadata?.thoughtsTokenCount),
      totalTokens: count(response.usageMetadata?.totalTokenCount),
    });
    return response;
  } catch (error) {
    trace.emit(
      'ai_provider_request_failed',
      {
        durationMs: Math.round(performance.now() - started),
        ...aiErrorDiagnostic(error),
      },
      'error',
    );
    throw error;
  }
}

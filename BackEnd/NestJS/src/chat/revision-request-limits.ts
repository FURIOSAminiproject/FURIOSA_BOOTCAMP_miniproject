import {
  HttpException,
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { isIP } from 'node:net';
import { from, lastValueFrom, type Observable } from 'rxjs';
import { createAiTrace } from './ai-diagnostics';
import { RevisionExecutionError } from './revision-policy';

export const REVISION_REQUEST_LIMITS = Object.freeze({
  windowMs: 60000,
  perIp: 10,
  total: 30,
  concurrent: 3,
  providerCalls: 120,
  maxIpEntries: 2048,
});

/** 단일 백엔드 프로세스의 고정 시간창 제한. IP는 메모리에만 보관한다. */
export class RevisionRequestLimiter {
  private ips = new Map<string, { start: number; count: number }>();
  private start = -1;
  private requests = 0;
  private providers = 0;
  private active = 0;
  constructor(private readonly now: () => number = Date.now) {}

  private reset(now: number) {
    if (
      this.start < 0 ||
      now - this.start >= REVISION_REQUEST_LIMITS.windowMs
    ) {
      this.start = now;
      this.requests = 0;
      this.providers = 0;
    }
    for (const [ip, value] of this.ips)
      if (now - value.start >= REVISION_REQUEST_LIMITS.windowMs)
        this.ips.delete(ip);
  }

  acquire(ip: string): () => void {
    const now = this.now();
    this.reset(now);
    const entry = this.ips.get(ip);
    const reason =
      this.active >= REVISION_REQUEST_LIMITS.concurrent
        ? 'concurrent'
        : this.requests >= REVISION_REQUEST_LIMITS.total
          ? 'global_rate'
          : (entry?.count ?? 0) >= REVISION_REQUEST_LIMITS.perIp
            ? 'ip_rate'
            : !entry && this.ips.size >= REVISION_REQUEST_LIMITS.maxIpEntries
              ? 'capacity'
              : null;
    if (reason) {
      createAiTrace('revision').emit(
        'ai_revision_request_throttled',
        { reason },
        'warn',
      );
      throw new HttpException(
        {
          statusCode: 429,
          code: 'REVISION_RATE_LIMITED',
          message:
            reason === 'concurrent'
              ? '현재 처리 중인 일정 수정 요청이 많습니다. 잠시 후 다시 요청해 주세요.'
              : '일정 수정 요청 횟수 제한에 도달했습니다. 약 1분 후 다시 요청해 주세요.',
        },
        429,
      );
    }
    this.ips.set(ip, {
      start: entry?.start ?? now,
      count: (entry?.count ?? 0) + 1,
    });
    this.requests++;
    this.active++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        this.active--;
      }
    };
  }

  consumeProvider() {
    this.reset(this.now());
    if (this.providers >= REVISION_REQUEST_LIMITS.providerCalls)
      throw new RevisionExecutionError('PROVIDER_BUDGET_EXCEEDED');
    this.providers++;
  }
}

@Injectable()
export class RevisionRateLimitInterceptor implements NestInterceptor {
  constructor(
    @Inject(RevisionRequestLimiter)
    private readonly limiter: RevisionRequestLimiter,
  ) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
    const ip =
      request.ip && isIP(request.ip)
        ? request.ip
        : request.socket?.remoteAddress || 'unknown';
    const release = this.limiter.acquire(ip);
    // 브라우저가 연결을 끊어도 실행 중인 모델/DB 작업이 끝날 때까지 동시 처리 슬롯을 유지한다.
    try {
      return from(lastValueFrom(next.handle()).finally(release));
    } catch (error) {
      release();
      throw error;
    }
  }
}

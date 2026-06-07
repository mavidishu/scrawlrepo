import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException } from '@nestjs/common';
import { Observable } from 'rxjs';

// Simple in-memory rate limiter for M1. Replace with Redis-backed token bucket in M2.
const buckets: Map<string, number[]> = new Map();

@Injectable()
export class RateLimiterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const apiKeyId = req.apiKey?.id || 'anonymous';
    const qps = parseInt(process.env.MCP_RATE_LIMIT_QPS || '20', 10);

    const now = Date.now();
    const windowStart = now - 1000;
    const arr = buckets.get(apiKeyId) || [];
    // keep only timestamps within last second
    const recent = arr.filter((ts) => ts > windowStart);

    if (recent.length >= qps) {
          throw new HttpException('Rate limit exceeded', 429);
    }

    recent.push(now);
    buckets.set(apiKeyId, recent);

    return next.handle();
  }
}

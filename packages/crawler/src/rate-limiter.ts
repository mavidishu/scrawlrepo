import Bottleneck from 'bottleneck';

export interface RateLimiterOptions {
  maxConcurrent?: number;
  minTime?: number;
  reservoir?: number;
  reservoirRefreshAmount?: number;
  reservoirRefreshInterval?: number;
}

export class RateLimiter {
  private limiter: Bottleneck;

  constructor(options: RateLimiterOptions = {}) {
    this.limiter = new Bottleneck({
      maxConcurrent: options.maxConcurrent ?? 5,
      minTime: options.minTime ?? 100, // 100ms between requests
      reservoir: options.reservoir ?? 100, // Start with 100 requests
      reservoirRefreshAmount: options.reservoirRefreshAmount ?? 100,
      reservoirRefreshInterval: options.reservoirRefreshInterval ?? 60 * 1000, // Refresh every minute
    });

    this.limiter.on('error', (error) => {
      console.error('Rate limiter error:', error);
    });
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(fn);
  }

  async updateReservoir(remaining: number, resetTime: Date): Promise<void> {
    const now = Date.now();
    const resetMs = resetTime.getTime();
    const timeUntilReset = Math.max(0, resetMs - now);

    // Update reservoir based on GitHub rate limit headers
    await this.limiter.updateSettings({
      reservoir: remaining,
      reservoirRefreshAmount: 5000, // GitHub's hourly limit
      reservoirRefreshInterval: timeUntilReset || 60 * 60 * 1000, // Time until reset or 1 hour
    });
  }

  getCounts(): Bottleneck.Counts {
    return this.limiter.counts();
  }

  stop(): void {
    this.limiter.stop();
  }
}

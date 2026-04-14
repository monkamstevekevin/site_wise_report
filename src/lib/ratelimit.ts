import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Returns null if Upstash is not configured → graceful no-op in development/staging
function createLimiter(requests: number, window: Duration) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: false,
  });
}

// 30 req/min for general API calls
export const apiLimiter = createLimiter(30, '1 m');

// 5 req/min for heavy operations (file upload, checkout)
export const heavyLimiter = createLimiter(5, '1 m');

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();
const distributedLimiters = new Map<string, Ratelimit>();

function checkRateLimitInMemory(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) {
    return false;
  }

  entry.count += 1;
  return true;
}

function getDistributedLimiter(
  limit: number,
  windowMs: number
): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = distributedLimiters.get(cacheKey);
  if (limiter) return limiter;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redis = new Redis({ url, token });
  limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: "attendance-rl",
    analytics: false,
  });
  distributedLimiters.set(cacheKey, limiter);
  return limiter;
}

export function isDistributedRateLimitEnabled(): boolean {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

/** يستخدم Upstash عند التهيئة، وإلا يعود للذاكرة المحلية */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  const limiter = getDistributedLimiter(limit, windowMs);
  if (limiter) {
    const { success } = await limiter.limit(key);
    return success;
  }
  return checkRateLimitInMemory(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

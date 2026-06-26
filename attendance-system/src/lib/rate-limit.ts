import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { prisma } from "@/lib/prisma";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryStore = new Map<string, RateLimitEntry>();
const distributedLimiters = new Map<string, Ratelimit>();

/** يُعطّل محاولات قاعدة البيانات مؤقتاً بعد فشل (مثلاً الجدول غير موجود) */
let dbRateLimitDisabledUntil = 0;

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

/**
 * حدّ معدّل ذرّي عبر PostgreSQL — يعمل على بيئات serverless (Vercel)
 * حيث لا تدوم الذاكرة بين الطلبات. يُعيد null عند تعذّر استخدام القاعدة.
 */
async function checkRateLimitInDb(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean | null> {
  if (Date.now() < dbRateLimitDisabledUntil) return null;

  const resetAt = new Date(Date.now() + windowMs);

  try {
    const rows = await prisma.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE
      SET "count" = CASE
            WHEN "RateLimit"."resetAt" <= now() THEN 1
            ELSE "RateLimit"."count" + 1
          END,
          "resetAt" = CASE
            WHEN "RateLimit"."resetAt" <= now() THEN ${resetAt}
            ELSE "RateLimit"."resetAt"
          END
      RETURNING "count";
    `;
    const count = Number(rows[0]?.count ?? 1);
    return count <= limit;
  } catch (error) {
    // الجدول غير موجود أو خطأ اتصال — عطّل القاعدة دقيقة وارجع للذاكرة
    console.error("DB rate limit failed, falling back to memory:", error);
    dbRateLimitDisabledUntil = Date.now() + 60_000;
    return null;
  }
}

/**
 * يستخدم Upstash عند التهيئة، وإلا PostgreSQL (مناسب لـ serverless)،
 * وإلا يعود للذاكرة المحلية كحل أخير.
 */
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

  const dbResult = await checkRateLimitInDb(key, limit, windowMs);
  if (dbResult !== null) return dbResult;

  return checkRateLimitInMemory(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() ?? "unknown";
}

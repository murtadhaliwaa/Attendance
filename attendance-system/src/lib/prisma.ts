import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: Pool | undefined;
};

function createPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // حجم تجمّع الاتصالات لكل نسخة دالة (serverless). القيمة الافتراضية 5
  // مناسبة لـ Supabase pooler؛ يمكن ضبطها عبر DB_POOL_MAX حسب الخطة.
  const poolMax = Number(process.env.DB_POOL_MAX) || 5;

  return new Pool({
    connectionString,
    max: poolMax,
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 60000,
    ssl: connectionString.includes("supabase.com")
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

function createPrismaClient() {
  const pool = globalForPrisma.pgPool ?? createPool();
  globalForPrisma.pgPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  if (process.env.NODE_ENV === "production") {
    globalForPrisma.prisma ??= createPrismaClient();
    return globalForPrisma.prisma;
  }

  // في التطوير: عميل جديد بعد كل hot reload ليتوافق مع تغييرات schema
  return createPrismaClient();
}

export const prisma = getPrismaClient();

function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: string }).code)
      : "";

  return (
    message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("connect timeout") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    code.startsWith("P10")
  );
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }

  throw lastError;
}

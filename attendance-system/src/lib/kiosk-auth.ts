import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  getKioskSessionFromRequest,
  verifyKioskSessionToken,
} from "@/lib/kiosk-session";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function isKioskConfigured(): boolean {
  return !!process.env.KIOSK_API_KEY?.trim();
}

export function getKioskApiKey(): string | null {
  const key = process.env.KIOSK_API_KEY?.trim();
  return key || null;
}

/**
 * يقبل جلسة HttpOnly من صفحات الكشك، أو رأس x-kiosk-key للسكربتات والاختبار.
 */
export async function requireKioskAuth(
  request: Request
): Promise<NextResponse | null> {
  const expected = getKioskApiKey();
  if (!expected) {
    console.error("KIOSK_API_KEY is not configured");
    return NextResponse.json(
      { error: "الحضور والانصراف غير مهيأ" },
      { status: 503 }
    );
  }

  const sessionToken = getKioskSessionFromRequest(request);
  if (
    sessionToken &&
    (await verifyKioskSessionToken(expected, sessionToken))
  ) {
    return null;
  }

  const provided = request.headers.get("x-kiosk-key")?.trim() ?? "";
  if (provided && safeCompare(provided, expected)) {
    return null;
  }

  return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
}

/** @deprecated استخدم kioskFetch — للسكربتات فقط */
export function kioskRequestHeaders(kioskApiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-kiosk-key": kioskApiKey,
  };
}

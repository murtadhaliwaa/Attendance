import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function getKioskApiKey(): string | null {
  const key = process.env.KIOSK_API_KEY?.trim();
  return key || null;
}

export function requireKioskAuth(request: Request): NextResponse | null {
  const expected = getKioskApiKey();
  if (!expected) {
    console.error("KIOSK_API_KEY is not configured");
    return NextResponse.json({ error: "الكشك غير مهيأ" }, { status: 503 });
  }

  const provided = request.headers.get("x-kiosk-key")?.trim() ?? "";
  if (!provided || !safeCompare(provided, expected)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  return null;
}

export function kioskRequestHeaders(kioskApiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-kiosk-key": kioskApiKey,
  };
}

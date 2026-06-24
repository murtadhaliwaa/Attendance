const COOKIE_NAME = "kiosk_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export const KIOSK_SESSION_COOKIE = COOKIE_NAME;

async function signPayload(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bufferToBase64Url(signature);
}

function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createKioskSessionToken(secret: string): Promise<string> {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  const signature = await signPayload(secret, payload);
  return `${payload}.${signature}`;
}

export async function verifyKioskSessionToken(
  secret: string,
  token: string
): Promise<boolean> {
  const dot = token.indexOf(".");
  if (dot <= 0) return false;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expiresAt = Number(payload);

  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expected = await signPayload(secret, payload);
  return safeEqual(signature, expected);
}

export function getKioskSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE_NAME) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function kioskSessionCookieOptions(maxAgeSec = 86400) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

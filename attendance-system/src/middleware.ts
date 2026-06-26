import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  createKioskSessionToken,
  kioskSessionCookieOptions,
  KIOSK_SESSION_COOKIE,
  verifyKioskSessionToken,
} from "@/lib/kiosk-session";

function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return !!url && !!key && !url.includes("[project-ref]");
}

async function ensureKioskSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const secret = process.env.KIOSK_API_KEY?.trim();
  if (!secret || !request.nextUrl.pathname.startsWith("/kiosk")) {
    return response;
  }

  const existing = request.cookies.get(KIOSK_SESSION_COOKIE)?.value;
  if (existing && (await verifyKioskSessionToken(secret, existing))) {
    return response;
  }

  const token = await createKioskSessionToken(secret);
  response.cookies.set(
    KIOSK_SESSION_COOKIE,
    token,
    kioskSessionCookieOptions()
  );
  return response;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin");

  const isLogin = request.nextUrl.pathname.startsWith("/login");

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "production" && isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return ensureKioskSession(request, supabaseResponse);
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;

  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (error) {
    console.error("Supabase auth check failed in middleware:", error);
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return ensureKioskSession(request, supabaseResponse);
  }

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return ensureKioskSession(request, supabaseResponse);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/kiosk/:path*",
    // تجديد جلسة Supabase قبل معالجات API الخاصة بلوحة التحكم (بدونها قد
    // يفشل face-match وغيره بـ 401 بعد انتهاء التوكن أو أثناء عمليات طويلة).
    "/api/employees/:path*",
    "/api/reports/:path*",
    "/api/departments/:path*",
    "/api/schedules/:path*",
    "/api/supervisors/:path*",
    "/api/alerts/:path*",
  ],
};

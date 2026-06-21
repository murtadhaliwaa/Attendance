import { NextResponse } from "next/server";
import type { Role, SystemUser } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthResult =
  | { error: NextResponse; user?: never; systemUser?: never }
  | { error?: never; user: User; systemUser: SystemUser };

export async function requireAuth(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 }),
    };
  }

  const systemUser = await prisma.systemUser.findUnique({
    where: { email: user.email },
  });

  if (!systemUser?.isActive) {
    return {
      error: NextResponse.json(
        { error: "ليس لديك صلاحية الوصول إلى النظام" },
        { status: 403 }
      ),
    };
  }

  return { user, systemUser };
}

export async function requireRole(allowed: Role[]): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (!allowed.includes(auth.systemUser.role)) {
    return {
      error: NextResponse.json({ error: "صلاحيات غير كافية" }, { status: 403 }),
    };
  }

  return auth;
}

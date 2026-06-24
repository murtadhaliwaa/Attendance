import { NextResponse } from "next/server";
import type { Role, SystemUser } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
} from "@/lib/permissions";
import { resolveAuthForApi } from "@/lib/session";

export type AuthResult =
  | { error: NextResponse; user?: never; systemUser?: never }
  | { error?: never; user: User; systemUser: SystemUser };

export async function requireAuth(): Promise<AuthResult> {
  const result = await resolveAuthForApi();

  if (result.kind === "anonymous") {
    return {
      error: NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 }),
    };
  }

  if (result.kind === "forbidden") {
    return {
      error: NextResponse.json(
        { error: "ليس لديك صلاحية الوصول إلى النظام" },
        { status: 403 }
      ),
    };
  }

  return result.session;
}

export async function requirePermission(
  permission: Permission
): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (!hasPermission(auth.systemUser.role, permission)) {
    return {
      error: NextResponse.json(
        { error: "صلاحيات غير كافية" },
        { status: 403 }
      ),
    };
  }

  return auth;
}

export async function requireAnyPermission(
  permissions: Permission[]
): Promise<AuthResult> {
  const auth = await requireAuth();
  if (auth.error) return auth;

  if (!hasAnyPermission(auth.systemUser.role, permissions)) {
    return {
      error: NextResponse.json(
        { error: "صلاحيات غير كافية" },
        { status: 403 }
      ),
    };
  }

  return auth;
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

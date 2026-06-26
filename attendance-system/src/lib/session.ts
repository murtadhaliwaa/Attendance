import { cache } from "react";
import type { SystemUser } from "@prisma/client";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export type SessionAuth = {
  user: User;
  systemUser: SystemUser;
};

type ResolvedAuth = {
  user: User;
  systemUser: SystemUser | null;
};

/**
 * مغلّف بـ React `cache()` لإزالة تكرار العمل خلال نفس الطلب:
 * الـ layout والصفحة (والـ API) قد تطلب الجلسة عدة مرات، فتُحسب مرة واحدة فقط
 * لكل طلب — يسرّع كل تنقل بإزالة استدعاء Supabase + Prisma المكرر.
 */
const loadAuth = cache(async (): Promise<ResolvedAuth | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const systemUser = await prisma.systemUser.findUnique({
    where: { email: user.email },
  });

  return { user, systemUser };
});

/** جلسة Supabase + مستخدم النظام النشط */
export async function resolveSessionAuth(): Promise<SessionAuth | null> {
  const auth = await loadAuth();
  if (!auth?.systemUser?.isActive) return null;
  return { user: auth.user, systemUser: auth.systemUser };
}

/** للتمييز بين غير مسجّل (401) وغير مصرّح (403) في API */
export async function resolveAuthForApi(): Promise<
  | { kind: "anonymous" }
  | { kind: "forbidden"; user: User }
  | { kind: "authenticated"; session: SessionAuth }
> {
  const auth = await loadAuth();
  if (!auth) return { kind: "anonymous" };
  if (!auth.systemUser?.isActive) return { kind: "forbidden", user: auth.user };
  return {
    kind: "authenticated",
    session: { user: auth.user, systemUser: auth.systemUser },
  };
}

import { redirect } from "next/navigation";
import type { SystemUser } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getSessionSystemUser(): Promise<SystemUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return prisma.systemUser.findUnique({
    where: { email: user.email },
  });
}

export async function requirePagePermission(
  permission: Permission
): Promise<SystemUser> {
  const systemUser = await getSessionSystemUser();

  if (!systemUser?.isActive) {
    redirect("/login?error=unauthorized");
  }

  if (!hasPermission(systemUser.role, permission)) {
    redirect("/dashboard");
  }

  return systemUser;
}

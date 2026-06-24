import { redirect } from "next/navigation";
import type { SystemUser } from "@prisma/client";
import { hasPermission, type Permission } from "@/lib/permissions";
import { resolveSessionAuth } from "@/lib/session";

export async function getSessionSystemUser(): Promise<SystemUser | null> {
  const session = await resolveSessionAuth();
  return session?.systemUser ?? null;
}

export async function requirePagePermission(
  permission: Permission
): Promise<SystemUser> {
  const session = await resolveSessionAuth();

  if (!session) {
    redirect("/login?error=unauthorized");
  }

  if (!hasPermission(session.systemUser.role, permission)) {
    redirect("/dashboard");
  }

  return session.systemUser;
}

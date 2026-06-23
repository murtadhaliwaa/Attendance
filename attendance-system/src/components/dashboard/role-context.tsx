"use client";

import { createContext, useContext } from "react";
import type { Role } from "@prisma/client";
import {
  hasPermission,
  type Permission,
} from "@/lib/permissions";

const RoleContext = createContext<Role | null>(null);

export function RoleProvider({
  role,
  children,
}: {
  role: Role;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useUserRole(): Role {
  const role = useContext(RoleContext);
  if (!role) {
    throw new Error("useUserRole must be used within RoleProvider");
  }
  return role;
}

export function usePermission(permission: Permission): boolean {
  const role = useUserRole();
  return hasPermission(role, permission);
}

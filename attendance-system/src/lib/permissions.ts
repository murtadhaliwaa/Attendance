import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  MANAGER: "مدير",
  INQUIRY_CLERK: "موظف استعلامات",
};

export type Permission =
  | "dashboard:view"
  | "employees:read"
  | "employees:create"
  | "employees:update"
  | "employees:delete"
  | "reports:read"
  | "reports:export"
  | "settings:read"
  | "settings:write"
  | "kiosk:access";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  MANAGER: [
    "dashboard:view",
    "employees:read",
    "employees:create",
    "employees:update",
    "employees:delete",
    "reports:read",
    "reports:export",
    "settings:read",
    "settings:write",
    "kiosk:access",
  ],
  INQUIRY_CLERK: [
    "dashboard:view",
    "employees:read",
    "employees:create",
    "reports:read",
    "settings:read",
    "kiosk:access",
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}

export type NavItemConfig = {
  href: string;
  label: string;
  permission: Permission;
  exact?: boolean;
};

export const DASHBOARD_NAV_ITEMS: NavItemConfig[] = [
  {
    href: "/dashboard",
    label: "الرئيسية",
    permission: "dashboard:view",
    exact: true,
  },
  {
    href: "/dashboard/employees",
    label: "الموظفون",
    permission: "employees:read",
  },
  {
    href: "/dashboard/reports",
    label: "التقارير",
    permission: "reports:read",
  },
  {
    href: "/kiosk",
    label: "الحضور و الانصراف",
    permission: "kiosk:access",
  },
  {
    href: "/dashboard/settings",
    label: "الإعدادات",
    permission: "settings:read",
  },
];

export function getNavItemsForRole(role: Role): NavItemConfig[] {
  return DASHBOARD_NAV_ITEMS.filter((item) =>
    hasPermission(role, item.permission)
  );
}

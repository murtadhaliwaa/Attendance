import type { LucideIcon } from "lucide-react";
import {
  FileBarChart,
  LayoutDashboard,
  Monitor,
  Settings,
  Users,
} from "lucide-react";
import type { Role } from "@prisma/client";
import {
  getNavItemsForRole,
  type NavItemConfig,
  type Permission,
} from "@/lib/permissions";

export type DashboardNavItem = NavItemConfig & {
  icon: LucideIcon;
};

const NAV_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/employees": Users,
  "/dashboard/reports": FileBarChart,
  "/kiosk": Monitor,
  "/dashboard/settings": Settings,
};

export function getDashboardNavItems(role: Role): DashboardNavItem[] {
  return getNavItemsForRole(role).map((item) => ({
    ...item,
    icon: NAV_ICONS[item.href] ?? LayoutDashboard,
  }));
}

export function isDashboardNavActive(
  pathname: string,
  href: string,
  exact?: boolean
) {
  if (exact) return pathname === href;
  if (href === "/kiosk") return pathname.startsWith("/kiosk");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export type { Permission };

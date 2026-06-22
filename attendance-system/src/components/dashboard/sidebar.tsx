"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fingerprint,
  LayoutDashboard,
  Monitor,
  Settings,
  Users,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

function isNavItemActive(
  pathname: string,
  href: string,
  exact?: boolean
) {
  if (exact) return pathname === href;
  if (href === "/kiosk") return pathname.startsWith("/kiosk");
  return pathname === href || pathname.startsWith(`${href}/`);
}

const navItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/employees", label: "الموظفون", icon: Users },
  { href: "/dashboard/reports", label: "التقارير", icon: FileBarChart },
  { href: "/kiosk", label: "الحضور و الانصراف", icon: Monitor },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 self-start border-l border-bg-border bg-bg-sidebar lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 border-b border-bg-border px-4 py-4">
        <Fingerprint className="size-5 text-text-muted" />
        <p className="text-sm text-text-primary">نظام الحضور</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

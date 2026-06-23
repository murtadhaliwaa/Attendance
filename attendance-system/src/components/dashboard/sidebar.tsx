"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/components/dashboard/role-context";
import {
  getDashboardNavItems,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";

export function DashboardSidebar() {
  const pathname = usePathname();
  const role = useUserRole();
  const navItems = getDashboardNavItems(role);

  return (
    <aside className="fixed inset-y-0 start-0 z-30 hidden w-56 flex-col border-l border-bg-border bg-bg-sidebar lg:flex">
      <div className="flex items-center gap-2.5 border-b border-bg-border px-4 py-4">
        <Fingerprint className="size-5 text-text-muted" />
        <p className="text-sm text-text-primary">نظام الحضور</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {navItems.map((item) => {
          const isActive = isDashboardNavActive(pathname, item.href, item.exact);

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

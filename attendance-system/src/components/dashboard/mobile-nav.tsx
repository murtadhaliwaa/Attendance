"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/components/dashboard/role-context";
import {
  getDashboardNavItems,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";

export function MobileNav() {
  const pathname = usePathname();
  const role = useUserRole();
  const navItems = getDashboardNavItems(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-bg-border bg-bg-sidebar/95 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      {navItems.map((item) => {
        const isActive = isDashboardNavActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
              isActive
                ? "bg-bg-elevated text-text-primary"
                : "text-text-muted"
            )}
          >
            <item.icon className="size-[18px]" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

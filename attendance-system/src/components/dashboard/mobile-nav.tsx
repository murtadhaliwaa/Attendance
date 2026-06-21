"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
  { href: "/kiosk", label: "الكشك", icon: Monitor },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-bg-border bg-bg-sidebar px-2 py-2 lg:hidden">
      {navItems.map((item) => {
        const isActive = isNavItemActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
              isActive ? "text-text-primary" : "text-text-muted"
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

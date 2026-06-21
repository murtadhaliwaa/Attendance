"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fingerprint,
  LayoutDashboard,
  LogIn,
  LogOut,
  Monitor,
  Settings,
  Users,
  FileBarChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

const dashboardItems = [
  { href: "/dashboard", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/employees", label: "الموظفون", icon: Users },
  { href: "/dashboard/reports", label: "التقارير", icon: FileBarChart },
  { href: "/dashboard/settings", label: "الإعدادات", icon: Settings },
];

const kioskItems = [
  { href: "/kiosk", label: "اختيار الكشك", icon: Monitor, exact: true },
  { href: "/kiosk/checkin", label: "كشك الحضور", icon: LogIn },
  { href: "/kiosk/checkout", label: "كشك الانصراف", icon: LogOut },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact
    ? pathname === href
    : href === "/kiosk"
      ? pathname.startsWith("/kiosk")
      : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-bg-elevated text-text-primary"
          : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

export function KioskSidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-l border-bg-border bg-bg-sidebar lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 border-b border-bg-border px-4 py-4">
        <Fingerprint className="size-5 text-text-muted" />
        <p className="text-sm text-text-primary">نظام الحضور</p>
      </div>

      <nav className="flex-1 space-y-4 p-2">
        <div className="space-y-0.5">
          <p className="px-3 py-1.5 text-xs font-medium text-text-muted">
            لوحة التحكم
          </p>
          {dashboardItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        <div className="space-y-0.5 border-t border-bg-border pt-3">
          <p className="px-3 py-1.5 text-xs font-medium text-text-muted">
            الكشك
          </p>
          {kioskItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

export function KioskMobileNav() {
  const pathname = usePathname();
  const items = [
    dashboardItems[0],
    dashboardItems[1],
    dashboardItems[2],
    kioskItems[0],
    dashboardItems[3],
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-bg-border bg-bg-sidebar px-1 py-2 lg:hidden">
      {items.map((item) => {
        const isActive =
          item.href === "/kiosk"
            ? pathname.startsWith("/kiosk")
            : item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

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
            <span className="truncate px-0.5">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function KioskShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isScanner =
    pathname === "/kiosk/checkin" || pathname === "/kiosk/checkout";

  return (
    <div
      className={cn(
        "flex bg-bg-page",
        isScanner ? "h-dvh overflow-hidden" : "min-h-screen"
      )}
    >
      <KioskSidebar />
      <div
        className={cn(
          "flex flex-1 flex-col",
          isScanner ? "min-h-0 overflow-hidden" : "min-h-screen",
          "pb-16 lg:pb-0"
        )}
      >
        <main
          className={cn(
            "flex flex-col",
            isScanner ? "h-full min-h-0" : "flex-1"
          )}
        >
          {children}
        </main>
      </div>
      <KioskMobileNav />
    </div>
  );
}

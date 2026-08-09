"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Fingerprint,
  LogIn,
  LogOut,
  Monitor,
  MonitorSmartphone,
} from "lucide-react";
import { useKioskTabletMode } from "@/hooks/use-kiosk-tablet-mode";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/components/dashboard/role-context";
import {
  getDashboardNavItems,
  isDashboardNavActive,
} from "@/lib/dashboard-nav";
import { usePendingReviewCount } from "@/hooks/use-pending-review-count";
import { PendingReviewsBadge } from "@/components/dashboard/pending-reviews-badge";

const REVIEWS_HREF = "/dashboard/reviews";

const kioskItems = [
  { href: "/kiosk", label: "الحضور و الانصراف", icon: Monitor, exact: true },
  { href: "/kiosk/checkin", label: "الحضور", icon: LogIn },
  { href: "/kiosk/checkout", label: "الانصراف", icon: LogOut },
  { href: "/kiosk/setup", label: "إعداد التابلت", icon: MonitorSmartphone },
];

function NavLink({
  href,
  label,
  icon: Icon,
  exact,
}: {
  href: string;
  label: string;
  icon: typeof Monitor;
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

function DashboardNavSection() {
  const pathname = usePathname();
  const role = useUserRole();
  const pendingReviewCount = usePendingReviewCount();
  const dashboardItems = getDashboardNavItems(role).filter(
    (item) => item.href !== "/kiosk"
  );

  return (
    <div className="space-y-0.5">
      <p className="px-3 py-1.5 text-xs font-medium text-text-muted">
        لوحة التحكم
      </p>
      {dashboardItems.map((item) => {
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
            <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span>{item.label}</span>
              {item.href === REVIEWS_HREF && (
                <PendingReviewsBadge count={pendingReviewCount} />
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function KioskSidebar({ loggedIn }: { loggedIn: boolean }) {
  return (
    <aside className="hidden w-56 shrink-0 border-l border-bg-border bg-bg-sidebar lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 border-b border-bg-border px-4 py-4">
        <Fingerprint className="size-5 text-text-muted" />
        <p className="text-sm text-text-primary">نظام الحضور</p>
      </div>

      <nav className="flex-1 space-y-4 p-2">
        {loggedIn && <DashboardNavSection />}

        <div
          className={cn(
            "space-y-0.5",
            loggedIn && "border-t border-bg-border pt-3"
          )}
        >
          <p className="px-3 py-1.5 text-xs font-medium text-text-muted">
            الحضور و الانصراف
          </p>
          {kioskItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>
      </nav>
    </aside>
  );
}

function KioskMobileNavGuest() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-bg-border bg-bg-sidebar px-1 py-2 lg:hidden">
      {kioskItems.map((item) => {
        const isActive =
          item.exact === true
            ? pathname === item.href
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
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

function KioskMobileNavLoggedIn() {
  const pathname = usePathname();
  const role = useUserRole();
  const pendingReviewCount = usePendingReviewCount();
  const navItems = getDashboardNavItems(role);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-bg-border bg-bg-sidebar px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden">
      {navItems.map((item) => {
        const isActive = isDashboardNavActive(pathname, item.href, item.exact);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors",
              isActive ? "bg-bg-elevated text-text-primary" : "text-text-muted"
            )}
          >
            <span className="relative">
              <item.icon className="size-[18px]" />
              {item.href === REVIEWS_HREF && pendingReviewCount > 0 && (
                <PendingReviewsBadge
                  count={pendingReviewCount}
                  className="absolute -top-1.5 -end-2 min-w-[0.875rem] px-1 text-[9px]"
                />
              )}
            </span>
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function KioskShell({
  children,
  loggedIn,
}: {
  children: React.ReactNode;
  loggedIn: boolean;
}) {
  const pathname = usePathname();
  const { enabled: tabletMode } = useKioskTabletMode();
  const isScanner =
    pathname === "/kiosk/checkin" || pathname === "/kiosk/checkout";
  const immersiveTablet = tabletMode && isScanner;
  const hideMobileNav = isScanner;

  return (
    <div
      className={cn(
        "flex bg-bg-page",
        isScanner
          ? "h-dvh max-h-dvh overflow-hidden supports-[height:100svh]:h-svh supports-[height:100svh]:max-h-svh"
          : "min-h-screen"
      )}
    >
      {!immersiveTablet && <KioskSidebar loggedIn={loggedIn} />}
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          isScanner ? "min-h-0 overflow-hidden" : "min-h-screen",
          !hideMobileNav && "pb-16 lg:pb-0"
        )}
      >
        <main
          className={cn(
            "flex min-w-0 flex-col",
            isScanner ? "h-full min-h-0" : "flex-1"
          )}
        >
          {children}
        </main>
      </div>
      {!hideMobileNav &&
        (loggedIn ? <KioskMobileNavLoggedIn /> : <KioskMobileNavGuest />)}
    </div>
  );
}

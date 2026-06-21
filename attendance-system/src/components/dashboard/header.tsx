"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "الرئيسية", subtitle: "ملخص اليوم" },
  "/dashboard/employees": {
    title: "الموظفون",
    subtitle: "إدارة بيانات الموظفين",
  },
  "/dashboard/reports": {
    title: "التقارير",
    subtitle: "سجلات الحضور والانصراف",
  },
  "/dashboard/settings": {
    title: "الإعدادات",
    subtitle: "الشفتات ومستخدمي النظام",
  },
};

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
}

export function DashboardHeader({ userName, userEmail }: DashboardHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const meta = PAGE_META[pathname] ?? {
    title: "لوحة التحكم",
    subtitle: "",
  };

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-bg-border bg-bg-page px-4 py-4 sm:px-6">
      <div>
        <h1 className="text-base font-semibold text-text-primary">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-xs text-text-muted">{meta.subtitle}</p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors hover:bg-bg-elevated sm:gap-3 sm:px-3 sm:py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-bg-elevated text-xs text-text-secondary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-right sm:block">
            <p className="text-sm text-text-primary">{userName}</p>
            <p className="text-xs text-text-muted" dir="ltr">
              {userEmail}
            </p>
          </div>
          <ChevronDown className="size-4 text-text-muted" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="w-52 border-bg-border bg-bg-card"
        >
          <DropdownMenuItem disabled>
            <User className="size-4" />
            {userName}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} variant="destructive">
            <LogOut className="size-4" />
            تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

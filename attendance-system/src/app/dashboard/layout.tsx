import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { RoleProvider } from "@/components/dashboard/role-context";
import { prisma } from "@/lib/prisma";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/login");
  }

  const systemUser = await prisma.systemUser.findUnique({
    where: { email: user.email },
  });

  if (!systemUser?.isActive) {
    redirect("/login?error=unauthorized");
  }

  return (
    <RoleProvider role={systemUser.role}>
      <div className="min-h-screen bg-bg-page">
        <DashboardSidebar />

        <div className="flex min-h-screen min-w-0 flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:ps-56">
          <DashboardHeader
            userName={systemUser.name}
            userEmail={user.email}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-6 sm:py-5">
            {children}
          </main>
        </div>

        <MobileNav />
      </div>
    </RoleProvider>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
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

  const userName = systemUser.name;
  const userEmail = user.email;

  return (
    <div className="flex min-h-screen bg-bg-page">
      <DashboardSidebar />

      <div className="flex min-h-screen flex-1 flex-col pb-20 lg:pb-0">
        <DashboardHeader userName={userName} userEmail={userEmail} />
        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>

      <MobileNav />
    </div>
  );
}

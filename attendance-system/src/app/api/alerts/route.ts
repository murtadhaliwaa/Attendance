import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requirePermission("dashboard:view");
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unread") !== "false";
  const limit = Math.min(
    Math.max(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 1),
    100
  );

  const alerts = await prisma.alert.findMany({
    where: unreadOnly ? { isRead: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json(alerts);
}

export async function PATCH(request: Request) {
  const auth = await requirePermission("dashboard:view");
  if (auth.error) return auth.error;

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "بيانات الطلب غير صالحة" },
      { status: 400 }
    );
  }

  if (body.all) {
    await prisma.alert.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: "تم تعليم جميع التنبيهات كمقروءة" });
  }

  const ids = Array.isArray(body.ids)
    ? body.ids.filter((id) => typeof id === "string" && id.trim())
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "حدد معرفات التنبيهات أو all: true" },
      { status: 400 }
    );
  }

  await prisma.alert.updateMany({
    where: { id: { in: ids }, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ message: "تم تحديث التنبيهات" });
}

import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/api-auth";

export async function GET() {
  const auth = await requirePermission("dashboard:view");
  if (auth.error) return auth.error;

  return NextResponse.json({ message: "قيد التطوير" }, { status: 501 });
}

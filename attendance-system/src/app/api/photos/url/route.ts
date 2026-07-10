import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { requireKioskAuth } from "@/lib/kiosk-auth";
import { getSignedPhotoUrl } from "@/lib/photo-storage";

export async function GET(request: Request) {
  const kioskDenied = await requireKioskAuth(request);
  if (kioskDenied) {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path")?.trim();
  if (!path) {
    return NextResponse.json({ error: "مسار الصورة مطلوب" }, { status: 400 });
  }

  if (path.includes("..")) {
    return NextResponse.json({ error: "مسار غير صالح" }, { status: 400 });
  }

  try {
    const url = await getSignedPhotoUrl(path);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر تحميل رابط الصورة",
      },
      { status: 500 }
    );
  }
}

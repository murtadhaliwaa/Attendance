import Link from "next/link";
import { Fingerprint, LogIn, LogOut } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "الحضور و الانصراف | نظام الحضور والانصراف",
};

export default function KioskHubPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-2xl bg-bg-elevated">
          <Fingerprint className="size-8 text-blue-primary" />
        </div>
        <h1 className="text-3xl font-bold text-text-primary">
          نظام الحضور والانصراف
        </h1>
        <p className="mt-2 text-text-secondary">اختر الحضور أو الانصراف</p>
      </div>

      <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
        <Link href="/kiosk/checkin" className="group block">
          <Card className="h-full border-emerald-500/30 bg-bg-card transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 transition-colors group-hover:bg-emerald-500/25">
                <LogIn className="size-7" />
              </div>
              <CardTitle className="text-xl">الحضور</CardTitle>
              <CardDescription className="text-text-secondary">
                لتسجيل الدخول عند بداية الدوام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-xs text-text-muted">
                ضع هذا الرابط على جهاز عند مدخل المبنى
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/kiosk/checkout" className="group block">
          <Card className="h-full border-sky-500/30 bg-bg-card transition-colors hover:border-sky-500/50 hover:bg-sky-500/5">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300 transition-colors group-hover:bg-sky-500/25">
                <LogOut className="size-7" />
              </div>
              <CardTitle className="text-xl">الانصراف</CardTitle>
              <CardDescription className="text-text-secondary">
                لتسجيل الخروج عند نهاية الدوام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-center text-xs text-text-muted">
                ضع هذا الرابط على جهاز عند مخرج المبنى
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

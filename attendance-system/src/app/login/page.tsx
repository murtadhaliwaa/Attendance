import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const isProduction = process.env.NODE_ENV === "production";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-page p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-bg-elevated">
            <Fingerprint className="size-7 text-blue-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">
            نظام الحضور والانصراف
          </h1>
          <p className="mt-1 text-text-secondary">
            سجّل دخولك للوصول إلى لوحة التحكم
          </p>
        </div>

        <Card className="border border-bg-border bg-bg-card">
          <CardHeader>
            <CardTitle className="text-text-primary">تسجيل الدخول</CardTitle>
            <CardDescription className="text-text-secondary">
              أدخل بيانات حسابك للمتابعة
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LoginForm />
            {!isProduction && (
              <div className="space-y-2 rounded-lg border border-bg-border bg-bg-elevated p-3 text-xs text-text-secondary">
                <p className="font-medium text-text-primary">حسابات تجريبية:</p>
                <p>
                  مدير (كامل الصلاحيات):{" "}
                  <span dir="ltr" className="text-text-primary">
                    hr@company.com
                  </span>
                </p>
                <p>
                  موظف استعلامات (عرض كل الصفحات — إضافة موظف فقط):{" "}
                  <span dir="ltr" className="text-text-primary">
                    inquiry@company.com
                  </span>
                </p>
                <p>
                  كلمة المرور:{" "}
                  <span dir="ltr" className="text-text-primary">
                    Admin@123456
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-text-secondary">
          جهاز التسجيل الميداني؟{" "}
          <Link
            href="/kiosk"
            className="text-blue-primary transition-colors hover:text-blue-dark"
          >
            الانتقال إلى الحضور والانصراف
          </Link>
        </p>
      </div>
    </main>
  );
}

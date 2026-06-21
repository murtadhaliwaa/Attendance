import type { Metadata } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "نظام الحضور والانصراف",
  description: "نظام تسجيل حضور وانصراف الموظفين بالتعرف على الوجه",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark" suppressHydrationWarning>
      <body
        className={`${notoSansArabic.variable} font-arabic antialiased`}
        style={{ backgroundColor: "#12141a", color: "#e8eaed" }}
        suppressHydrationWarning
      >
        {children}
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}

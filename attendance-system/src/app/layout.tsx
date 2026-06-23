import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  title: "نظام الحضور والانصراف",
  description: "نظام تسجيل حضور وانصراف الموظفين بالتعرف على الوجه",
  applicationName: "نظام الحضور",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "نظام الحضور",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#12141a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
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
        <PwaRegister />
        <Toaster position="top-center" richColors dir="rtl" />
      </body>
    </html>
  );
}

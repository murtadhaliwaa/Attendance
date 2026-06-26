import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
    serverComponentsExternalPackages: ["@vladmandic/human"],
  },
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  async headers() {
    return [
      {
        // نماذج التعرف على الوجه (~9MB) ثابتة — نخزّنها بقوة ليكون التحميل
        // البطيء لمرة واحدة فقط، ثم فوري في كل تشغيل لاحق للكشك.
        source: "/models/human/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer }) => {
    // أولوية node_modules المحلي — يمنع حل React 19 من المجلد الأب (Prisma Studio)
    config.resolve.modules = [
      path.resolve(appDir, "node_modules"),
      ...(Array.isArray(config.resolve.modules)
        ? config.resolve.modules
        : ["node_modules"]),
    ];

    if (dev) {
      config.devtool = isServer ? false : "cheap-module-source-map";
    }

    if (dev && !isServer) {
      // Next.js يفرض eval-source-map — نستبدله بعد الإعداد عبر plugin لتجنّب تحذير CSP
      const safeDevtool = "cheap-module-source-map";
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.environment.tap("SafeDevtoolPlugin", () => {
            compiler.options.devtool = safeDevtool;
          });
        },
      });
    }

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        encoding: false,
      };
    }

    // تحذير غير مؤثر من تبعيات @supabase/ssr في Edge Runtime (process.version).
    // الكود لدينا لا يستخدمه، لذا نُخفي الضجيج فقط دون تعطيل أي وظيفة.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { message: /A Node\.js API is used \(process\.(version|versions)/ },
    ];

    return config;
  },
};

export default nextConfig;

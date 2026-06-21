import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "attendance-system/.env.local" });
config({ path: "attendance-system/.env" });

export default defineConfig({
  schema: "attendance-system/prisma/schema.prisma",
  migrations: {
    path: "attendance-system/prisma/migrations",
    seed: "npm --prefix attendance-system run db:seed",
  },
  datasource: {
    // Prisma CLI يحتاج اتصال مباشر (5432) وليس transaction pooler (6543)
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});

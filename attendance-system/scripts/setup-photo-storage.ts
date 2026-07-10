import { config } from "dotenv";
import path from "path";
import { ensurePhotoBucket } from "../src/lib/photo-storage";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.production.local") });
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

async function main() {
  await ensurePhotoBucket();
  console.log("OK: attendance-photos bucket is ready");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

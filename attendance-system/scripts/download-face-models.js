const { copyFile, mkdir, stat } = require("fs/promises");
const path = require("path");

/**
 * نماذج Human المطلوبة:
 * - blazeface / facemesh / faceres: الكشف + البصمة 1024-d
 * - antispoof / liveness: كشف الحيوية (منع خداع النظام بصورة على هاتف)
 */
const HUMAN_MODELS = [
  "blazeface",
  "facemesh",
  "faceres",
  "antispoof",
  "liveness",
];

async function copyModel(srcDir, outDir, name) {
  for (const ext of [".json", ".bin"]) {
    const file = `${name}${ext}`;
    const src = path.join(srcDir, file);
    const dest = path.join(outDir, file);
    await copyFile(src, dest);
    const size = (await stat(dest)).size;
    console.log(`✓ ${file} (${size} bytes)`);
  }
}

async function main() {
  const pkgModels = path.join(
    __dirname,
    "..",
    "node_modules",
    "@vladmandic",
    "human",
    "models"
  );
  const outDir = path.join(__dirname, "..", "public", "models", "human");
  await mkdir(outDir, { recursive: true });

  for (const name of HUMAN_MODELS) {
    await copyModel(pkgModels, outDir, name);
  }

  console.log(`\nتم نسخ ${HUMAN_MODELS.length} نماذج Human إلى public/models/human/`);
  console.log("المسار في التطبيق: /models/human/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

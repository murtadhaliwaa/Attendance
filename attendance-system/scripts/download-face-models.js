const { mkdir, writeFile } = require("fs/promises");
const path = require("path");

const BASE =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

async function main() {
  const outDir = path.join(__dirname, "..", "public", "models");
  await mkdir(outDir, { recursive: true });

  for (const file of FILES) {
    const url = `${BASE}/${file}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`فشل تنزيل ${file}: ${res.status}`);
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    await writeFile(path.join(outDir, file), buffer);
    console.log(`✓ ${file} (${buffer.length} bytes)`);
  }

  console.log("\nتم تنزيل جميع نماذج التعرف على الوجه");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

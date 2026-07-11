import { config } from "dotenv";
import path from "path";
import { cleanupOldAttendancePhotos } from "../src/lib/cleanup-attendance-photos";
import { prisma } from "../src/lib/prisma";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

async function main() {
  console.log("🧹 تنظيف صور الحضور/الانصراف القديمة...");
  const result = await cleanupOldAttendancePhotos();
  console.log("✅ النتيجة:");
  console.log(`   مدة الاحتفاظ: ${result.retentionDays} يوماً`);
  console.log(`   قبل تاريخ: ${result.cutoffDate}`);
  console.log(`   سجلات فُحصت: ${result.scanned}`);
  console.log(`   صور حضور حُذفت: ${result.deletedCheckIn}`);
  console.log(`   صور انصراف حُذفت: ${result.deletedCheckOut}`);
  console.log(`   سجلات حُدّثت في DB: ${result.clearedDbFields}`);
  if (result.errors.length > 0) {
    console.warn(`⚠️  أخطاء (${result.errors.length}):`);
    result.errors.slice(0, 10).forEach((e) => console.warn(`   - ${e}`));
  }
}

main()
  .catch((error) => {
    console.error("❌ فشل التنظيف:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

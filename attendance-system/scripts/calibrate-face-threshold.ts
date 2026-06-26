/**
 * معايرة عتبة التعرف على الوجه بناءً على بصمات الموظفين الفعلية.
 *
 * الهدف: قياس مدى تشابه موظفيك الحقيقيين ببعضهم (خطر الخلط بين موظف وآخر)
 * ثم اقتراح عتبة مطابقة آمنة مبنية على بياناتك — لا على تخمين.
 *
 * قراءة فقط: لا يعدّل أي شيء في قاعدة البيانات.
 *
 * التشغيل: npm run face:calibrate
 *
 * ملاحظة: قاعدة البيانات تخزّن قالباً واحداً لكل موظف، لذا يقيس هذا السكربت
 * "مسافة الأشخاص المختلفين" (خطر القبول الخاطئ — أهم مخاوفك). أما معايرة
 * "رفض الموظف الحقيقي" فتحتاج التقاطاً حياً متعدداً (أداة منفصلة مستقبلاً).
 */
import { config } from "dotenv";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { CURRENT_FACE_DESCRIPTOR_VERSION } from "../src/lib/face-descriptor-version";
import { humanMatchDistance } from "../src/lib/face-match-distance";
import { getFaceMatchThresholds } from "../src/lib/face-match-config";
import { hasRealFaceDescriptor } from "../src/lib/face-descriptor-utils";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

type EmployeeTemplate = {
  id: string;
  name: string;
  employeeCode: string;
  descriptor: number[];
};

type Pair = {
  a: EmployeeTemplate;
  b: EmployeeTemplate;
  distance: number;
};

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.round((p / 100) * (sortedAsc.length - 1)))
  );
  return sortedAsc[idx]!;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(4) : "—";
}

async function loadTemplates(): Promise<EmployeeTemplate[]> {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL / DIRECT_URL غير مُعد في .env");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const employees = await prisma.employee.findMany({
      where: {
        hasFaceRegistered: true,
        faceDescriptorVersion: CURRENT_FACE_DESCRIPTOR_VERSION,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        faceDescriptor: true,
        faceDescriptorVersion: true,
      },
    });

    return employees
      .filter((e) =>
        hasRealFaceDescriptor(e.faceDescriptor, e.faceDescriptorVersion)
      )
      .map((e) => ({
        id: e.id,
        name: e.name,
        employeeCode: e.employeeCode,
        descriptor: e.faceDescriptor,
      }));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

function computePairs(templates: EmployeeTemplate[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      const distance = humanMatchDistance(
        templates[i]!.descriptor,
        templates[j]!.descriptor
      );
      pairs.push({ a: templates[i]!, b: templates[j]!, distance });
    }
  }
  return pairs;
}

function recommendThreshold(minCross: number, current: number): {
  verdict: "ممتاز" | "جيد" | "خطر";
  recommended: number;
  note: string;
} {
  // هامش أمان: نريد عتبة المطابقة أقل من أقرب مسافة بين شخصين مختلفين
  // حتى لا يقع شخصان مختلفان داخل العتبة معاً.
  const SAFETY = 0.05;

  if (minCross >= current + 2 * SAFETY) {
    return {
      verdict: "ممتاز",
      recommended: current,
      note: "موظفوك متباعدون جيداً. العتبة الحالية آمنة، ولا داعي لتغييرها.",
    };
  }

  if (minCross > current) {
    return {
      verdict: "جيد",
      recommended: Number((minCross - SAFETY).toFixed(2)),
      note: "العتبة الحالية آمنة لكن الهامش ضيّق. راقب الأزواج المتقاربة أدناه.",
    };
  }

  // minCross <= current → شخصان مختلفان داخل العتبة معاً: خطر خلط حقيقي.
  const recommended = Math.max(0.3, Number((minCross - SAFETY).toFixed(2)));
  return {
    verdict: "خطر",
    recommended,
    note:
      "يوجد موظفان متشابهان داخل العتبة الحالية — خطر خلط. أعد تسجيل وجه أحدهما " +
      "بإضاءة/زاوية أوضح، أو اخفض العتبة إلى القيمة المقترحة.",
  };
}

async function main() {
  console.log("=== معايرة عتبة التعرف على الوجه ===\n");

  const thresholds = getFaceMatchThresholds(CURRENT_FACE_DESCRIPTOR_VERSION);
  console.log(`الإصدار: v${CURRENT_FACE_DESCRIPTOR_VERSION}`);
  console.log(`العتبة الحالية (match): ${thresholds.match}`);
  console.log(`هامش الفجوة الحالي (minGap): ${thresholds.minGap}\n`);

  const templates = await loadTemplates();
  console.log(`عدد الموظفين النشطين ببصمة v2 صالحة: ${templates.length}`);

  if (templates.length < 2) {
    console.log(
      "\n⚠ تحتاج موظفَين على الأقل لإجراء المعايرة. سجّل المزيد من الوجوه ثم أعد التشغيل."
    );
    return;
  }

  const pairs = computePairs(templates);
  const distances = pairs.map((p) => p.distance).sort((x, y) => x - y);
  console.log(`عدد أزواج المقارنة: ${pairs.length}\n`);

  const minCross = distances[0]!;
  const stats = {
    min: minCross,
    p1: percentile(distances, 1),
    p5: percentile(distances, 5),
    p50: percentile(distances, 50),
    mean: distances.reduce((s, v) => s + v, 0) / distances.length,
    max: distances[distances.length - 1]!,
  };

  console.log("توزيع المسافات بين الأشخاص المختلفين (الأقل = أكثر تشابهاً):");
  console.log(`  الأدنى (أخطر زوج): ${fmt(stats.min)}`);
  console.log(`  مئيني 1%:          ${fmt(stats.p1)}`);
  console.log(`  مئiني 5%:          ${fmt(stats.p5)}`);
  console.log(`  الوسيط:            ${fmt(stats.p50)}`);
  console.log(`  المتوسط:           ${fmt(stats.mean)}`);
  console.log(`  الأعلى:            ${fmt(stats.max)}\n`);

  const withinMatch = pairs.filter((p) => p.distance <= thresholds.match);
  console.log(
    `أزواج تقع داخل العتبة الحالية (${thresholds.match}): ${withinMatch.length}` +
      (withinMatch.length > 0
        ? "  ← يحميها حارس الفجوة، لكنها الأكثر عرضة للالتباس"
        : "  ← ممتاز، لا تداخل")
  );

  const closest = [...pairs].sort((x, y) => x.distance - y.distance).slice(0, 10);
  console.log("\nأقرب 10 أزواج (الأكثر تشابهاً — راجعها):");
  for (const p of closest) {
    const flag = p.distance <= thresholds.match ? "⚠" : " ";
    console.log(
      `  ${flag} ${fmt(p.distance)}  ${p.a.name} (${p.a.employeeCode})  ↔  ${p.b.name} (${p.b.employeeCode})`
    );
  }

  const rec = recommendThreshold(minCross, thresholds.match);
  console.log("\n=== التوصية ===");
  console.log(`التقييم: ${rec.verdict}`);
  console.log(`العتبة المقترحة (match): ${rec.recommended}`);
  console.log(rec.note);
  console.log(
    "\nلتغيير العتبة: عدّل FACE_MATCH_THRESHOLD_V2 في src/lib/face-match-config.ts"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

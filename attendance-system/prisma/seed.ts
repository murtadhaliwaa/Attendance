import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  AlertType,
  Method,
  PrismaClient,
  Role,
  Status,
} from "@prisma/client";
import { subDays } from "date-fns";
import { Pool } from "pg";

import path from "path";
import { getTodayDate } from "../src/lib/app-timezone";

const projectRoot = path.resolve(__dirname, "..");
config({ path: path.join(projectRoot, ".env.local") });
config({ path: path.join(projectRoot, ".env") });

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const DEPARTMENTS = [
  "الإدارة",
  "الموارد البشرية",
  "المحاسبة",
  "تقنية المعلومات",
  "المبيعات",
  "التسويق",
  "الإنتاج",
  "المستودعات",
  "الأمن",
  "الصيانة",
];

const POSITIONS = [
  "مدير",
  "مشرف",
  "أخصائي",
  "محاسب",
  "مهندس",
  "فني",
  "مندوب مبيعات",
  "موظف استقبال",
  "أمين مستودع",
  "عامل",
];

const FIRST_NAMES = [
  "أحمد",
  "محمد",
  "علي",
  "حسن",
  "خالد",
  "عمر",
  "يوسف",
  "إبراهيم",
  "سعيد",
  "فهد",
  "ناصر",
  "سلمان",
  "عبدالله",
  "فيصل",
  "ماجد",
  "راشد",
  "طارق",
  "وليد",
  "بدر",
  "سامي",
  "كريم",
  "هاني",
  "زياد",
  "رائد",
  "مازن",
  "جاسم",
  "حمد",
  "نواف",
  "تركي",
  "سلطان",
];

const LAST_NAMES = [
  "العتيبي",
  "القحطاني",
  "الشمري",
  "الدوسري",
  "الحربي",
  "الزهراني",
  "الغامدي",
  "العنزي",
  "المطيري",
  "السبيعي",
  "الشهري",
  "الأحمدي",
  "المالكي",
  "السالم",
  "الخالدي",
  "الراشد",
  "الفهد",
  "النجار",
  "البلوي",
  "الجهني",
];

function buildCheckIn(date: Date, hour: number, minute: number) {
  const checkIn = new Date(date);
  checkIn.setHours(hour, minute, 0, 0);
  return checkIn;
}

function buildCheckOut(date: Date, hour: number, minute: number) {
  const checkOut = new Date(date);
  checkOut.setHours(hour, minute, 0, 0);
  return checkOut;
}

async function main() {
  console.log("🌱 بدء تعبئة البيانات...");

  await prisma.alert.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.department.deleteMany();
  await prisma.systemUser.deleteMany();

  await prisma.department.createMany({
    data: DEPARTMENTS.map((name) => ({ name })),
  });

  const shifts = await Promise.all([
    prisma.workSchedule.create({
      data: {
        name: "شفت 1",
        startTime: "07:00",
        endTime: "15:00",
        lateAfter: 10,
        earlyLeaveBefore: 0,
        isDefault: true,
      },
    }),
    prisma.workSchedule.create({
      data: {
        name: "شفت 2",
        startTime: "15:00",
        endTime: "23:00",
        lateAfter: 10,
        earlyLeaveBefore: 0,
      },
    }),
    prisma.workSchedule.create({
      data: {
        name: "شفت 3",
        startTime: "23:00",
        endTime: "07:00",
        lateAfter: 10,
        earlyLeaveBefore: 0,
      },
    }),
  ]);

  const [morningShift, eveningShift, fullShift] = shifts;

  const employees = Array.from({ length: 88 }, (_, index) => {
    const num = index + 1;
    const department = DEPARTMENTS[index % DEPARTMENTS.length];
    const position = POSITIONS[index % POSITIONS.length];
    const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
    const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];

    let shiftId = morningShift.id;
    if (index % 3 === 1) shiftId = eveningShift.id;
    if (index % 3 === 2) shiftId = fullShift.id;

    return {
      employeeCode: `EMP${String(num).padStart(3, "0")}`,
      name: `${firstName} ${lastName}`,
      department,
      position,
      phone: `05${String(500000000 + num).slice(0, 9)}`,
      faceDescriptor: [],
      emergencyCode: String(100000 + num),
      shiftId,
      isActive: index !== 87,
    };
  });

  await prisma.employee.createMany({ data: employees });

  const createdEmployees = await prisma.employee.findMany({
    orderBy: { employeeCode: "asc" },
  });

  const systemUsers = await Promise.all([
    prisma.systemUser.create({
      data: {
        email: "hr@company.com",
        name: "سارة القحطاني",
        role: Role.MANAGER,
      },
    }),
    prisma.systemUser.create({
      data: {
        email: "inquiry@company.com",
        name: "فهد العنزي",
        role: Role.INQUIRY_CLERK,
      },
    }),
  ]);

  const today = getTodayDate();
  const attendanceRecords: {
    employeeId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    status: Status;
    method: Method;
    overtime?: number;
    notes?: string;
  }[] = [];

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = subDays(today, dayOffset);

    createdEmployees.forEach((employee, index) => {
      if (dayOffset === 0 && index % 11 === 0) return;
      if (dayOffset === 1 && index % 9 === 0) return;
      if (dayOffset === 2 && index % 13 === 0) return;

      let status: Status = Status.PRESENT;
      let checkIn = buildCheckIn(date, 7, 55 + (index % 5));
      let checkOut = buildCheckOut(date, 16, 5 + (index % 10));
      let overtime: number | undefined;
      let notes: string | undefined;
      let method: Method = Method.FACE;

      if (index % 17 === 0 && dayOffset < 3) {
        status = Status.LATE;
        checkIn = buildCheckIn(date, 8, 25 + (index % 10));
        notes = "تأخر عن موعد الشفت";
      } else if (index % 23 === 0 && dayOffset < 4) {
        status = Status.EARLY_LEAVE;
        checkOut = buildCheckOut(date, 14, 30);
        notes = "انصراف مبكر بإذن";
      } else if (index % 31 === 0 && dayOffset < 2) {
        status = Status.PRESENT;
        checkOut = buildCheckOut(date, 18, 15);
        overtime = 120;
      } else if (index % 19 === 0 && dayOffset === 0) {
        method = Method.EMERGENCY_CODE;
        notes = "تسجيل عبر الرمز الطارئ";
      }

      attendanceRecords.push({
        employeeId: employee.id,
        date,
        checkIn,
        checkOut,
        status,
        method,
        overtime,
        notes,
      });
    });
  }

  await prisma.attendance.createMany({ data: attendanceRecords });

  const alertEmployees = createdEmployees.slice(0, 8);
  await prisma.alert.createMany({
    data: [
      {
        type: AlertType.LATE,
        employeeId: alertEmployees[0].id,
        employeeName: alertEmployees[0].name,
        message: `${alertEmployees[0].name} تأخر 25 دقيقة عن موعد الحضور`,
        isRead: false,
      },
      {
        type: AlertType.LATE,
        employeeId: alertEmployees[1].id,
        employeeName: alertEmployees[1].name,
        message: `${alertEmployees[1].name} تأخر 18 دقيقة عن موعد الحضور`,
        isRead: true,
      },
      {
        type: AlertType.ABSENT,
        employeeId: alertEmployees[2].id,
        employeeName: alertEmployees[2].name,
        message: `${alertEmployees[2].name} غائب اليوم دون إشعار مسبق`,
        isRead: false,
      },
      {
        type: AlertType.OVERTIME,
        employeeId: alertEmployees[3].id,
        employeeName: alertEmployees[3].name,
        message: `${alertEmployees[3].name} تجاوز ساعات العمل بمقدار ساعتين`,
        isRead: false,
      },
      {
        type: AlertType.ABSENT,
        employeeId: alertEmployees[4].id,
        employeeName: alertEmployees[4].name,
        message: `${alertEmployees[4].name} لم يسجل حضوراً اليوم`,
        isRead: false,
      },
    ],
  });

  console.log("✅ تم تعبئة البيانات بنجاح:");
  console.log(`   - ${DEPARTMENTS.length} أقسام`);
  console.log(`   - ${shifts.length} شفتات عمل`);
  console.log(`   - ${createdEmployees.length} موظف`);
  console.log(`   - ${systemUsers.length} مستخدمي نظام`);
  console.log(`   - ${attendanceRecords.length} سجل حضور`);
  console.log("   - 5 تنبيهات");
  console.log("");
  console.log("📧 حسابات النظام (للمرحلة القادمة - تسجيل الدخول):");
  systemUsers.forEach((user) => {
    console.log(`   - ${user.email} (${user.role})`);
  });
}

main()
  .catch((error) => {
    console.error("❌ فشل تعبئة البيانات:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

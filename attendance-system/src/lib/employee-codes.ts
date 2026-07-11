import { prisma } from "@/lib/prisma";

export async function nextEmployeeCode() {
  const last = await prisma.employee.findFirst({
    where: { employeeCode: { startsWith: "EMP" } },
    orderBy: { employeeCode: "desc" },
    select: { employeeCode: true },
  });

  const match = last?.employeeCode.match(/^EMP(\d+)$/);
  const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
  return `EMP${String(nextNum).padStart(3, "0")}`;
}

import { prisma } from "@/lib/prisma";
import type { WorkSchedule } from "@prisma/client";
import {
  DEFAULT_SHIFTS,
  DEFAULT_SHIFT_COUNT,
  type DefaultShiftDefinition,
} from "@/lib/shift-defaults";
import { invalidateShiftTimingsCache } from "@/lib/attendance-reconcile";

export { DEFAULT_SHIFTS, DEFAULT_SHIFT_COUNT, type DefaultShiftDefinition };

function definitionMatchesShift(
  definition: DefaultShiftDefinition,
  shift: WorkSchedule
) {
  return (
    definition.name === shift.name ||
    definition.aliases.some((alias) => shift.name === alias)
  );
}

function buildShiftSyncData(
  definition: DefaultShiftDefinition,
  shift: WorkSchedule
) {
  const data: {
    name?: string;
    startTime?: string;
    endTime?: string;
    lateAfter?: number;
    earlyLeaveBefore?: number;
  } = {};

  if (shift.name !== definition.name) data.name = definition.name;
  if (shift.startTime !== definition.startTime) data.startTime = definition.startTime;
  if (shift.endTime !== definition.endTime) data.endTime = definition.endTime;
  if (shift.lateAfter !== definition.lateAfter) data.lateAfter = definition.lateAfter;
  if (shift.earlyLeaveBefore !== definition.earlyLeaveBefore) {
    data.earlyLeaveBefore = definition.earlyLeaveBefore;
  }

  return data;
}

export async function ensureDefaultShifts(
  existing?: WorkSchedule[]
): Promise<boolean> {
  const rows = existing ?? (await prisma.workSchedule.findMany());

  const matchedIds = new Set<string>();
  let mutated = false;

  for (const definition of DEFAULT_SHIFTS) {
    const match = rows.find(
      (shift) =>
        !matchedIds.has(shift.id) && definitionMatchesShift(definition, shift)
    );

    if (match) {
      matchedIds.add(match.id);
      const syncData = buildShiftSyncData(definition, match);
      if (Object.keys(syncData).length > 0) {
        await prisma.workSchedule.update({
          where: { id: match.id },
          data: syncData,
        });
        mutated = true;
      }
      continue;
    }

    const created = await prisma.workSchedule.create({
      data: {
        name: definition.name,
        startTime: definition.startTime,
        endTime: definition.endTime,
        lateAfter: definition.lateAfter,
        earlyLeaveBefore: definition.earlyLeaveBefore,
        isDefault: definition.isDefault && !rows.some((shift) => shift.isDefault),
      },
    });
    rows.push(created);
    matchedIds.add(created.id);
    mutated = true;
  }

  const defaultShift = await prisma.workSchedule.findFirst({
    where: { isDefault: true },
  });
  if (!defaultShift) {
    const morning = await prisma.workSchedule.findFirst({
      where: { name: "شفت 1" },
    });
    if (morning) {
      await prisma.workSchedule.update({
        where: { id: morning.id },
        data: { isDefault: true },
      });
      mutated = true;
    }
  }

  if (mutated) {
    invalidateShiftTimingsCache();
  }

  return mutated;
}

export async function getShiftOptions() {
  let shifts = await prisma.workSchedule.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, startTime: true, endTime: true },
  });

  if (shifts.length < DEFAULT_SHIFT_COUNT) {
    await ensureDefaultShifts();
    shifts = await prisma.workSchedule.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, startTime: true, endTime: true },
    });
  }

  return shifts;
}

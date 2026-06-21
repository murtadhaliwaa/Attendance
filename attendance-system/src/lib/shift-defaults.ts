export type DefaultShiftDefinition = {
  name: string;
  startTime: string;
  endTime: string;
  lateAfter: number;
  earlyLeaveBefore: number;
  isDefault: boolean;
  aliases: string[];
};

export const DEFAULT_SHIFTS: DefaultShiftDefinition[] = [
  {
    name: "شفت 1",
    startTime: "07:00",
    endTime: "15:00",
    lateAfter: 10,
    earlyLeaveBefore: 0,
    isDefault: true,
    aliases: ["شفت 1", "شفت صباحي", "الشفت الصباحي", "الدوام الإداري"],
  },
  {
    name: "شفت 2",
    startTime: "15:00",
    endTime: "23:00",
    lateAfter: 10,
    earlyLeaveBefore: 0,
    isDefault: false,
    aliases: ["شفت 2", "شفت مسائي", "الشفت المسائي"],
  },
  {
    name: "شفت 3",
    startTime: "23:00",
    endTime: "07:00",
    lateAfter: 10,
    earlyLeaveBefore: 0,
    isDefault: false,
    aliases: ["شفت 3", "شفت ليلي", "الشفت الليلي", "شفت كامل ليلي"],
  },
];

export const DEFAULT_SHIFT_COUNT = DEFAULT_SHIFTS.length;

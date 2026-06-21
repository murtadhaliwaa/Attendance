export type ShiftRow = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  lateAfter: number;
  earlyLeaveBefore: number;
  isDefault: boolean;
  employeeCount: number;
};

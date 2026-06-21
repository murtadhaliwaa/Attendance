export const POSITIONS = [
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
] as const;

export type EmployeeRow = {
  id: string;
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  phone: string | null;
  emergencyCode: string;
  shiftId: string | null;
  shiftName: string | null;
  customEndTime: string | null;
  isActive: boolean;
  hasFace: boolean;
};

export type ShiftOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type EmployeeFormData = {
  employeeCode: string;
  name: string;
  department: string;
  position: string;
  phone: string;
  emergencyCode: string;
  shiftId: string;
  customEndTime: string;
  isActive: boolean;
};

export const emptyEmployeeForm = (department = ""): EmployeeFormData => ({
  employeeCode: "",
  name: "",
  department,
  position: "",
  phone: "",
  emergencyCode: "",
  shiftId: "",
  customEndTime: "",
  isActive: true,
});

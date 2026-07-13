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
  shiftId: string | null;
  shiftName: string | null;
  customEndTime: string | null;
  isActive: boolean;
  hasReferencePhoto: boolean;
  referencePhotoUrl: string | null;
};

export type ShiftOption = {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
};

export type EmployeeFormData = {
  name: string;
  department: string;
  position: string;
  phone: string;
  shiftId: string;
  customEndTime: string;
  isActive: boolean;
};

export const emptyEmployeeForm = (department = ""): EmployeeFormData => ({
  name: "",
  department,
  position: "",
  phone: "",
  shiftId: "",
  customEndTime: "",
  isActive: true,
});

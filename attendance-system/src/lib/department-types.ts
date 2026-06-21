export const DEFAULT_DEPARTMENTS = [
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
] as const;

export type DepartmentRow = {
  id: string;
  name: string;
  employeeCount: number;
};

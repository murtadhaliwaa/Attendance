export type SupervisorRow = {
  id: string;
  name: string;
  emergencyCode: string;
  isActive: boolean;
};

/** الرمز الطارئ للمشرف: 6 أرقام (نفس صيغة رموز الموظفين القديمة) */
export const SUPERVISOR_CODE_PATTERN = /^\d{6}$/;

export function validateSupervisorCode(code: string): string | null {
  if (!SUPERVISOR_CODE_PATTERN.test(code)) {
    return "الرمز الطارئ يجب أن يتكوّن من 6 أرقام";
  }
  return null;
}

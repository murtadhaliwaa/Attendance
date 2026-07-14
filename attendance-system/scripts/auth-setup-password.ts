/** كلمة المرور الافتراضية القديمة — ممنوعة في إعداد الإنتاج */
export const WEAK_AUTH_SETUP_PASSWORD = "Admin@123456";

export function resolveAuthSetupPassword(options?: {
  allowWeakDefault?: boolean;
}): string {
  const raw = process.env.AUTH_SETUP_PASSWORD?.trim();
  const allowWeak = options?.allowWeakDefault === true;

  if (!raw) {
    if (allowWeak) return WEAK_AUTH_SETUP_PASSWORD;
    throw new Error(
      "AUTH_SETUP_PASSWORD غير مُعد. عيّن كلمة مرور قوية في البيئة قبل إنشاء/تحديث حسابات الإدارة."
    );
  }

  if (raw === WEAK_AUTH_SETUP_PASSWORD && !allowWeak) {
    throw new Error(
      `رفض استخدام كلمة المرور الضعيفة ${WEAK_AUTH_SETUP_PASSWORD}. عيّن AUTH_SETUP_PASSWORD بقيمة قوية.`
    );
  }

  if (raw.length < 12 && !allowWeak) {
    throw new Error("AUTH_SETUP_PASSWORD يجب أن تكون 12 حرفاً على الأقل.");
  }

  return raw;
}

# 08 — PWA (تطبيق ويب تقدمي)

## الوصف
إمكانية تثبيت النظام كتطبيق على الجوال.

## الملفات

| الملف | الدور |
|-------|-------|
| `app/manifest.ts` | Web App Manifest |
| `app/pwa-icon/[size]/route.tsx` | أيقونات 192/512 |
| `public/sw.js` | Service Worker بسيط |
| `components/pwa-register.tsx` | تسجيل SW (إنتاج فقط) |

## السلوك

- **تطوير:** إلغاء تسجيل SW تلقائياً
- **إنتاج:** تسجيل `/sw.js`
- SW لا يعترض fetch (تجنب أخطاء offline)

## التوسع

- تخزين مؤقت للأصول الثابتة
- offline fallback للكشك (معقد — يحتاج تخزين نماذج محلي)

# نظام الحضور والانصراف

نظام عربي (RTL) لتسجيل حضور وانصراف الموظفين بالصورة مع مراجعة موظف الاستعلامات، ولوحة تحكم وتقارير.

## التقنيات

- **Next.js 14** · React 18 · TypeScript
- **Supabase** — مصادقة + PostgreSQL + تخزين الصور
- **Prisma 7** — ORM
- **Vercel** — نشر الإنتاج

## البدء السريع

```bash
# من جذر المستودع
npm run dev

# أو من مجلد التطبيق
cd attendance-system
npm install
cp .env.example .env.local   # ثم املأ القيم (بما فيها CRON_SECRET و DIRECT_URL)
npx prisma migrate deploy
npm run env:validate
npm run storage:setup-photos   # مرة واحدة لإنشاء bucket الصور
npm run dev
```

التطبيق: [http://localhost:3000](http://localhost:3000)

> نشر Vercel يشغّل `prisma migrate deploy` تلقائياً أثناء البناء. تأكد أن `DATABASE_URL` و `DIRECT_URL` مضبوطان على Vercel.

## أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `npm run build` | بناء إنتاج |
| `npm run db:seed` | بيانات تجريبية |
| `npm run db:clear` | مسح كل البيانات |
| `npm run auth:setup-production` | حسابات الإدارة (يتطلب `AUTH_SETUP_PASSWORD` قوية) |
| `npm run db:backfill-departments` | ربط `departmentId` بعد migration |
| `npm run storage:setup-photos` | إنشاء bucket و سياسات Storage |
| `npm run storage:cleanup-photos` | تنظيف صور الحضور القديمة |
| `npm run env:validate` | التحقق من `.env` |
| `npm run env:validate:production` | تحقق صارم للإنتاج (`CRON_SECRET` إلزامي) |

## طريقة العمل

1. يُسجَّل لكل موظف **صورة مرجعية** من لوحة التحكم.
2. في الكشك يختار الموظف الشفت واسمه ثم يلتقط صورة للحضور/الانصراف.
3. يصل الطلب إلى صفحة المراجعات؛ يؤكد أو يرفض موظف الاستعلامات بعد مقارنة الصورة بالمرجعية.

## المتغيرات البيئية

انظر `.env.example`. على **Vercel → Settings → Environment Variables** تأكد من:

| المتغير | ملاحظة |
|---------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مطلوب |
| `DATABASE_URL` | pooler منفذ 6543 + `pgbouncer=true` |
| `DIRECT_URL` | منفذ 5432 للـ migrations |
| `KIOSK_API_KEY` | سر عشوائي طويل (≥ 32 حرفاً) |
| `CRON_SECRET` | إلزامي في الإنتاج — لحماية cron تنظيف الصور |
| `SUPABASE_S3_ACCESS_KEY_ID` · `SUPABASE_S3_SECRET_ACCESS_KEY` · `SUPABASE_S3_REGION` | رفع الصور عبر S3 |
| `AUTH_SETUP_PASSWORD` | فقط محلياً عند إنشاء الحسابات — ليست لمتغيرات Runtime العامة |
| `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` | **اختياري تماماً** — غير مطلوب للخطة المجانية. بدونها يعمل حدّ المعدّل في الذاكرة بدون تكلفة |
| `RATE_LIMIT_USE_DB` | اختياري (`true`) — حدّ معدّل عبر PostgreSQL (أبطأ؛ غير موصى للمسار الحر) |

## إعداد Storage (صور الحضور)

1. من Supabase → **Storage → S3 Access Keys** أنشئ مفاتيح وضعها في البيئة.
2. شغّل محلياً مرة واحدة:
   ```bash
   npm run storage:setup-photos
   ```
   يُنشئ bucket `attendance-photos` (خاص) ومسارات `reference/` و `attendance/`.
3. لا تجعل الـ bucket عاماً للقراءة — التطبيق يخدم الروابط عبر `/api/photos/url`.

## أمان الكشك (الشبكة الداخلية)

- جلسة الكشك تُمنح عند فتح `/kiosk` — مصمَّم لتابلت الشركة على الشبكة الداخلية.
- في الإنتاج تُخفى رابط «جهاز التسجيل» من صفحة `/login`؛ افتح التابلت مباشرة على `/kiosk` ثم الحضور/الانصراف.
- بعد الإعداد غيّر كلمات مرور `hr@…` و `inquiry@…` إن كانت ما زالت كلمة المرور الافتراضية القديمة `Admin@123456`.
- إن كان الموقع عاماً على الإنترنت، يُفضّل تقييد الوصول بشبكة داخلية أو VPN.

## الأدوار

| الحساب | الدور |
|--------|-------|
| `hr@company.com` | مدير — صلاحيات كاملة |
| `inquiry@company.com` | استعلامات — إضافة موظف + مراجعة الصور |

إعداد: عيّن `AUTH_SETUP_PASSWORD` ثم `npm run auth:setup-production`

## المسارات الرئيسية

| المسار | الوصف |
|--------|--------|
| `/login` | تسجيل الدخول |
| `/dashboard` | لوحة التحكم |
| `/dashboard/reviews` | مراجعة صور الحضور/الانصراف |
| `/kiosk` | اختيار الحضور أو الانصراف |
| `/kiosk/checkin` | حضور بالصورة |
| `/kiosk/checkout` | انصراف بالصورة |

## هيكل المشروع

```
attendance-system/
├── src/app/       # صفحات + API
├── src/lib/       # منطق الحضور بالصورة والتخزين
├── prisma/        # مخطط قاعدة البيانات
└── scripts/       # صيانة وإعداد
```

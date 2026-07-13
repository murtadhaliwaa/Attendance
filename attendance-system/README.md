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
cp .env.example .env.local   # ثم املأ القيم
npm run dev
```

التطبيق: [http://localhost:3000](http://localhost:3000)

## أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `npm run build` | بناء إنتاج |
| `npm run db:seed` | بيانات تجريبية |
| `npm run db:clear` | مسح كل البيانات |
| `npm run auth:setup-production` | حسابات الإدارة |
| `npm run db:backfill-departments` | ربط `departmentId` بعد migration |
| `npm run storage:cleanup-photos` | تنظيف صور الحضور القديمة |
| `npm run env:validate` | التحقق من `.env` |

## طريقة العمل

1. يُسجَّل لكل موظف **صورة مرجعية** من لوحة التحكم.
2. في الكشك يختار الموظف الشفت واسمه ثم يلتقط صورة للحضور/الانصراف.
3. يصل الطلب إلى صفحة المراجعات؛ يؤكد أو يرفض موظف الاستعلامات بعد مقارنة الصورة بالمرجعية.

## المتغيرات البيئية

انظر `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (pooler) · `DIRECT_URL` (migrations)
- `KIOSK_API_KEY` — حماية API الكشك
- `CRON_SECRET` — لحماية مهمة تنظيف الصور
- `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` — اختياري؛ rate limit موزع في الإنتاج

## الأدوار

| الحساب | الدور |
|--------|-------|
| `hr@company.com` | مدير — صلاحيات كاملة |
| `inquiry@company.com` | استعلامات — عرض + إضافة موظف + مراجعة الصور |

إعداد: `npm run auth:setup-production`

## المسارات الرئيسية

| المسار | الوصف |
|--------|--------|
| `/login` | تسجيل الدخول |
| `/dashboard` | لوحة التحكم |
| `/dashboard/reviews` | مراجعة صور الحضور/الانصراف |
| `/kiosk/setup` | إعداد التابلت |
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

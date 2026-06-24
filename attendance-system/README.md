# نظام الحضور والانصراف

نظام عربي (RTL) لتسجيل حضور وانصراف الموظفين بالتعرف على الوجه، مع لوحة تحكم وتقارير.

## التقنيات

- **Next.js 14** · React 18 · TypeScript
- **Supabase** — مصادقة + PostgreSQL
- **Prisma 7** — ORM
- **@vladmandic/human** — كشف وجه + بصمة **1024-d** (محرك واحد في المتصفح)
- **Vercel** — نشر الإنتاج

## البدء السريع

```bash
# من جذر المستودع
npm run dev

# أو من مجلد التطبيق
cd attendance-system
npm install
cp .env.example .env.local   # ثم املأ القيم
npm run models:download      # نماذج Human محلياً (~9 MB)
npm run dev
```

التطبيق: [http://localhost:3000](http://localhost:3000)

## أوامر مفيدة

| الأمر | الوظيفة |
|-------|---------|
| `npm run build` | بناء إنتاج |
| `npm run models:download` | نسخ نماذج Human إلى `public/models/human/` |
| `npm run test:face-v2` | اختبار بصمة 1024-d + API الكiosk |
| `npm run db:seed` | بيانات تجريبية |
| `npm run db:clear` | مسح كل البيانات |
| `npm run auth:setup-production` | حسابات الإدارة |
| `npm run db:backfill-departments` | ربط `departmentId` بعد migration |
| `npm run db:backfill-face-versions` | تعيين إصدار البصمة (v1/v2) |
| `npm run env:validate` | التحقق من `.env` |

## التعرف على الوجه (Human 1024-d)

| البند | التفاصيل |
|-------|----------|
| المحرك | `@vladmandic/human` — `src/lib/face-engine/human-engine.ts` |
| البصمة | 1024 عنصر (`faceDescriptorVersion = 2`) |
| النماذج | `blazeface` · `facemesh` · `faceres` في `public/models/human/` |
| التحميل | محلي من `/models/human/` — **لا يحتاج إنترنت على التابلت بعد `models:download`** |
| البصمات القديمة | 128-d (v1) — يجب إعادة تسجيل الوجه من لوحة التحكم أو الكiosk |

## المتغيرات البيئية

انظر `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL` (pooler) · `DIRECT_URL` (migrations)
- `KIOSK_API_KEY` — حماية API الكشك (يُستخدم في الخادم فقط؛ المتصفح يحصل على جلسة HttpOnly عبر `/kiosk`)
- `UPSTASH_REDIS_REST_URL` · `UPSTASH_REDIS_REST_TOKEN` — اختياري؛ rate limit موزع في الإنتاج

## الأدوار

| الحساب | الدور |
|--------|-------|
| `hr@company.com` | مدير — صلاحيات كاملة |
| `inquiry@company.com` | استعلامات — عرض + إضافة موظف |

إعداد: `npm run auth:setup-production`

## المسارات الرئيسية

| المسار | الوصف |
|--------|--------|
| `/login` | تسجيل الدخول |
| `/dashboard` | لوحة التحكم |
| `/kiosk/setup` | إعداد التابلت (شاشة كاملة) |
| `/kiosk/checkin` | حضور بالوجه |
| `/kiosk/checkout` | انصراف بالوجه |

## التوثيق التقني

مرجع شامل للمطورين: [`../تقارير/`](../تقارير/)

- [مرجع النظام](../تقارير/00-مرجع-النظام-الشامل.md)
- [التعرف على الوجه](../تقارير/الخصائص/تطويرات/02-التعرف-على-الوجه.md)
- [دليل إضافة ميزة](../تقارير/الخصائص/الهيكلية-الصحيحة/دليل-إضافة-ميزة-جديدة.md)

## هيكل المشروع

```
attendance-system/
├── src/app/              # صفحات + API
├── src/lib/face-engine/  # Human 1024-d
├── prisma/               # مخطط قاعدة البيانات
├── public/models/human/  # نماذج Human (بعد models:download)
└── scripts/              # صيانة وإعداد
```

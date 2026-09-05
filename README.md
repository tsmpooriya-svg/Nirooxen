# آریا صنعت — پلتفرم تجهیزات صنعتی و آبرسانی

سایت فروشگاهی-کاتالوگی فارسی (RTL) با پنل مدیریت کامل، ساخته‌شده با **Next.js 16 (App Router)**،
**TypeScript**، **Tailwind CSS v4**، **Drizzle ORM** و **PostgreSQL**.

---

## راه‌اندازی سریع

```bash
npm install                 # نصب وابستگی‌ها
cp .env.example .env        # سپس DATABASE_URL و AUTH_SECRET را پر کنید
npm run db:migrate          # ساخت جداول
npm run db:seed             # داده نمونه (فقط محیط توسعه)
npm run dev                 # http://localhost:3000
```

**ورود به پنل:** `/admin/login` — ایمیل `admin@example.com` / رمز `Admin@12345`
(پس از اولین ورود حتماً از بخش «کاربران پنل» تغییرش دهید.)

### متغیرهای محیطی

فایل نمونه در `.env.example` است؛ `cp .env.example .env` و مقادیر را پر کنید.

| متغیر | الزامی | توضیح |
|---|---|---|
| `DATABASE_URL` | بله | رشته اتصال PostgreSQL |
| `NEXT_PUBLIC_SITE_URL` | بله در production | آدرس کامل سایت (مبنای canonical، Open Graph و sitemap). اگر در production تعریف نشود، build با خطا متوقف می‌شود تا آدرس localhost منتشر نشود. در محیط توسعه به `http://localhost:3000` برمی‌گردد. |
| `DATABASE_SSL` | خیر | اگر پایگاه داده SSL می‌خواهد، `true` |
| `DATABASE_POOL_MAX` | خیر | بیشینه اتصال‌های pool — پیش‌فرض `10` |

---

## شخصی‌سازی

| می‌خواهید چه چیزی را عوض کنید؟ | کجا |
|---|---|
| نام شرکت، تلفن، آدرس، شبکه‌های اجتماعی، منو | `src/config/site.ts` |
| رنگ‌ها، فونت، فاصله، سایه، انیمیشن | `src/app/globals.css` (بخش توکن‌ها) |
| برچسب فارسی وضعیت‌ها و ماتریس دسترسی | `src/lib/constants.ts` |
| محتوای محصولات، اخبار، پروژه‌ها | پنل مدیریت |

> مقادیر «تنظیمات» در پنل، بر `site.ts` اولویت دارند؛ `site.ts` مقادیر پیش‌فرض است.

---

## ساختار پروژه

```
src/
  app/
    (site)/         صفحات عمومی — لندینگ، محصولات، برندها، اخبار، تماس…
    (admin)/admin/  پنل مدیریت — login خارج از محافظ، بقیه داخل (panel)
    api/            جستجوی سریع، خبرنامه
  components/
    ui/             کتابخانه کامپوننت پایه (دکمه، فرم، مودال، جدول، توست…)
    site/           کامپوننت‌های سایت عمومی
    admin/          کامپوننت‌های پنل
    motion/         Reveal و Counter (انیمیشن اسکرول با IntersectionObserver)
  modules/          مرز دامنه — هر ماژول queries.ts و actions.ts خودش را دارد
    catalog/  orders/  cart/  content/  admin/  auth/
  db/               schema.ts (Drizzle) + seed.ts
  lib/              auth، validation (Zod)، utils، seo، rate-limit، activity
```

**قاعده معماری:** صفحات هرگز مستقیم با `db` کار نمی‌کنند؛ همیشه از `modules/*/queries.ts`
یا `actions.ts` عبور می‌کنند. این مرز باعث می‌شود تغییر منبع داده، UI را نشکند.

---

## مدل فروش

- هر محصول یکی از سه حالت قیمت را دارد: **نمایش قیمت** / **استعلام قیمت** / **تماس بگیرید**
  (فیلد `priceMode`).
- دکمه محصول بر همین اساس «ثبت سفارش» یا «استعلام قیمت» می‌شود.
- ثبت فرم ⟵ رکورد در جدول `orders` ⟵ نمایش فوری در پنل مدیریت با گردش‌کار ۸ مرحله‌ای.
- **قیمت‌گذاری همیشه سمت سرور از پایگاه داده خوانده می‌شود**، نه از ورودی کاربر.

### مسیر افزودن پرداخت آنلاین (فاز بعدی)

زیرساخت از ابتدا آماده است و نیازی به بازنویسی ندارد:

1. جدول `payments` ساخته شده و منتظر اتصال درگاه است.
2. `orders` از ابتدا `paymentStatus` / `paymentMethod` / `paidAt` دارد.
3. `orderType` بین `QUOTE` و `ORDER` تمایز می‌گذارد.
4. سبد استعلام (`src/modules/cart/store.ts`) همان ساختار سبد خرید را دارد؛
   کافی است در checkout مقدار `type` را به `ORDER` تغییر دهید و پس از `createOrder`
   کاربر را به درگاه هدایت کنید.

---

## دستورها

| دستور | کار |
|---|---|
| `npm run dev` | اجرای محیط توسعه |
| `npm run build` / `npm start` | بیلد و اجرای production |
| `npm run typecheck` | بررسی تایپ‌ها |
| `npm run db:generate` | ساخت فایل migration از تغییرات schema |
| `npm run db:migrate` | اعمال migration ها |
| `npm run db:studio` | مرورگر گرافیکی پایگاه داده |
| `npm run db:seed` | داده نمونه |
| `npm run placeholders` | بازتولید تصاویر فنی جانشین |

---

## سئو

- `metadata` اختصاصی برای هر صفحه + `canonical`
- `sitemap.xml` و `robots.txt` پویا (`src/app/sitemap.ts` و `robots.ts`)
- داده ساختاریافته JSON-LD: Organization، WebSite، BreadcrumbList، Product، Article
- تصاویر با `next/image`، فونت‌ها self-host با `font-display: swap`
- صفحات محصول و مقاله به‌صورت ایستا (SSG) ساخته و دوره‌ای بازتولید می‌شوند

## دسترس‌پذیری

- کنتراست متن حداقل ۴.۵:۱ در هر دو تم
- `:focus-visible` روی همه عناصر تعاملی
- `prefers-reduced-motion` در سراسر سیستم حرکتی رعایت شده
- لینک «رفتن به محتوای اصلی»، برچسب ARIA روی همه دکمه‌های آیکونی
- امکان زوم تا ۵ برابر (محدود نشده)

## امنیت

- رمز عبور با bcrypt (۱۲ round)
- نشست: توکن مبهم + هش SHA-256 در پایگاه داده ⟵ امکان ابطال فوری
- کوکی `httpOnly` + `sameSite=lax` + `secure` در production
- محدودسازی نرخ روی ورود، ثبت سفارش، فرم تماس و خبرنامه
- honeypot ضد ربات در فرم‌های عمومی
- `requirePermission` در **هر** Server Action (نه فقط در layout)
- پنل مدیریت با `noindex` و مسدود در `robots.txt`

---

## استقرار

روی هر هاست Node.js اجرا می‌شود:

```bash
npm ci
npm run build
npm run db:migrate
npm start          # پیش‌فرض روی پورت 3000
```

پشت Nginx یا هر reverse proxy، هدر `X-Forwarded-For` را عبور دهید تا ثبت IP درست کار کند.

import { defineConfig, devices } from "@playwright/test";

/**
 * =============================================================================
 *  پیکربندی آزمون‌های دود
 * =============================================================================
 *  این آزمون‌ها جای بازبینی دستی پیش از انتشار را می‌گیرند: مسیرهایی که اگر
 *  بشکنند سایت عملاً از کار افتاده — دیدن محصول، ثبت استعلام، ورود به پنل.
 *
 *  عمداً کم‌اند. مجموعه‌ای که سه دقیقه طول بکشد کسی اجرایش نمی‌کند، و آزمونی
 *  که اجرا نشود بدتر از نبودن است چون اطمینان کاذب می‌دهد.
 *
 *  اجرا:  npm run test:e2e
 * =============================================================================
 */
/**
 * مرورگر آماده، اگر محیط یکی داشته باشد.
 *
 * روی ماشین توسعه‌دهنده لازم نیست: یک بار `npx playwright install` و Playwright
 * خودش پیدایش می‌کند. این برای محیط‌هایی است که مرورگر از قبل نصب شده و نسخه‌اش
 * با آنچه Playwright انتظار دارد یکی نیست.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/guard.ts",
  // ثبت استعلام واقعاً ردیف می‌نویسد؛ موازی‌سازی فقط شمارش‌ها را درهم می‌کند
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? "github" : "list",
  // در CI یک تلاش دوباره: شکست واقعی دو بار تکرار می‌شود، نوسان شبکه نه
  retries: process.env.CI ? 1 : 0,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fa-IR",
    /*
      نشانی IP یکتا برای هر اجرا.

      سقف‌های نرخ بر پایهٔ IP اند و درست هم همین است: فرم تماس سه پیام در ده
      دقیقه می‌پذیرد. ولی همین یعنی مجموعهٔ دود که بار دوم اجرا شود، آزمونِ فرم
      تماس شکست می‌خورد — نه چون چیزی خراب شده، که چون اجرای قبلی سهمیه را
      برداشته. مجموعه‌ای که دو بار پشت سر هم سبز نشود، همان «اطمینان کاذب»ی
      است که بالای همین فایل دربارهٔ‌اش نوشته شده.

      در production این سربرگ را nginx با $remote_addr بازنویسی می‌کند
      (proxy_set_header X-Real-IP)، پس فقط روی سرور توسعه اثر دارد و هیچ
      محافظتی را شل نمی‌کند.
    */
    extraHTTPHeaders: { "x-real-ip": `10.0.0.${(Date.now() % 250) + 1}` },
    /*
      بدون این، کامپوننت‌های Reveal منتظر IntersectionObserver می‌مانند و
      محتوایی که آزمون دنبالش است هرگز نمایان نمی‌شود.
    */
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /*
          پیش‌تنظیم دستگاه، channel را روی chromium می‌گذارد و آن به «headless
          shell» می‌رسد — بستهٔ جدایی که ممکن است نصب نباشد. مرورگر کامل هم
          همین کار را می‌کند و یک وابستگی کمتر است.
        */
        channel: undefined,
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
  ],

  /*
    اگر سروری بالا باشد همان استفاده می‌شود. روی CI بالا نمی‌آورد چون آنجا
    build شده اجرا می‌شود و dev server رفتار دیگری دارد.
  */
  webServer: {
    /*
      محافظ اینجا هم می‌آید، نه فقط در globalSetup: Playwright سرور را پیش از
      globalSetup بالا می‌آورد، پس بدون این، یک اجرای اشتباه اول برنامه را به
      پایگاه دادهٔ production وصل می‌کرد و تازه بعد متوقف می‌شد. این نسخه جلوی
      بالا آمدن را می‌گیرد؛ آن یکی مسیرِ «سرور از قبل بالا بود» را می‌پوشاند.
    */
    command: "node scripts/guard-destructive.mjs 'آزمون‌های دود' && npm run dev",
    url: "http://localhost:3000/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

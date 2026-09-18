import { expect, test, type Page } from "@playwright/test";

/**
 * =============================================================================
 *  آزمون‌های دود
 * =============================================================================
 *  فهرست کوتاه است و عمداً: فقط مسیرهایی که اگر بشکنند سایت از کار افتاده.
 *  هر آزمون یک ادعای تجاری را می‌سنجد، نه جزئیات ظاهری — رنگ و فاصله عوض
 *  می‌شوند و نباید آزمون را بشکنند؛ «مشتری نتوانست استعلام ثبت کند» باید بشکند.
 * =============================================================================
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Admin@12345";

/**
 * لایهٔ ورودی سایت یک بار در هر نشست نمایش داده می‌شود و روی محتوا می‌نشیند.
 * همان کلیدی که خودش می‌گذارد، از پیش گذاشته می‌شود تا رد شود.
 */
async function skipIntro(page: Page) {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem("nirooxen-loader-seen", "1");
    } catch {
      /* در حالت خصوصی شکست می‌خورد؛ آزمون به آن وابسته نیست */
    }
  });
}

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

test("سرویس و پایگاه داده سالم‌اند", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ status: "ok", database: "ok" });
});

test("صفحهٔ اصلی با دسته‌بندی‌ها بالا می‌آید", async ({ page }) => {
  await page.goto("/");
  /*
    نام سایت از تنظیمات می‌آید و مدیر می‌تواند عوضش کند، پس آزمون نباید روی
    یک نام خاص قفل شود؛ خالی بودن عنوان است که خبر از خرابی می‌دهد.
  */
  await expect(page).toHaveTitle(/\S/);
  // فهرست دسته‌ها از پایگاه داده می‌آید؛ خالی بودنش یعنی کوئری شکسته
  await expect(page.getByRole("link", { name: /محصولات/ }).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(/قلم کالا|محصول/);
});

test("از فهرست محصولات می‌شود به صفحهٔ یک محصول رفت", async ({ page }) => {
  await page.goto("/products");
  const firstProduct = page.locator('main a[href^="/products/"]').first();
  await expect(firstProduct).toBeVisible();

  const href = await firstProduct.getAttribute("href");
  await firstProduct.click();
  await page.waitForURL(`**${href}`);

  // هر صفحهٔ محصول باید یک عنوان و یک راه ثبت درخواست داشته باشد
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: /استعلام|سفارش|افزودن/ }).first()).toBeVisible();
});

test("جست‌وجو نتیجه برمی‌گرداند", async ({ page, request }) => {
  /*
    مستقیم از API پرسیده می‌شود، نه از دیالوگ: آنچه باید سالم بماند خودِ
    جست‌وجوست، و دیالوگ تنها یکی از دو راهِ رسیدن به آن است.
  */
  const response = await request.get("/api/search?q=پمپ");
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { items?: unknown[] };
  // «پمپ» در هر کاتالوگ آبرسانی نتیجه دارد؛ صفر بودنش یعنی جست‌وجو شکسته
  expect(body.items?.length ?? 0).toBeGreaterThan(0);

  await page.goto("/products?q=پمپ");
  await expect(page.locator("main")).not.toContainText("خطایی رخ داد");
});

test("مشتری می‌تواند از صفحهٔ محصول استعلام ثبت کند", async ({ page }) => {
  await page.goto("/products");
  await page.locator('main a[href^="/products/"]').first().click();
  await page.waitForURL(/\/products\/.+/);

  /*
    فرم در یک مودال است و تا دکمهٔ خرید زده نشود در DOM دیده می‌شود ولی نمایان
    نیست. بدون این کلیک، آزمون روی فیلدی می‌نشست که کاربر هم نمی‌بیند.
  */
  await page.getByRole("button", { name: /^(استعلام قیمت|ثبت سفارش)$/ }).first().click();
  /*
    با نام مشخص می‌شود، نه فقط با نقش: سبد استعلام هم role=dialog دارد و همیشه
    در DOM هست (بیرون از کادر دید)، پس انتخاب بر اساس نقشِ تنها مبهم است.
  */
  const modal = page.getByRole("dialog", { name: /ثبت سفارش|استعلام قیمت/ });
  await expect(modal).toBeVisible();

  await modal.getByLabel(/نام و نام خانوادگی/).fill("آزمون دود");
  await modal.getByLabel(/شماره تماس/).fill("09120000000");
  await modal.getByRole("button", { name: /ثبت|ارسال/ }).first().click();

  // شمارهٔ درخواست یعنی تراکنش تا انتها رفته، نه فقط فرم اعتبارسنجی شده
  await expect(page.getByText("درخواست شما ثبت شد")).toBeVisible({ timeout: 20_000 });
  await expect(modal).toContainText(/AR[QO]-/);
});

test("فرم تماس پیام را می‌پذیرد", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel(/نام و نام خانوادگی/).fill("آزمون دود");
  await page.getByLabel(/شماره تماس/).fill("09120000001");
  await page.getByLabel(/متن پیام/).fill("این پیام از آزمون خودکار است.");
  await page.getByRole("button", { name: /ارسال پیام|ارسال/ }).first().click();

  // فوتر هم فرم خبرنامه دارد، پس دامنه به main محدود می‌شود
  await expect(page.locator("main")).toContainText(/ثبت شد|دریافت شد/, { timeout: 20_000 });
});

/**
 * یک تلاش ورود، و آنچه صفحه در جواب گفت.
 *
 * محدودکنندهٔ نرخ **هر** تلاش را می‌شمارد، نه فقط ناموفق‌ها — هشت بار در پانزده
 * دقیقه از هر IP. یعنی چند اجرای پشت‌سرهم روی یک سرور در حال اجرا، خودشان را
 * قفل می‌کنند. آزمون باید این را از «ورود خراب است» تشخیص بدهد، وگرنه قرمزی
 * می‌دهد که ربطی به کد ندارد و اعتماد به کل مجموعه را می‌برد.
 */
async function login(page: Page, password: string): Promise<"ok" | "rejected" | "throttled"> {
  await page.goto("/admin/login");
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: /ورود/ }).click();

  const throttled = page.getByText(/تلاش‌های ناموفق زیاد/);
  const rejected = page.getByText(/نادرست|معتبر نیست|اشتباه/);

  const outcome = await Promise.race([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 15_000 }).then(() => "ok" as const),
    throttled.waitFor({ timeout: 15_000 }).then(() => "throttled" as const),
    rejected.first().waitFor({ timeout: 15_000 }).then(() => "rejected" as const),
  ]);
  return outcome;
}

test("رمز اشتباه پذیرفته نمی‌شود", async ({ page }) => {
  const outcome = await login(page, "definitely-not-the-password");
  test.skip(outcome === "throttled", "محدودکنندهٔ نرخ ورود فعال است — سرور را تازه کنید");
  expect(outcome).toBe("rejected");
});

test("رمز درست به پنل می‌رساند", async ({ page }) => {
  const outcome = await login(page, ADMIN_PASSWORD);
  test.skip(outcome === "throttled", "محدودکنندهٔ نرخ ورود فعال است — سرور را تازه کنید");
  expect(outcome).toBe("ok");
  await expect(page.getByRole("heading", { name: /داشبورد/ })).toBeVisible();
});

test("پنل بدون ورود در دسترس نیست", async ({ page }) => {
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("حساب کاربری هم بدون ورود بسته است", async ({ page }) => {
  // مجوز بخشی ندارد، ولی نباید یعنی «برای همه باز است»
  await page.goto("/admin/profile");
  await expect(page).toHaveURL(/\/admin\/login/);
});

test("هر کاربری به حساب خودش دسترسی دارد", async ({ page }) => {
  const outcome = await login(page, ADMIN_PASSWORD);
  test.skip(outcome === "throttled", "محدودکنندهٔ نرخ ورود فعال است — سرور را تازه کنید");
  expect(outcome).toBe("ok");

  await page.goto("/admin/profile");
  await expect(page.getByRole("heading", { name: /حساب کاربری/ })).toBeVisible();
  // سه چیزی که صفحه برایشان هست
  await expect(page.locator("main")).toContainText(ADMIN_EMAIL);
  await expect(page.getByRole("button", { name: /تغییر رمز عبور/ })).toBeVisible();
  await expect(page.locator("main")).toContainText("همین دستگاه");
});

test("نشانی ناموجود صفحهٔ ۴۰۴ می‌دهد، نه خطای سرور", async ({ page }) => {
  const response = await page.goto("/products/this-slug-does-not-exist-404");
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toContainText(/پیدا نشد|یافت نشد|۴۰۴|404/);
});

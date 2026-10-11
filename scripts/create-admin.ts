/**
 * =============================================================================
 *  ساخت نخستین حساب مدیر
 * =============================================================================
 *  اجرا:  npm run bootstrap:admin
 *
 *  برای یک بار اجرا روی پایگاه داده تازه‌مهاجرت‌یافته production ساخته شده است.
 *  برخلاف `db:seed` هیچ جدولی را پاک نمی‌کند و هیچ داده نمونه‌ای (محصول، برند،
 *  مشتری، سفارش، مقاله) نمی‌سازد؛ تنها یک ردیف در جدول users درج می‌کند.
 *
 *  اگر از قبل کاربری وجود داشته باشد، اسکریپت با کد خروج غیرصفر متوقف می‌شود و
 *  هیچ ردیفی را تغییر نمی‌دهد. حساب موجود هرگز بازنویسی نمی‌شود.
 *
 *  ورودی اعتبارنامه‌ها:
 *    ۱. پرسش تعاملی (رمز عبور روی صفحه نمایش داده نمی‌شود)
 *    ۲. یا متغیرهای محیطی ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD
 *
 *  رمز عبور را به‌صورت آرگومان خط فرمان ندهید؛ در تاریخچه شل باقی می‌ماند.
 * =============================================================================
 */
import "dotenv/config";

import { createInterface } from "node:readline";

import bcrypt from "bcryptjs";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "../src/db/schema";

const { users } = schema;

/** همان تعداد round که src/lib/auth.ts استفاده می‌کند */
const BCRYPT_ROUNDS = 12;

/** همان قواعدی که userFormSchema در src/lib/validation.ts اعمال می‌کند */
const RULES = {
  name: { min: 3, max: 120 },
  email: { max: 190, pattern: /^[^@\s]+@[^@\s]+\.[^@\s]+$/ },
  password: { min: 8, max: 128 },
};

function ask(question: string, hidden = false): Promise<string> {
  if (!process.stdin.isTTY) {
    fail(
      "ورودی تعاملی در دسترس نیست. ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD را تعریف کنید " +
        "یا اسکریپت را در یک ترمینال واقعی اجرا کنید.",
    );
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });

  return new Promise((resolve) => {
    if (!hidden) {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
      return;
    }

    // پرسش نوشته می‌شود، سپس خروجی خفه می‌شود تا کلیدهای رمز روی ترمینال نیفتند
    const original = process.stdout.write.bind(process.stdout);
    let muted = false;
    process.stdout.write = ((chunk: string, ...rest: unknown[]) =>
      muted ? true : original(chunk, ...(rest as []))) as typeof process.stdout.write;

    rl.question(question, (answer) => {
      muted = false;
      process.stdout.write = original;
      original("\n");
      rl.close();
      resolve(answer);
    });

    muted = true;
  });
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

function validate(name: string, email: string, password: string): void {
  if (name.length < RULES.name.min || name.length > RULES.name.max) {
    fail(`نام باید بین ${RULES.name.min} تا ${RULES.name.max} کاراکتر باشد.`);
  }
  if (!RULES.email.pattern.test(email) || email.length > RULES.email.max) {
    fail("ایمیل معتبر نیست.");
  }
  if (password.length < RULES.password.min || password.length > RULES.password.max) {
    fail(`رمز عبور باید بین ${RULES.password.min} تا ${RULES.password.max} کاراکتر باشد.`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    fail("متغیر محیطی DATABASE_URL تعریف نشده است.");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema, casing: "snake_case" });

  try {
    const [existing] = await db.select({ total: count() }).from(users);

    if ((existing?.total ?? 0) > 0) {
      console.error(
        `✖ پایگاه داده از قبل ${existing!.total} کاربر دارد؛ این اسکریپت فقط برای ساخت نخستین حساب است.\n` +
          "  هیچ ردیفی تغییر نکرد. کاربر تازه را از «پنل مدیریت › کاربران پنل» بسازید.",
      );
      process.exitCode = 1;
      return;
    }

    // متغیر تعریف‌شده ولی خالی یعنی پیکربندی اشتباه، نه «بپرس» — رد می‌شود
    for (const key of ["ADMIN_NAME", "ADMIN_EMAIL", "ADMIN_PASSWORD"] as const) {
      if (process.env[key] !== undefined && process.env[key]!.trim() === "") {
        fail(`متغیر ${key} تعریف شده ولی خالی است.`);
      }
    }

    const fromEnv = Boolean(process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD);

    const name = (process.env.ADMIN_NAME ?? (await ask("نام مدیر: "))).trim();
    const email = (process.env.ADMIN_EMAIL ?? (await ask("ایمیل: "))).trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD ?? (await ask("رمز عبور: ", true));
    const confirm = fromEnv ? password : await ask("تکرار رمز عبور: ", true);

    if (password !== confirm) fail("رمز عبور و تکرار آن یکسان نیستند.");

    validate(name, email, password);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [created] = await db
      .insert(users)
      .values({ name, email, passwordHash, role: "OWNER", isActive: true })
      .returning({ id: users.id, email: users.email, role: users.role });

    console.log(`\n✔ حساب مدیر ساخته شد — ${created!.email} (نقش ${created!.role})`);
    console.log("  اکنون می‌توانید از /admin/login وارد شوید.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("✖ ساخت حساب مدیر ناموفق بود:", error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * =============================================================================
 *  محافظ اسکریپت‌های مخرب
 * =============================================================================
 *  خطر واقعی این نیست که کسی عمداً db:seed را روی production بزند؛ این است که
 *  یک فایل .env با DATABASE_URL محیط production در دسترس باشد و اسکریپت
 *  توسعه، بی‌سروصدا همان را هدف بگیرد. بررسی NODE_ENV به‌تنهایی جلوی این را
 *  نمی‌گیرد، چون در شل توسعه‌دهنده معمولاً اصلاً تنظیم نشده است.
 *
 *  قاعده: هدف باید یا صریحاً محلی باشد، یا اپراتور صریحاً تأیید کند.
 *
 *  تأییدِ صریح با ALLOW_DESTRUCTIVE_DB_SCRIPTS=1 داده می‌شود و هر دو بررسی —
 *  NODE_ENV و میزبان — را پوشش می‌دهد. پیش‌تر فقط بررسی میزبان را کنار
 *  می‌گذاشت، و نتیجه‌اش این بود که روی سرور واقعی هیچ راهی برای اجرای آگاهانهٔ
 *  اسکریپت‌های واردکنندهٔ کاتالوگ نمی‌ماند: آنجا NODE_ENV همیشه production است
 *  و DATABASE_URL هم به 127.0.0.1 اشاره می‌کند، پس بررسی میزبان اصلاً فعال
 *  نمی‌شد تا override به کار بیاید. در هر دو حالت هشدار چاپ می‌شود، پس اجرای
 *  ناخواسته همچنان در خروجی دیده می‌شود.
 *
 *  استفاده به‌صورت کتابخانه:
 *      import { assertSafeTarget } from "./guard-destructive.mjs";
 *      assertSafeTarget("replace-watertank-images");
 *
 *  استفاده در package.json (زنجیره با &&):
 *      node scripts/guard-destructive.mjs db:seed && tsx src/db/seed.ts
 * =============================================================================
 */
import "dotenv/config";

import { pathToFileURL } from "node:url";

/** میزبان‌هایی که به‌طور قطع محیط production نیستند */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]", "0.0.0.0", ""]);

/** متغیری که اپراتور برای اجرای آگاهانه روی میزبان غیرمحلی تنظیم می‌کند */
const OVERRIDE = "ALLOW_DESTRUCTIVE_DB_SCRIPTS";

function hostOf(connectionString) {
  try {
    return new URL(connectionString).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * اگر هدف مشکوک به production باشد، پیام می‌دهد و پروسه را با کد ۱ می‌بندد.
 * برمی‌گردد فقط وقتی اجرا امن تشخیص داده شود.
 */
export function assertSafeTarget(label) {
  const reject = (reason, hint) => {
    console.error(`\n✖ اجرای «${label}» متوقف شد — ${reason}`);
    console.error(`  این اسکریپت داده‌ها را تغییر می‌دهد و برای محیط توسعه/تست ساخته شده است.`);
    if (hint) console.error(`  ${hint}`);
    console.error("");
    process.exit(1);
  };

  const confirmed = process.env[OVERRIDE] === "1";

  if (process.env.NODE_ENV === "production") {
    if (!confirmed) {
      reject(
        "NODE_ENV برابر production است.",
        `اگر این اجرا عمدی است: ${OVERRIDE}=1 node scripts/…`,
      );
    }
    console.warn(`⚠ «${label}» با NODE_ENV=production اجرا می‌شود (${OVERRIDE}=1).`);
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    reject("DATABASE_URL تعریف نشده است.", "فایل .env را از روی .env.example بسازید.");
  }

  const host = hostOf(connectionString);
  if (host === null) {
    reject("DATABASE_URL قابل تجزیه نیست؛ نمی‌توان محلی بودن هدف را تأیید کرد.");
  }

  if (!LOCAL_HOSTS.has(host)) {
    if (confirmed) {
      console.warn(`⚠ «${label}» روی میزبان غیرمحلی «${host}» اجرا می‌شود (${OVERRIDE}=1).`);
      return;
    }
    reject(
      `پایگاه داده روی میزبان غیرمحلی «${host}» است.`,
      `اگر مطمئنید این محیط production نیست: ${OVERRIDE}=1 npm run …`,
    );
  }
}

// اجرای مستقیم: نقش دروازه در زنجیرهٔ package.json
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assertSafeTarget(process.argv[2] ?? "اسکریپت پایگاه داده");
}

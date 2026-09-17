/**
 * =============================================================================
 *  پیگیری رسیدن پیامک
 * =============================================================================
 *  سرویس پیامک دو خبر جدا می‌دهد: «پذیرفتم» در لحظهٔ ارسال، و «رساندم» بعداً.
 *  اولی را npm run sms:test نشان می‌دهد؛ این دومی را می‌پرسد.
 *
 *  این تفاوت اهمیت عملی دارد: خط تبلیغاتی به شماره‌ای که پیامک تبلیغاتی را نزد
 *  اپراتور مسدود کرده هرگز تحویل نمی‌شود، در حالی که پذیرشش کاملاً موفق گزارش
 *  می‌شود. بدون این گزارش، آن حالت از «همه چیز درست است» قابل تشخیص نیست.
 *
 *  اجرا:  npm run sms:report -- <packId>
 * =============================================================================
 */
import "dotenv/config";

import { deliveryReport, smsConfigured } from "../src/lib/notify";

async function main() {
  const packId = process.argv[2]?.trim();

  if (!smsConfigured()) {
    console.error("\n✖ پیامک تنظیم نشده است؛ بدون کلید API نمی‌توان گزارش گرفت.\n");
    process.exit(1);
  }
  if (!packId) {
    console.error(
      "\n✖ شناسهٔ بسته را بدهید:  npm run sms:report -- <packId>\n" +
        "  شناسه را npm run sms:test در پاسخ خام چاپ می‌کند.\n",
    );
    process.exit(1);
  }

  const { status, body } = await deliveryReport(packId);
  console.log(`\n── گزارش بستهٔ ${packId} (HTTP ${status}) ──`);

  let rows: Row[] | null = null;
  try {
    const parsed = JSON.parse(body) as { data?: unknown };
    console.log(JSON.stringify(parsed, null, 2));
    rows = Array.isArray(parsed.data) ? (parsed.data as Row[]) : null;
  } catch {
    console.log(body);
  }

  if (!rows?.length) {
    console.log("\n  ردیفی برای این بسته برنگشت.\n");
    return;
  }

  /*
    پیش‌تر اینجا نوشته شده بود «deliveryState را ببینید» — و در نخستین اجرای
    واقعی آن فیلد null بود. خالی بودنش معنای خودش را دارد و نباید با «نرسید»
    یکی گرفته شود، پس همان‌جا ترجمه‌اش می‌کنیم.
  */
  console.log("\n── خلاصه ──");
  for (const row of rows) {
    console.log(`  ${row.mobile ?? "?"} → ${describe(row.deliveryState)}`);
  }

  if (rows.every((r) => r.deliveryState === null || r.deliveryState === undefined)) {
    console.log(
      "\n  هیچ گزارش تحویلی نیامده. این هنوز شکست نیست — گزارش اپراتور معمولاً\n" +
        "  چند دقیقه طول می‌کشد. چند دقیقه بعد همین دستور را دوباره بزنید.\n" +
        "  اگر بعد از نیم ساعت هم null ماند، نوع خط را در پنل sms.ir ببینید:\n" +
        "  خط تبلیغاتی به شماره‌ای که پیامک تبلیغاتی را مسدود کرده تحویل نمی‌شود.\n",
    );
  }
}

type Row = { mobile?: number | string; deliveryState?: number | null };

/**
 * وضعیت تحویل به زبان آدمیزاد.
 *
 * فقط دو حالتی که معنایشان قطعی است نام‌گذاری شده‌اند؛ بقیه با عدد خودشان
 * چاپ می‌شوند تا اگر سرویس کدی افزود، اینجا حدسِ غلط ننشیند.
 */
function describe(state?: number | null): string {
  if (state === null || state === undefined) return "هنوز گزارشی نیامده";
  if (state === 1) return "رسید";
  if (state === 2) return "نرسید";
  return `وضعیت ${state}`;
}

main();

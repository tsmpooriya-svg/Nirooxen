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
 *  اجرا:  npm run sms:report -- <شناسه>
 * =============================================================================
 */
import "dotenv/config";

import { deliveryReport, smsConfigured } from "../src/lib/notify";

async function main() {
  const id = process.argv[2]?.trim();

  if (!smsConfigured()) {
    console.error("\n✖ پیامک تنظیم نشده است؛ بدون کلید API نمی‌توان گزارش گرفت.\n");
    process.exit(1);
  }
  if (!id) {
    console.error(
      "\n✖ شناسه را بدهید:  npm run sms:report -- <شناسه>\n" +
        "  شناسه را npm run sms:test در پاسخ خام چاپ می‌کند: عدد برای یک پیام\n" +
        "  (مسیر قالب)، و شناسهٔ بسته برای ارسال انبوه.\n",
    );
    process.exit(1);
  }

  const { status, body } = await deliveryReport(id);
  console.log(`\n── گزارش ${id} (HTTP ${status}) ──`);

  let rows: Row[] = [];
  try {
    const parsed = JSON.parse(body) as { data?: unknown };
    console.log(JSON.stringify(parsed, null, 2));
    /*
      بستهٔ انبوه آرایه می‌دهد و تک‌پیام یک شیء. پیش‌تر فقط آرایه خوانده می‌شد و
      نتیجه‌اش این بود که برای تک‌پیام می‌گفت «ردیفی برنگشت» در حالی که ردیف
      جلوی چشمش بود.
    */
    if (Array.isArray(parsed.data)) rows = parsed.data as Row[];
    else if (parsed.data && typeof parsed.data === "object") rows = [parsed.data as Row];
  } catch {
    console.log(body);
  }

  if (!rows.length) {
    console.log("\n  ردیفی برای این شناسه برنگشت.\n");
    return;
  }

  /*
    سرویس گاهی به‌جای دادهٔ واقعی یک پاسخ نمونه می‌دهد — با متن تبلیغاتی خودش و
    تاریخی چند سال پیش. چون شناسه را عیناً بازتاب می‌دهد، از روی شناسه نمی‌شود
    فهمید؛ از روی تاریخ می‌شود. بدون این هشدار، «رسید»ِ آن پاسخ به‌حساب پیام ما
    گذاشته می‌شود و ردیابی به بیراهه می‌رود.
  */
  const DAY = 86_400;
  const now = Math.floor(Date.now() / 1000);
  if (rows.some((r) => typeof r.sendDateTime === "number" && now - r.sendDateTime > DAY)) {
    console.warn(
      "\n  ⚠ تاریخ این پاسخ برای امروز نیست. سرویس احتمالاً پاسخ نمونه داده،\n" +
        "    نه گزارش این ارسال. به آن تکیه نکنید — گوشی و «گزارش ارسال» پنل\n" +
        "    مرجع‌اند.",
    );
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
        "  اگر روی مسیر انبوه هستید، نوع خط را ببینید: خط تبلیغاتی به شماره‌ای\n" +
        "  که پیامک تبلیغاتی را مسدود کرده تحویل نمی‌شود. مسیر قالب این محدودیت\n" +
        "  را ندارد، پس آنجا باید در «گزارش ارسال» پنل دنبالش گشت.\n",
    );
  }
}

type Row = { mobile?: number | string; deliveryState?: number | null; sendDateTime?: number };

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

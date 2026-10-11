/**
 * =============================================================================
 *  آزمایش اعلان پیامکی
 * =============================================================================
 *  پیش از اینکه به یک سفارش واقعی تکیه کنیم، باید بدانیم پیامک واقعاً می‌رسد.
 *  این اسکریپت دقیقاً همان مسیری را می‌رود که ثبت سفارش می‌رود — همان تنظیمات،
 *  همان تابع، همان قالب — فقط داده‌اش آشکارا آزمایشی است.
 *
 *  پاسخ خام چاپ می‌شود، نه فقط «موفق/ناموفق». دلیلش یک تجربهٔ واقعی است:
 *  سرویس پیام را پذیرفت و status=1 داد، هزینه هم کم شد، ولی پیامکی نرسید.
 *  تفاوتِ «پذیرفته شد» و «رسید» فقط از همین بدنه پیداست.
 *
 *  اجرا:
 *      npm run sms:test                 ارسال پیام آزمایشی
 *      npm run sms:report -- <شناسه>    پیگیری اینکه آن ارسال رسید یا نه
 * =============================================================================
 */
import "dotenv/config";

import { notifyStaff, smsConfigured, smsDiagnostics, testMessage } from "../src/lib/notify";

// tsx این فایل را به CommonJS ترجمه می‌کند و آنجا await سطح بالا مجاز نیست
async function main() {
  if (!smsConfigured()) {
    console.error(
      "\n✖ پیامک تنظیم نشده است.\n" +
        "  در /etc/nirooxen/nirooxen.env این‌ها لازم‌اند:\n" +
        "     SMS_PROVIDER=smsir\n" +
        "     SMSIR_API_KEY=…\n" +
        "     SMSIR_TEMPLATE_ORDER=…   شناسهٔ قالب در پنل\n" +
        "     SMSIR_TEMPLATE_CONTACT=…\n" +
        "     SMS_RECIPIENTS=09…\n",
    );
    process.exit(1);
  }

  /*
    تنظیمات مؤثر پیش از ارسال چاپ می‌شود، نه بعدش. وقتی سرویس «موفق» می‌گوید و
    پنل هیچ رکوردی ندارد، نخستین چیزی که باید دید همین است: درخواست به کجا رفت
    و با کدام شناسهٔ قالب. بدون این، حدس‌زدن جای بررسی را می‌گیرد.
  */
  const config = smsDiagnostics();
  console.log("\n── تنظیمات مؤثر ──");
  console.log(`  نشانی سرویس      ${config.base}`);
  console.log(`  کلید API         ${config.key}`);
  console.log(`  قالب سفارش       ${config.templateOrder}`);
  console.log(`  قالب پیام تماس   ${config.templateContact}`);
  console.log(`  گیرنده‌ها         ${config.recipients.join("، ")}`);

  const result = await notifyStaff(testMessage());
  console.log(`\n── مسیر ارسال: ${result.method === "verify" ? "قالب (Verify)" : "انبوه (Bulk)"} ──`);

  if (result.method === "bulk") {
    console.warn(
      "  هشدار: قالبی تنظیم نشده، پس مسیر انبوه به کار رفت. خطوط انبوه به\n" +
        "  شماره‌ای که پیامک را نزد اپراتور مسدود کرده تحویل نمی‌دهند و شبانه\n" +
        "  هم ارسال نمی‌کنند. برای اعلان سفارش، SMSIR_TEMPLATE_ORDER را تنظیم کنید.",
    );
  }

  const ids: string[] = [];
  for (const send of result.sends) {
    console.log(`\n── پاسخ${send.to ? ` برای ${send.to}` : ""} ──`);
    console.log(`  ${send.url}  →  HTTP ${send.httpStatus ?? "—"}`);
    if (send.server) console.log(`  سرور پاسخ‌دهنده: ${send.server}`);
    if (send.date) console.log(`  تاریخ پاسخ: ${send.date}`);
    console.log(pretty(send.raw));
    const id = trackingId(send.raw);
    if (id) ids.push(id);
  }

  if (!result.ok) {
    console.error("\n✖ دست‌کم یک ارسال پذیرفته نشد — خط‌های [notify] بالا دلیلش را گفتند.\n");
    process.exit(1);
  }

  console.log(
    "\n✓ سرویس ارسال را پذیرفت (status=1).\n" +
      "  اما پذیرش یعنی «گرفتمش»، نه «رساندمش». اگر پیامک نرسید:\n" +
      (ids.length
        ? ids.map((id) => `     npm run sms:report -- ${id}\n`).join("")
        : "     شناسهٔ پیگیری در پاسخ بالا نبود؛ گزارش را از پنل sms.ir ببینید.\n"),
  );
}

function pretty(raw: string): string {
  if (!raw) return "(بدنه‌ای برنگشت)";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

/**
 * شناسهٔ پیگیری را از پاسخ بیرون می‌کشد.
 *
 * دو مسیر دو شکل می‌دهند: انبوه `packId` و Verify `messageId`. اگر سرویس روزی
 * نام فیلد را عوض کند، به‌جای خطا فقط این خط چاپ نمی‌شود.
 */
function trackingId(raw: string): string | null {
  if (!raw) return null;
  try {
    const data = (JSON.parse(raw) as { data?: { packId?: unknown; messageId?: unknown } }).data;
    const id = data?.packId ?? data?.messageId;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  } catch {
    return null;
  }
}

main();

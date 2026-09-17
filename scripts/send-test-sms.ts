/**
 * =============================================================================
 *  آزمایش اعلان پیامکی
 * =============================================================================
 *  پیش از اینکه به یک سفارش واقعی تکیه کنیم، باید بدانیم پیامک واقعاً می‌رسد.
 *  این اسکریپت دقیقاً همان مسیری را می‌رود که ثبت سفارش می‌رود — همان تنظیمات،
 *  همان تابع — فقط متنش آزمایشی است.
 *
 *  پاسخ خام چاپ می‌شود، نه فقط «موفق/ناموفق». دلیلش یک تجربهٔ واقعی است:
 *  sms.ir پیام را پذیرفت و status=1 داد، ولی پیامکی نرسید. تفاوتِ «پذیرفته شد»
 *  و «رسید» فقط از همین بدنه پیداست — هزینه، شناسهٔ بسته، و تعداد گیرنده.
 *
 *  اجرا:
 *      npm run sms:test                 ارسال پیام آزمایشی
 *      npm run sms:report -- <packId>   پیگیری اینکه آن ارسال رسید یا نه
 * =============================================================================
 */
import "dotenv/config";

import { notifyStaff, smsConfigured } from "../src/lib/notify";

// tsx این فایل را به CommonJS ترجمه می‌کند و آنجا await سطح بالا مجاز نیست
async function main() {
  if (!smsConfigured()) {
    console.error(
      "\n✖ پیامک تنظیم نشده است.\n" +
        "  در /etc/nirooxen/nirooxen.env این‌ها لازم‌اند:\n" +
        "     SMS_PROVIDER=smsir\n" +
        "     SMSIR_API_KEY=…\n" +
        "     SMS_LINE=3000…\n" +
        "     SMS_RECIPIENTS=09…\n",
    );
    process.exit(1);
  }

  const stamp = new Date().toLocaleString("fa-IR");
  const result = await notifyStaff(`نیروکسن | پیام آزمایشی · ${stamp}`);

  if (result.raw) {
    console.log("\n── پاسخ خام سرویس ──");
    try {
      console.log(JSON.stringify(JSON.parse(result.raw), null, 2));
    } catch {
      console.log(result.raw);
    }
  }

  if (!result.ok) {
    console.error("\n✖ ارسال پذیرفته نشد — خط [notify] بالا دلیلش را گفت.\n");
    process.exit(1);
  }

  /*
    شناسهٔ بسته را از پاسخ بیرون می‌کشیم چون تنها راه پیگیری همین است. اگر
    سرویس روزی نام فیلد را عوض کند، به‌جای خطا فقط این خط چاپ نمی‌شود.
  */
  const packId = extractPackId(result.raw);

  console.log(
    "\n✓ سرویس ارسال را پذیرفت (status=1).\n" +
      "  اما پذیرش یعنی «گرفتمش»، نه «رساندمش». اگر پیامک نرسید:\n" +
      (packId
        ? `     npm run sms:report -- ${packId}\n`
        : "     شناسهٔ بسته در پاسخ بالا نبود؛ گزارش را از پنل sms.ir ببینید.\n"),
  );
}

function extractPackId(raw?: string): string | null {
  if (!raw) return null;
  try {
    const data = (JSON.parse(raw) as { data?: { packId?: unknown } }).data;
    const id = data?.packId;
    return typeof id === "string" || typeof id === "number" ? String(id) : null;
  } catch {
    return null;
  }
}

main();

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
  try {
    console.log(JSON.stringify(JSON.parse(body), null, 2));
  } catch {
    console.log(body);
  }
  console.log(
    "\n  deliveryState را ببینید: رسیده، نرسیده، یا هنوز در صف.\n" +
      "  «پذیرفته ولی نرسیده» معمولاً یعنی نوع خط با نوع پیام نمی‌خواند.\n",
  );
}

main();

/**
 * =============================================================================
 *  اعلان به تیم فروش
 * =============================================================================
 *  بدون این، درخواست تازه فقط در پایگاه داده می‌نشیند و تا وقتی کسی پنل را باز
 *  نکند دیده نمی‌شود. در کاری که مشتری منتظر جواب است، درخواستِ دیده‌نشده یعنی
 *  فروشِ رفته.
 *
 *  قاعدهٔ اصلی: **اعلان هرگز نباید ثبت درخواست را خراب کند.** هر خطایی اینجا
 *  بلعیده و لاگ می‌شود؛ درخواست مشتری در هر حال ثبت شده است و پنل همیشه منبع
 *  حقیقت می‌ماند.
 *
 *  تنظیمات (در /etc/nirooxen/nirooxen.env):
 *      SMS_PROVIDER=kavenegar
 *      KAVENEGAR_API_KEY=…
 *      SMS_SENDER=…            اختیاری — خط اختصاصی؛ خالی یعنی خط پیش‌فرض پنل
 *      SMS_RECIPIENTS=0912…,0913…   شماره‌هایی که باید خبردار شوند
 *
 *  اگر تنظیم نشده باشد، بی‌صدا کاری نمی‌کند. سایت بدون آن هم کامل کار می‌کند.
 * =============================================================================
 */

/** هیچ‌کدام NEXT_PUBLIC_ نیستند، پس روی کلاینت خالی‌اند و چیزی لو نمی‌رود */
const PROVIDER = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
const API_KEY = (process.env.KAVENEGAR_API_KEY ?? "").trim();
const SENDER = (process.env.SMS_SENDER ?? "").trim();
/** فقط برای آزمایش با یک سرویس ساختگی؛ در production خالی می‌ماند */
const API_BASE = (process.env.SMS_API_BASE ?? "https://api.kavenegar.com").replace(/\/$/, "");

/** شماره‌ها با کاما جدا می‌شوند؛ فاصله و خط تیره نادیده گرفته می‌شود */
function recipients(): string[] {
  return (process.env.SMS_RECIPIENTS ?? "")
    .split(",")
    .map((n) => n.replace(/[\s-]/g, "").trim())
    .filter(Boolean);
}

export function smsConfigured(): boolean {
  return PROVIDER === "kavenegar" && API_KEY.length > 0 && recipients().length > 0;
}

/**
 * ارسال پیامک به شماره‌های تیم.
 *
 * مهلت هشت ثانیه دارد: کندی سرویس پیامک نباید صف کارهای پس‌زمینهٔ سرور را
 * بگیرد. کلید API هرگز در لاگ نوشته نمی‌شود.
 */
export async function notifyStaff(message: string): Promise<void> {
  if (!smsConfigured()) return;

  const to = recipients();
  const url = `${API_BASE}/v1/${encodeURIComponent(API_KEY)}/sms/send.json`;

  const body = new URLSearchParams({ receptor: to.join(","), message });
  if (SENDER) body.set("sender", SENDER);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`[notify] سرویس پیامک پاسخ ${response.status} داد`);
      return;
    }

    /*
      کاوه‌نگار خطاهای دامنه‌ای — اعتبار تمام‌شده، شمارهٔ نامعتبر، متن مسدود —
      را با HTTP 200 و کد داخلی برمی‌گرداند. بدون خواندن همان کد، شکستِ ارسال
      موفقیت به‌نظر می‌رسد.
    */
    const payload = (await response.json()) as { return?: { status?: number; message?: string } };
    const status = payload?.return?.status;
    if (status !== 200) {
      console.error(`[notify] سرویس پیامک نپذیرفت — کد ${status}: ${payload?.return?.message ?? "?"}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[notify] ارسال پیامک انجام نشد: ${reason}`);
  }
}

/** ارقام لاتین برای شماره‌ای که باید قابل شماره‌گیری بماند */
const toEn = (text: string) =>
  text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

/**
 * ارقام فارسی برای عددی که وسط جمله می‌نشیند.
 *
 * شمارهٔ سفارش و شمارهٔ تماس عمداً لاتین می‌مانند: اولی قالب خودش را دارد و
 * دومی باید با یک لمس قابل شماره‌گیری باشد.
 */
const toFa = (value: number) =>
  String(value).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

/**
 * متن اعلان درخواست تازه.
 *
 * پیامک فارسی هر ۷۰ کاراکتر یک بخش حساب می‌شود، پس متن عمداً کوتاه است: فقط
 * آنچه برای تصمیمِ «حالا زنگ بزنم یا بعد» لازم است. جزئیات در پنل هست.
 */
export function newOrderMessage(input: {
  type: "QUOTE" | "ORDER";
  number: string;
  contactName: string;
  contactPhone: string;
  itemCount: number;
}): string {
  const kind = input.type === "QUOTE" ? "استعلام" : "سفارش";
  return `نیروکسن | ${kind} تازه ${input.number} · ${input.contactName} · ${toFa(input.itemCount)} قلم · ${toEn(input.contactPhone)}`;
}

/** متن اعلان پیام تماس */
export function newMessageMessage(input: { name: string; phone: string }): string {
  return `نیروکسن | پیام تماس تازه از ${input.name} · ${toEn(input.phone)}`;
}

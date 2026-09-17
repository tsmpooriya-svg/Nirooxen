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
 *  سرویس: sms.ir — ارسال گروهی روی خط اختصاصی حساب.
 *
 *  تنظیمات (در /etc/nirooxen/nirooxen.env):
 *      SMS_PROVIDER=smsir
 *      SMSIR_API_KEY=…             از پنل sms.ir ← توسعه‌دهندگان ← کلید API
 *      SMS_LINE=3000…              شمارهٔ خطی که روی حساب فعال است
 *      SMS_RECIPIENTS=0912…,0913…  شماره‌هایی که باید خبردار شوند
 *
 *  اگر تنظیم نشده باشد، بی‌صدا کاری نمی‌کند. سایت بدون آن هم کامل کار می‌کند.
 * =============================================================================
 */

/** هیچ‌کدام NEXT_PUBLIC_ نیستند، پس روی کلاینت خالی‌اند و چیزی لو نمی‌رود */
const PROVIDER = (process.env.SMS_PROVIDER ?? "").trim().toLowerCase();
const API_KEY = (process.env.SMSIR_API_KEY ?? "").trim();
const LINE = (process.env.SMS_LINE ?? "").trim();
/** فقط برای آزمایش با یک سرویس ساختگی؛ در production خالی می‌ماند */
const API_BASE = (process.env.SMS_API_BASE ?? "https://api.sms.ir").replace(/\/$/, "");

/** شماره‌ها با کاما جدا می‌شوند؛ فاصله و خط تیره نادیده گرفته می‌شود */
function recipients(): string[] {
  return (process.env.SMS_RECIPIENTS ?? "")
    .split(",")
    .map((n) => n.replace(/[\s-]/g, "").trim())
    .filter(Boolean);
}

/**
 * خط ارسال هم شرط است، نه اختیاری: sms.ir بدون آن ارسال گروهی را نمی‌پذیرد.
 * اگر جزو شرط‌ها نبود، نبودش به‌جای «تنظیم‌نشده» به شکل خطای هر بار ارسال
 * ظاهر می‌شد.
 */
export function smsConfigured(): boolean {
  return PROVIDER === "smsir" && API_KEY.length > 0 && LINE.length > 0 && recipients().length > 0;
}

/**
 * آنچه از پاسخ سرویس می‌خوانیم.
 *
 * `data` عمداً باز گذاشته شده: در پذیرشِ موفق، شناسهٔ بستهٔ ارسال و هزینه
 * آنجاست و همان‌ها تنها سرنخ برای پیگیری پیامکی‌اند که پذیرفته شده ولی نرسیده.
 */
type SmsIrReply = { status?: number; message?: string; data?: unknown };

/**
 * نتیجهٔ ارسال.
 *
 * فراخوان‌های واقعی (ثبت سفارش، پیام تماس) نادیده‌اش می‌گیرند — برایشان اعلان
 * کاری است که یا می‌شود یا نمی‌شود. اسکریپت آزمایش اما باید بتواند پاسخ خام را
 * نشان بدهد: «پذیرفته شد» و «رسید» دو چیزند، و فرقشان فقط از همین بدنه پیداست.
 */
export type SmsResult = {
  ok: boolean;
  /** خالی یعنی اصلاً تنظیم نشده و ارسالی در کار نبوده */
  attempted: boolean;
  code?: number;
  detail?: string;
  /** بدنهٔ خام پاسخ، برای وقتی که پذیرش موفق بوده ولی پیامکی نرسیده */
  raw?: string;
};

/**
 * راهنمای کوتاه برای پاسخ‌هایی که بیشتر در راه‌اندازی دیده می‌شوند.
 *
 * متن خودِ سرویس می‌گوید «چه چیزی» رد شده؛ این می‌گوید کدام تنظیم را باید
 * عوض کرد. فهرست عمداً کوتاه است — کدی که اینجا نیست با پیام خودش چاپ می‌شود.
 */
const HINTS: Record<number, string> = {
  401: "کلید API پذیرفته نشد — SMSIR_API_KEY را از پنل sms.ir ← توسعه‌دهندگان دوباره بردارید.",
  403: "دسترسی رد شد — اگر در پنل «محدودیت IP» فعال است، IP این سرور را آنجا اضافه کنید.",
  429: "درخواست بیش از حد مجاز — کمی بعد دوباره.",
};

/**
 * ارسال پیامک به شماره‌های تیم.
 *
 * مهلت هشت ثانیه دارد: کندی سرویس پیامک نباید صف کارهای پس‌زمینهٔ سرور را
 * بگیرد. کلید API هرگز در لاگ نوشته نمی‌شود — در هدر می‌رود، نه در نشانی.
 */
export async function notifyStaff(message: string): Promise<SmsResult> {
  if (!smsConfigured()) return { ok: false, attempted: false };

  try {
    const response = await fetch(`${API_BASE}/v1/send/bulk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": API_KEY,
      },
      body: JSON.stringify({
        lineNumber: LINE,
        messageText: message,
        mobiles: recipients(),
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    /*
      خطاها گاهی در وضعیت HTTP می‌نشینند (کلید غلط، IP مسدود) و گاهی با HTTP 200
      و یک کد داخلی برمی‌گردند (اعتبار تمام‌شده، خط نامعتبر، متن مسدود). در هر دو
      حالت دلیلِ خواندنی در بدنه است، پس بدنه یک بار به‌صورت متن خوانده می‌شود و
      هر دو مسیر از همان می‌خوانند. اگر فقط عدد وضعیت چاپ می‌شد، اپراتور با یک
      ۴۰۳ بی‌توضیح تنها می‌ماند و باید حدس می‌زد کدام تنظیم غلط است.
    */
    const raw = await response.text();
    let payload: SmsIrReply | null = null;
    try {
      payload = JSON.parse(raw) as SmsIrReply;
    } catch {
      /* سرویس گاهی در خطا HTML یا متن خام می‌دهد؛ همان را نشان می‌دهیم */
    }

    // در sms.ir موفقیت یعنی status === 1، نه 200
    if (payload?.status === 1) {
      return { ok: true, attempted: true, code: 1, detail: payload.message?.trim(), raw };
    }

    const code = payload?.status ?? response.status;
    const detail = payload?.message?.trim() || raw.trim().slice(0, 200) || "بدون توضیح";
    const hint = HINTS[response.status];
    console.error(
      `[notify] سرویس پیامک نپذیرفت — کد ${code}: ${detail}` + (hint ? `\n          ${hint}` : ""),
    );
    return { ok: false, attempted: true, code, detail, raw };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[notify] ارسال پیامک انجام نشد: ${reason}`);
    return { ok: false, attempted: true, detail: reason };
  }
}

/**
 * وضعیت رساندن یک بستهٔ ارسال.
 *
 * «پذیرفته شد» یعنی سرویس پیام را گرفت؛ «رسید» چیز دیگری است و ممکن است ساعت‌ها
 * بعد یا هرگز اتفاق نیفتد — خط تبلیغاتی به شماره‌ای که پیامک تبلیغاتی را مسدود
 * کرده تحویل نمی‌شود، و پذیرش هم همان لحظه موفق گزارش می‌شود. تنها راه فهمیدنش
 * پرسیدن از خود سرویس است.
 */
export async function deliveryReport(packId: string): Promise<{ status: number; body: string }> {
  const response = await fetch(`${API_BASE}/v1/send/pack/${encodeURIComponent(packId)}`, {
    headers: { Accept: "application/json", "X-API-KEY": API_KEY },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  return { status: response.status, body: await response.text() };
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

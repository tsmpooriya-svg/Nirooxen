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
 *  ---------------------------------------------------------------------------
 *  چرا قالب (Verify) و نه ارسال انبوه
 *  ---------------------------------------------------------------------------
 *  نخستین پیاده‌سازی از `send/bulk` استفاده می‌کرد. سرویس پذیرفت، هزینه کم شد،
 *  و پیامک نرسید — چون خطوط انبوه دو محدودیت دارند که sms.ir خودش برمی‌شمارد:
 *  به شماره‌ای که دریافت پیامک را نزد اپراتور مسدود کرده تحویل نمی‌شوند، و در
 *  ساعات شبانه ارسال نمی‌شوند. اعلان سفارش هیچ‌کدام را نمی‌پذیرد: باید به همان
 *  شمارهٔ تیم برسد، و ساعت سه بامداد هم همان‌قدر مهم است که ظهر.
 *
 *  متد Verify برای همین ساخته شده و هر دو محدودیت را ندارد. بهایش این است که
 *  متن آزاد نیست: قالب در پنل ثبت می‌شود و ما فقط پارامترها را می‌فرستیم.
 *
 *  مسیر انبوه به‌عنوان جایگزین می‌ماند — اگر قالبی تنظیم نشده باشد ولی خطی
 *  تنظیم شده باشد، از همان استفاده می‌شود.
 *
 *  ---------------------------------------------------------------------------
 *  تنظیمات (در /etc/nirooxen/nirooxen.env)
 *  ---------------------------------------------------------------------------
 *      SMS_PROVIDER=smsir
 *      SMSIR_API_KEY=…                 پنل sms.ir ← توسعه‌دهندگان ← کلید API
 *      SMSIR_TEMPLATE_ORDER=…          شناسهٔ قالب استعلام/سفارش
 *      SMSIR_TEMPLATE_CONTACT=…        شناسهٔ قالب پیام تماس
 *      SMS_RECIPIENTS=0912…,0913…      شماره‌هایی که باید خبردار شوند
 *      SMS_LINE=3000…                  فقط برای مسیر انبوه؛ بدون قالب
 *
 *  متن قالب‌ها در README آمده تا عیناً در پنل ثبت شود؛ نام پارامترها باید با
 *  چیزی که اینجا ساخته می‌شود یکی باشد.
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

const TEMPLATES = {
  order: (process.env.SMSIR_TEMPLATE_ORDER ?? "").trim(),
  contact: (process.env.SMSIR_TEMPLATE_CONTACT ?? "").trim(),
};

/** شماره‌ها با کاما جدا می‌شوند؛ فاصله و خط تیره نادیده گرفته می‌شود */
function recipients(): string[] {
  return (process.env.SMS_RECIPIENTS ?? "")
    .split(",")
    .map((n) => n.replace(/[\s-]/g, "").trim())
    .filter(Boolean);
}

/**
 * یک اعلان آمادهٔ ارسال.
 *
 * هر دو شکل با هم ساخته می‌شوند چون تا لحظهٔ ارسال معلوم نیست کدام مسیر فعال
 * است: `text` برای مسیر انبوه، و `template` برای Verify.
 */
export type Notification = {
  kind: keyof typeof TEMPLATES;
  text: string;
  parameters: Record<string, string>;
};

export function smsConfigured(): boolean {
  if (PROVIDER !== "smsir" || !API_KEY || recipients().length === 0) return false;
  return Boolean(TEMPLATES.order || TEMPLATES.contact || LINE);
}

/** آنچه از پاسخ سرویس می‌خوانیم؛ بقیهٔ فیلدها برایمان مهم نیستند */
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
  /** نادرست یعنی اصلاً تنظیم نشده و ارسالی در کار نبوده */
  attempted: boolean;
  method?: "verify" | "bulk";
  /** یک ردیف به ازای هر درخواستی که رفت */
  sends: { to?: string; ok: boolean; code?: number; detail?: string; raw: string }[];
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
  404: "قالبی با این شناسه پیدا نشد — SMSIR_TEMPLATE_… را با پنل بسنجید.",
  429: "درخواست بیش از حد مجاز — کمی بعد دوباره.",
};

/** یک درخواست، خوانده‌شده و تفسیرشده. هرگز پرتاب نمی‌کند. */
async function post(
  path: string,
  body: unknown,
  to?: string,
): Promise<SmsResult["sends"][number]> {
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-api-key": API_KEY,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });

    /*
      خطاها گاهی در وضعیت HTTP می‌نشینند (کلید غلط، قالب ناموجود) و گاهی با
      HTTP 200 و یک کد داخلی برمی‌گردند (اعتبار تمام‌شده، پارامتر نامعتبر). در
      هر دو حالت دلیلِ خواندنی در بدنه است، پس بدنه یک بار به‌صورت متن خوانده
      می‌شود و هر دو مسیر از همان می‌خوانند. اگر فقط عدد وضعیت چاپ می‌شد،
      اپراتور با یک ۴۰۳ بی‌توضیح تنها می‌ماند.
    */
    const raw = await response.text();
    let payload: SmsIrReply | null = null;
    try {
      payload = JSON.parse(raw) as SmsIrReply;
    } catch {
      /* سرویس گاهی در خطا HTML یا متن خام می‌دهد؛ همان را نشان می‌دهیم */
    }

    // در sms.ir موفقیت یعنی status === 1، نه 200
    if (payload?.status === 1) return { to, ok: true, code: 1, raw };

    const code = payload?.status ?? response.status;
    const detail = payload?.message?.trim() || raw.trim().slice(0, 200) || "بدون توضیح";
    const hint = HINTS[response.status];
    console.error(
      `[notify] سرویس پیامک نپذیرفت${to ? ` (${to})` : ""} — کد ${code}: ${detail}` +
        (hint ? `\n          ${hint}` : ""),
    );
    return { to, ok: false, code, detail, raw };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`[notify] ارسال پیامک انجام نشد${to ? ` (${to})` : ""}: ${reason}`);
    return { to, ok: false, detail: reason, raw: "" };
  }
}

/**
 * ارسال اعلان به شماره‌های تیم.
 *
 * هر درخواست مهلت هشت ثانیه دارد: کندی سرویس پیامک نباید صف کارهای پس‌زمینهٔ
 * سرور را بگیرد. کلید API هرگز در لاگ نوشته نمی‌شود — در هدر می‌رود، نه در نشانی.
 */
export async function notifyStaff(notification: Notification): Promise<SmsResult> {
  if (!smsConfigured()) return { ok: false, attempted: false, sends: [] };

  const to = recipients();
  const templateId = TEMPLATES[notification.kind];

  if (templateId) {
    /*
      Verify تک‌گیرنده است، پس به ازای هر شماره یک درخواست می‌رود. موازی‌اند
      چون تعدادشان چند تاست، نه چند هزار تا، و ترتیبشان هم اهمیتی ندارد.
      شکستِ یکی نباید بقیه را لغو کند — allSettled نه، چون post خودش هرگز
      پرتاب نمی‌کند.
    */
    const parameters = Object.entries(notification.parameters).map(([name, value]) => ({
      name,
      value,
    }));
    const sends = await Promise.all(
      to.map((mobile) => post("/v1/send/verify", { mobile, templateId, parameters }, mobile)),
    );
    return { ok: sends.every((s) => s.ok), attempted: true, method: "verify", sends };
  }

  const send = await post("/v1/send/bulk", {
    lineNumber: LINE,
    messageText: notification.text,
    mobiles: to,
  });
  return { ok: send.ok, attempted: true, method: "bulk", sends: [send] };
}

/**
 * وضعیت رساندن یک ارسال.
 *
 * «پذیرفته شد» یعنی سرویس پیام را گرفت؛ «رسید» چیز دیگری است و ممکن است ساعت‌ها
 * بعد یا هرگز اتفاق نیفتد. تنها راه فهمیدنش پرسیدن از خود سرویس است.
 *
 * ارسال انبوه شناسهٔ بسته می‌دهد و Verify شناسهٔ پیام؛ مسیرشان فرق دارد، پس از
 * روی شکل شناسه انتخاب می‌شود — عددِ خالی یعنی پیام، بقیه یعنی بسته.
 */
export async function deliveryReport(id: string): Promise<{ status: number; body: string }> {
  const path = /^\d+$/.test(id)
    ? `/v1/send/${encodeURIComponent(id)}`
    : `/v1/send/pack/${encodeURIComponent(id)}`;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json", "x-api-key": API_KEY },
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
 * پارامتر قالب کوتاه نگه داشته می‌شود.
 *
 * sms.ir برای مقدار پارامتر سقف دارد و نام‌های بلند را رد می‌کند؛ بریدن اینجا
 * بهتر از رد شدن کل پیامک است. خط جدید هم در پارامتر مجاز نیست.
 */
const slot = (value: string, max = 25) =>
  value.replace(/\s+/g, " ").trim().slice(0, max) || "—";

/**
 * اعلان درخواست تازه.
 *
 * متن انبوه عمداً کوتاه است — پیامک فارسی هر ۷۰ کاراکتر یک بخش حساب می‌شود، و
 * فقط آنچه برای تصمیمِ «حالا زنگ بزنم یا بعد» لازم است اینجاست. جزئیات در پنل.
 */
export function newOrderMessage(input: {
  type: "QUOTE" | "ORDER";
  number: string;
  contactName: string;
  contactPhone: string;
  itemCount: number;
}): Notification {
  const kind = input.type === "QUOTE" ? "استعلام" : "سفارش";
  const phone = toEn(input.contactPhone);
  return {
    kind: "order",
    text: `نیروکسن | ${kind} تازه ${input.number} · ${input.contactName} · ${toFa(input.itemCount)} قلم · ${phone}`,
    parameters: {
      KIND: slot(kind),
      NUMBER: slot(input.number),
      NAME: slot(input.contactName),
      PHONE: slot(phone),
      COUNT: slot(String(input.itemCount)),
    },
  };
}

/** اعلان پیام تماس */
export function newMessageMessage(input: { name: string; phone: string }): Notification {
  const phone = toEn(input.phone);
  return {
    kind: "contact",
    text: `نیروکسن | پیام تماس تازه از ${input.name} · ${phone}`,
    parameters: { NAME: slot(input.name), PHONE: slot(phone) },
  };
}

/** اعلان آزمایشی — همان مسیر سفارش، با داده‌ای که آشکارا آزمایشی است */
export function testMessage(): Notification {
  const stamp = new Date().toLocaleTimeString("fa-IR");
  return newOrderMessage({
    type: "QUOTE",
    number: "TEST-0000",
    contactName: `آزمایش ${stamp}`,
    contactPhone: "09000000000",
    itemCount: 1,
  });
}

import "server-only";

/**
 * محدودسازی حجم بدنهٔ درخواست.
 *
 * Server Action ها به‌صورت پیش‌فرض در Next به ۱ مگابایت محدودند، اما Route
 * Handler ها هیچ سقفی ندارند: `request.json()` یا `request.formData()` هرچقدر
 * که فرستاده شود را تا آخر در حافظه می‌خوانند. این ماژول همان سقف را برای
 * مسیرهای API فراهم می‌کند.
 *
 * دو لایه دارد، چون هیچ‌کدام به‌تنهایی کافی نیست:
 *   • هدر Content-Length ارزان است ولی مهاجم می‌تواند آن را نفرستد یا خراب کند
 *   • خواندن جریانی گران‌تر است ولی واقعیت را می‌سنجد
 */

export class BodyTooLargeError extends Error {
  constructor(readonly maxBytes: number) {
    super(`body exceeds ${maxBytes} bytes`);
    this.name = "BodyTooLargeError";
  }
}

/** حجم اعلام‌شده در هدر — اگر نامعتبر یا غایب باشد null */
export function declaredLength(request: Request): number | null {
  const raw = request.headers.get("content-length");
  if (raw === null) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/**
 * رد سریع بر پایهٔ هدر، پیش از آنکه حتی یک بایت خوانده شود.
 *
 * `requireLength` برای مسیرهایی است که بدنه را با پارسر داخلی (مثلاً
 * `formData()`) می‌خوانند و نمی‌توان وسط خواندن متوقفشان کرد؛ آنجا نبودِ
 * Content-Length یعنی سقف قابل اعمال نیست و درخواست رد می‌شود.
 */
export function checkDeclaredLength(
  request: Request,
  maxBytes: number,
  { requireLength = false }: { requireLength?: boolean } = {},
): "ok" | "too-large" | "length-required" {
  const declared = declaredLength(request);
  if (declared === null) return requireLength ? "length-required" : "ok";
  return declared > maxBytes ? "too-large" : "ok";
}

/**
 * خواندن بدنه به‌صورت متن با سقف سخت.
 *
 * برخلاف `request.text()`، به‌محض عبور از سقف خواندن را رها می‌کند؛ پس بدنهٔ
 * بزرگ هرگز کامل در حافظه جمع نمی‌شود.
 */
export async function readTextWithLimit(request: Request, maxBytes: number): Promise<string> {
  if (checkDeclaredLength(request, maxBytes) === "too-large") {
    throw new BodyTooLargeError(maxBytes);
  }

  const body = request.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new BodyTooLargeError(maxBytes);
      chunks.push(value);
    }
  } finally {
    reader.cancel().catch(() => {});
  }

  return Buffer.concat(chunks).toString("utf8");
}

/** سقف‌های هر مسیر — کنار هم تا اختلافشان عمدی و قابل بازبینی بماند */
export const BODY_LIMITS = {
  /** یک ایمیل در JSON؛ چند کیلوبایت هم سخاوتمندانه است */
  subscribe: 8 * 1024,
} as const;

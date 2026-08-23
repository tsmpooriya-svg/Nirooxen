/**
 * =============================================================================
 *  تبدیل مقدار متنی مشخصه به مقدار نوع‌دار
 * =============================================================================
 *  این ماژول عمداً مستقل از پایگاه داده است تا هم در اسکریپت backfill و هم
 *  بعداً در پنل مدیریت (هنگام ذخیره فرم محصول) استفاده شود.
 *
 *  اصل کار: **هرگز حدس نزن.** اگر متن به‌طور قطعی به عدد تبدیل نشد،
 *  `ok: false` برگردان تا فراخوان آن را خام نگه دارد و علامت بزند؛ نه اینکه
 *  عددی از خودش بسازد.
 * =============================================================================
 */

/** جداکننده اعشار فارسی (U+066B) و جداکننده هزارگان (U+066C) */
const ARABIC_DECIMAL = "٫";
const ARABIC_THOUSANDS = "٬";

/**
 * تبدیل ارقام فارسی/عربی به لاتین و یکسان‌سازی جداکننده‌ها.
 *
 * `toEnDigits` در lib/utils فقط ارقام را تبدیل می‌کند و جداکننده اعشار
 * فارسی را نمی‌شناسد؛ «۲٫۵» با آن به «2٫5» تبدیل می‌شد که عدد معتبری نیست.
 */
export function normalizeNumerals(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(new RegExp(ARABIC_THOUSANDS, "g"), "")
    .replace(new RegExp(ARABIC_DECIMAL, "g"), ".")
    .replace(/‌/g, " ") // نیم‌فاصله
    .trim();
}

export type ParsedNumeric =
  | { ok: true; kind: "single"; min: number; max: null }
  | { ok: true; kind: "range"; min: number | null; max: number | null }
  | { ok: false; reason: string };

/** فقط عدد (با علامت و اعشار) را از یک قطعه متن بیرون می‌کشد */
function extractNumbers(text: string): number[] {
  const matches = text.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!matches) return [];
  return matches.map(Number).filter((n) => Number.isFinite(n));
}

/**
 * تلاش برای تبدیل متن مشخصه به عدد یا بازه.
 *
 * الگوهای پشتیبانی‌شده (همه از داده واقعی کاتالوگ آمده‌اند):
 *   «۶۰»            → عدد تکی
 *   «۲٫۵»           → عدد اعشاری فارسی
 *   «۱ اینچ»        → عدد با واحد چسبیده
 *   «تا ۱۶۰»        → بازه باز از پایین (min=null, max=160)
 *   «-۲۰ تا +۱۳۰»   → بازه کامل
 *   «۱ / ۱ اینچ»    → رد می‌شود؛ دو مقدار مستقل است، نه یک عدد
 */
export function parseNumericValue(raw: string): ParsedNumeric {
  const text = normalizeNumerals(raw);
  if (!text) return { ok: false, reason: "متن خالی" };

  // «۱ / ۱ اینچ» یا هر مقدار جفتی — عمداً تبدیل نمی‌شود
  if (/\d\s*[/×x]\s*\d/i.test(text)) {
    return { ok: false, reason: "مقدار مرکب (دو عدد جدا) — نیاز به بازبینی دستی" };
  }

  // مرز کلمه (\b) در جاوااسکریپت فقط برای [A-Za-z0-9_] کار می‌کند و با خط
  // فارسی هرگز مطابقت نمی‌کند؛ پس مرز را صریح با فاصله/ابتدا/انتها می‌سازیم.
  const RANGE_SEPARATOR = /(?:^|\s)تا(?:\s|$)|\.\.\.|…|~/;
  const hasRangeWord = RANGE_SEPARATOR.test(text);

  if (hasRangeWord) {
    const parts = text.split(RANGE_SEPARATOR).map((p) => p.trim());
    // «تا ۱۶۰» → قسمت اول خالی است یعنی کران پایین باز
    if (parts.length === 2) {
      const lo = extractNumbers(parts[0]!);
      const hi = extractNumbers(parts[1]!);
      const min = lo.length === 1 ? lo[0]! : null;
      const max = hi.length === 1 ? hi[0]! : null;
      if (min === null && max === null) {
        return { ok: false, reason: "بازه بدون عدد قابل تشخیص" };
      }
      if (min !== null && max !== null && min > max) {
        return { ok: false, reason: "کران پایین بزرگ‌تر از کران بالا" };
      }
      return { ok: true, kind: "range", min, max };
    }
    return { ok: false, reason: "بازه با ساختار ناشناخته" };
  }

  const numbers = extractNumbers(text);
  if (numbers.length === 0) return { ok: false, reason: "عددی یافت نشد" };
  if (numbers.length > 1) {
    return { ok: false, reason: `چند عدد در یک مقدار (${numbers.length}) — نیاز به بازبینی دستی` };
  }

  return { ok: true, kind: "single", min: numbers[0]!, max: null };
}

/** مقادیر متنی که به‌طور قطعی بله/خیر هستند */
const TRUE_WORDS = new Set(["دارد", "بله", "آری", "yes", "true", "✓"]);
const FALSE_WORDS = new Set(["ندارد", "خیر", "نه", "no", "false", "—", "-"]);

export function parseBooleanValue(raw: string): boolean | null {
  const text = normalizeNumerals(raw).toLowerCase();
  if (TRUE_WORDS.has(text)) return true;
  if (FALSE_WORDS.has(text)) return false;
  return null;
}

/**
 * تبدیل مقدار به واحد پایهٔ بُعد.
 * ضریب از جدول `units` می‌آید تا مدیر بتواند بعداً واحد تازه تعریف کند.
 */
export function toBaseValue(value: number | null, factor: number): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return value * factor;
}

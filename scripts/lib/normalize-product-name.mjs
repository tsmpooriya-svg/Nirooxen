const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * یکدست‌سازی ارقام در نام محصول، با یک مرز مهم:
 * شناسه‌ها و مدل‌های لاتین دست‌نخورده می‌مانند.
 *
 * قاعدهٔ محافظه‌کارانه:
 *  - هر بخشی که حروف لاتین دارد، حفظ می‌شود (HB-210، 4SKM، T-900 و ...).
 *  - از «مدل» به بعد، کل دنبالهٔ نام حفظ می‌شود؛ چون اجزای عددی مدل ممکن است
 *    جدا از حروف لاتین با فاصله نوشته شده باشند (مثل "مدل PM 45").
 *  - عددهای مستقلِ فارسی‌متن به رقم فارسی تبدیل می‌شوند (مثل "2 اسب" → "۲ اسب").
 *
 * این تابع عمداً «اصلاح محتوایی» نمی‌کند؛ فقط نمایش رقم را یکدست می‌کند.
 */
export function normalizeProductNameDigits(name) {
  const parts = name.split(/(\s+)/u);
  let inModelTail = false;

  return parts.map((part) => {
    if (/^\s+$/u.test(part)) return part;
    if (/^مدل$|^model$/iu.test(part)) {
      inModelTail = true;
      return part;
    }
    if (inModelTail || /[A-Za-z]/u.test(part)) return part;
    if (/^[0-9]+(?:[./-][0-9]+)*$/u.test(part)) {
      return part.replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
    }
    return part;
  }).join("");
}

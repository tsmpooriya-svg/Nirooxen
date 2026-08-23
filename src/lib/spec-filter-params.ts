/**
 * =============================================================================
 *  کدگذاری فیلتر مشخصات فنی در URL
 * =============================================================================
 *  قرارداد پارامترها:
 *
 *      s_<key>_min = <عدد>     کران پایین (بر حسب واحد پایه)
 *      s_<key>_max = <عدد>     کران بالا
 *      s_<key>     = a,b,c     مقادیر متنی انتخاب‌شده
 *
 *  مثال:  /products?category=pumps&s_head_min=40&s_body_material=چدن,استیل
 *
 *  چرا در URL؟ همان دلیل بقیه فیلترهای سایت: قابل اشتراک‌گذاری، قابل
 *  بوکمارک، سازگار با دکمه Back و رندرشونده روی سرور.
 *
 *  این ماژول عمداً هیچ فهرست ثابتی از مشخصه‌ها ندارد؛ هر کلیدی که در
 *  `spec_definitions` تعریف شود خودبه‌خود پشتیبانی می‌شود.
 * =============================================================================
 */

import type { SpecFilterInput } from "@/modules/catalog/queries";

export const SPEC_PARAM_PREFIX = "s_";

export type SpecParamValue = string | string[] | undefined;

const firstValue = (value: SpecParamValue): string | undefined =>
  Array.isArray(value) ? value[0] : value;

const parseNumber = (value: SpecParamValue): number | undefined => {
  const raw = firstValue(value);
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * استخراج فیلترهای مشخصات از پارامترهای URL.
 *
 * `allowedKeys` کلیدهای معتبر همان دسته‌بندی است؛ پارامتری که در آن نباشد
 * نادیده گرفته می‌شود تا کاربر نتواند با دست‌کاری URL کوئری دلخواه بسازد.
 */
export function parseSpecParams(
  params: Record<string, SpecParamValue>,
  allowedKeys: readonly string[],
): SpecFilterInput[] {
  const allowed = new Set(allowedKeys);
  const byKey = new Map<string, SpecFilterInput>();

  const ensure = (key: string): SpecFilterInput => {
    let entry = byKey.get(key);
    if (!entry) {
      entry = { definitionKey: key };
      byKey.set(key, entry);
    }
    return entry;
  };

  for (const [param, value] of Object.entries(params)) {
    if (!param.startsWith(SPEC_PARAM_PREFIX)) continue;
    const rest = param.slice(SPEC_PARAM_PREFIX.length);

    if (rest.endsWith("_min")) {
      const key = rest.slice(0, -4);
      if (!allowed.has(key)) continue;
      const n = parseNumber(value);
      if (n !== undefined) ensure(key).min = n;
    } else if (rest.endsWith("_max")) {
      const key = rest.slice(0, -4);
      if (!allowed.has(key)) continue;
      const n = parseNumber(value);
      if (n !== undefined) ensure(key).max = n;
    } else {
      if (!allowed.has(rest)) continue;
      const raw = firstValue(value);
      if (!raw) continue;
      const values = raw.split(",").map((v) => v.trim()).filter(Boolean);
      if (values.length > 0) ensure(rest).values = values;
    }
  }

  // فیلتر بدون هیچ شرط مؤثری کنار گذاشته می‌شود
  return [...byKey.values()].filter(
    (s) => s.min !== undefined || s.max !== undefined || (s.values?.length ?? 0) > 0,
  );
}

/** نام پارامتر URL برای یک مشخصه */
export const specParamName = (key: string, bound?: "min" | "max") =>
  bound ? `${SPEC_PARAM_PREFIX}${key}_${bound}` : `${SPEC_PARAM_PREFIX}${key}`;

/** آیا در پارامترهای فعلی، فیلتر مشخصه‌ای فعال است؟ */
export function hasActiveSpecFilters(params: Record<string, SpecParamValue>): boolean {
  return Object.entries(params).some(
    ([k, v]) => k.startsWith(SPEC_PARAM_PREFIX) && Boolean(firstValue(v)),
  );
}

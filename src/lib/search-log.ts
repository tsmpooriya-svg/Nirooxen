import "server-only";

import { db } from "@/db";
import { searchQueries } from "@/db/schema";
import { normalizeSearchText } from "@/lib/search-text";

/** ستون term حداکثر ۱۲۰ کاراکتر است؛ عبارت بلندتر بریده می‌شود نه رد */
const MAX_TERM = 120;
/**
 * کوتاه‌تر از این ثبت نمی‌شود. جست‌وجوی سریع با هر مکثِ تایپ یک درخواست
 * می‌فرستد، پس «ک» و «کپ» هم به سرور می‌رسند؛ آن‌ها گزارش را شلوغ می‌کنند
 * بی‌آنکه چیزی بگویند.
 */
const MIN_TERM = 3;

export type SearchSource = "dialog" | "catalog";

/**
 * ثبت یک جست‌وجو.
 *
 * عبارت با همان قاعده‌ای یکسان می‌شود که خودِ جست‌وجو رویش کار می‌کند، وگرنه
 * «كپسول» عربی و «کپسول» فارسی دو ردیف جدا می‌شدند و شمارش بی‌معنا.
 *
 * هیچ‌وقت خطا پرتاب نمی‌کند: گزارش‌گیری نباید جست‌وجو را خراب کند. اگر درج
 * شکست بخورد، فقط در لاگ سرور می‌ماند.
 */
export async function logSearch(
  rawTerm: string,
  resultCount: number,
  source: SearchSource,
): Promise<void> {
  const term = normalizeSearchText(rawTerm).trim().replace(/\s+/g, " ").slice(0, MAX_TERM);
  if (term.length < MIN_TERM) return;

  try {
    await db.insert(searchQueries).values({ term, resultCount, source });
  } catch (error) {
    console.error("[search-log] ثبت جست‌وجو انجام نشد:", error);
  }
}

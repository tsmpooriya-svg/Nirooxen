/* =============================================================================
 *  برداشت نام و نشانی عکس از یک صفحهٔ فهرست محصول — داخل مرورگر خودتان
 * =============================================================================
 *  این فایل روی سرور اجرا نمی‌شود. در مرورگر، روی همان صفحه‌ای که فهرست
 *  محصولات را می‌بینید، Console را باز کنید (F12 ← Console)، کل این فایل را
 *  کپی و Enter بزنید. یک فایل CSV دانلود می‌شود.
 *
 *  چرا: نشانی عکس‌ها را باید یکی‌یکی با راست‌کلیک برداشت، که برای صدها محصول
 *  ساعت‌ها طول می‌کشد. این کار را به چند ثانیه تبدیل می‌کند.
 *
 *  خروجی سه ستون دارد: نام چاپ‌شده روی کارت، نشانی عکس، و نشانی خود محصول.
 *  ستون slug عمداً خالی است — تطبیق نام فروشگاه با محصول شما کار انسان است،
 *  نه حدس این اسکریپت.
 *
 *  بعد از دانلود: ستون slug را از روی فایل «فهرست کار عکس» پر کنید، سپس
 *      node scripts/fetch-product-photos.mjs --list=harvest.csv --out=./raw
 *      node scripts/normalize-photos.mjs   --in=./raw --out=./photos
 *      node scripts/import-product-photos.mjs --dir=./photos --replace
 * =============================================================================
 */
(() => {
  "use strict";

  const MIN_SIDE = 180;   // کوچک‌تر از این آیکون است، نه عکس محصول
  const MAX_ROWS = 2000;

  /** بهترین نسخهٔ تصویر — مرورگرها srcset را برای صفحه انتخاب می‌کنند،
   *  ولی ما بزرگ‌ترین نسخهٔ موجود را می‌خواهیم. */
  function bestSrc(img) {
    const set = img.getAttribute("srcset");
    if (set) {
      const best = set.split(",")
        .map((s) => s.trim().split(/\s+/))
        .map(([u, d]) => ({ u, w: parseInt(d) || 0 }))
        .sort((a, b) => b.w - a.w)[0];
      if (best && best.u) return new URL(best.u, location.href).href;
    }
    const raw = img.currentSrc || img.src ||
      img.getAttribute("data-src") || img.getAttribute("data-original");
    return raw ? new URL(raw, location.href).href : "";
  }

  /** نام محصول: نزدیک‌ترین متن معنادار بالای تصویر در درخت DOM. */
  function nameFor(img) {
    const alt = (img.getAttribute("alt") || "").trim();
    if (alt.length > 8) return alt;
    let el = img;
    for (let i = 0; i < 6 && el; i++) {
      el = el.parentElement;
      if (!el) break;
      const h = el.querySelector("h1,h2,h3,h4,[class*=title],[class*=name]");
      const t = h && h.textContent.trim().replace(/\s+/g, " ");
      if (t && t.length > 5) return t;
    }
    const a = img.closest("a");
    const t = a && (a.getAttribute("title") || a.textContent.trim().replace(/\s+/g, " "));
    return (t && t.length > 5 ? t : alt) || "";
  }

  function linkFor(img) {
    const a = img.closest("a[href]");
    return a ? new URL(a.getAttribute("href"), location.href).href : "";
  }

  const seen = new Set();
  const rows = [];
  for (const img of document.images) {
    // ابعاد واقعیِ بارگذاری‌شده ملاک است، نه اندازهٔ نمایش
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (w < MIN_SIDE || h < MIN_SIDE) continue;
    const src = bestSrc(img);
    if (!src || !/^https?:/.test(src) || seen.has(src)) continue;
    if (/\.svg(\?|$)/i.test(src)) continue;      // آیکون برداری، نه عکس
    seen.add(src);
    rows.push({ name: nameFor(img), src, link: linkFor(img), w, h });
    if (rows.length >= MAX_ROWS) break;
  }

  if (!rows.length) {
    console.warn(
      "%cهیچ عکسی پیدا نشد.",
      "color:#c00;font-weight:bold",
      "\nاحتمالاً صفحه هنوز کامل بارگذاری نشده — تا انتهای صفحه اسکرول کنید" +
      " تا همهٔ کارت‌ها بیایند، بعد دوباره اجرا کنید.",
    );
    return;
  }

  const esc = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
  const csv = "﻿" + [
    ["slug (خالی — شما پر کنید)", "نشانی عکس", "نام روی صفحه", "نشانی محصول", "عرض", "ارتفاع"]
      .map(esc).join(","),
    ...rows.map((r) => ["", r.src, r.name, r.link, r.w, r.h].map(esc).join(",")),
  ].join("\r\n");

  const host = location.hostname.replace(/^www\./, "").replace(/\./g, "-");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `harvest-${host}-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(
    `%c✓ ${rows.length} عکس برداشته شد`,
    "color:#0a7;font-weight:bold;font-size:13px",
    `\nفایل CSV دانلود شد. ستون اول (slug) را پر کنید و بدهید به:` +
    `\n  node scripts/fetch-product-photos.mjs --list=<فایل> --out=./raw`,
  );
  console.table(rows.slice(0, 10));
})();

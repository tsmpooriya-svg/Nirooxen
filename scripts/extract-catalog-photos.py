#!/usr/bin/env python3
"""
=============================================================================
 استخراج عکس محصول از کاتالوگ PDF برندها
=============================================================================
 گلوگاه عکس‌دار کردن کاتالوگ، «نبودن عکس» نیست؛ «پیدا کردنش» است. عکس این
 محصولات وجود دارد — در کاتالوگ PDF خود سازنده. یک کاتالوگ می‌تواند ده‌ها
 عکس محصول داشته باشد.

 نکتهٔ کلیدی که این اسکریپت روی آن بنا شده: در کاتالوگ‌هایی که با InDesign
 ساخته می‌شوند، عکس محصولِ بریده به‌صورت یک تصویر به‌علاوهٔ یک «ماسک نرم»
 (SMask) ذخیره می‌شود. همان ماسک، هم عکس محصول را از عکس کارخانه و گواهی‌نامه
 جدا می‌کند و هم به ما یک PNG شفاف می‌دهد — که دقیقاً همان چیزی است که قاب
 نقشه‌کشی سایت می‌خواهد.

 پس صافی اصلی «تصویری که ماسک دارد» است، نه حدس زدن از روی اندازه یا رنگ.

 وابستگی: pymupdf — و روی اوبونتو ۲۴ باید در محیط مجازی نصب شود، چون
 نصب سیستمی با pip آنجا مسدود است (PEP 668):

     sudo apt install -y python3-venv
     python3 -m venv .venv-pdf
     .venv-pdf/bin/pip install pymupdf
     .venv-pdf/bin/python scripts/extract-catalog-photos.py …

 اجرا:
     .venv-pdf/bin/python scripts/extract-catalog-photos.py catalogs/*.pdf
     ... --out photos-raw          پوشهٔ خروجی (پیش‌فرض photos-raw)
     ... --plan photo-plan.json    نام‌گذاری خودکار بر اساس نقشهٔ خانواده‌ها

 خروجی: PNG شفاف + index.json که متنِ نزدیک هر عکس را دارد، تا اگر تطبیق
 خودکار نشد، آدم بتواند دستی تطبیق بدهد.

 هیچ چیزی را منتشر نمی‌کند؛ فقط فایل می‌سازد. تصمیم اینکه کدام عکس به کدام
 محصول برود با آدم است.
=============================================================================
"""
import argparse
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

try:
    import pymupdf
except ImportError:
    sys.exit(
        "\n✖ pymupdf نصب نیست.\n\n"
        "  روی اوبونتو ۲۴ نصب سیستمی با pip مسدود است، پس محیط مجازی بسازید:\n\n"
        "     sudo apt install -y python3-venv\n"
        "     python3 -m venv .venv-pdf\n"
        "     .venv-pdf/bin/pip install pymupdf\n\n"
        "  بعد به‌جای python3، از .venv-pdf/bin/python استفاده کنید:\n\n"
        "     .venv-pdf/bin/python scripts/extract-catalog-photos.py catalogs/*.pdf\n"
    )

# کوچک‌تر از این، آیکون است نه عکس محصول
MIN_PIXELS = 40_000

# حروف عربی به فارسی، و حذف نویسه‌های نامرئی — همان قاعدهٔ جست‌وجوی سایت
FOLD = str.maketrans({
    "ي": "ی", "ى": "ی", "ئ": "ی", "ك": "ک", "ة": "ه", "ۀ": "ه",
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ؤ": "و",
    "‌": " ", "‏": " ", "‎": " ", "ً": "", "ٌ": "",
    "ٍ": "", "َ": "", "ُ": "", "ِ": "", "ّ": "",
    "ْ": "", "ـ": "",
})


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFKC", text).translate(FOLD)
    return re.sub(r"\s+", " ", re.sub(r"[^\w\s]", " ", text)).strip().lower()


def nearby_text(page, rect, pad=90) -> str:
    """
    متن نزدیک تصویر — عنوان محصول تقریباً همیشه بالا یا زیر عکس است.

    از متن کل صفحه استفاده نمی‌شود چون صفحهٔ کاتالوگ چند محصول دارد و متنِ
    همه با هم، تطبیق را بی‌معنا می‌کند.
    """
    area = pymupdf.Rect(rect.x0 - pad, rect.y0 - pad, rect.x1 + pad, rect.y1 + pad)
    words = page.get_text("words", clip=area)
    return re.sub(r"\s+", " ", " ".join(w[4] for w in words)).strip()[:200]


def best_family(text: str, families: list[dict]) -> tuple[str, float]:
    """
    نزدیک‌ترین خانواده به متنِ کنار عکس، بر اساس واژه‌های مشترک.

    امتیاز نسبت واژه‌های مشترک به واژه‌های برچسب است، نه تعداد خام: وگرنه
    برچسب‌های بلند فقط به‌خاطر بلندی‌شان همیشه برنده می‌شدند.
    """
    words = set(normalize(text).split())
    best, score = "", 0.0
    for family in families:
        label = set(normalize(family["label"]).split())
        if not label:
            continue
        shared = len(words & label) / len(label)
        if shared > score:
            best, score = family["key"], shared
    return best, score


def main() -> None:
    parser = argparse.ArgumentParser(description="استخراج عکس محصول از کاتالوگ PDF")
    parser.add_argument("pdfs", nargs="+", help="فایل‌های PDF کاتالوگ")
    parser.add_argument("--out", default="photos-raw", help="پوشهٔ خروجی")
    parser.add_argument("--plan", help="photo-plan.json برای نام‌گذاری خودکار")
    parser.add_argument("--min-score", type=float, default=0.5,
                        help="کمینهٔ اطمینان تطبیق خودکار (۰ تا ۱)")
    args = parser.parse_args()

    families = []
    if args.plan:
        families = json.loads(Path(args.plan).read_text(encoding="utf8"))["families"]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)

    index, seen = [], set()
    matched = 0

    """
    مسیرها پیش از هر کاری بررسی می‌شوند.

    در نخستین استفادهٔ واقعی، متنِ نمونهٔ راهنما («مسیر/کاتالوگ.pdf») عیناً تایپ
    شد و اسکریپت با traceback پایتون افتاد — که به کسی که فقط می‌خواهد عکس
    بیرون بکشد هیچ نمی‌گوید. بررسی زودهنگام، پیام روشن می‌دهد و پیش از باز کردن
    هر فایلی متوقف می‌شود.
    """
    missing = [p for p in args.pdfs if not Path(p).is_file()]
    if missing:
        print("\n✖ این فایل‌ها پیدا نشدند:\n", file=sys.stderr)
        for path in missing:
            print(f"     {path}", file=sys.stderr)
        print(
            "\n  مسیر واقعی فایل PDF را بدهید، نه متن نمونه. مثلاً اگر کاتالوگ‌ها"
            "\n  را در پوشهٔ catalogs/ گذاشته‌اید:"
            "\n\n     .venv-pdf/bin/python scripts/extract-catalog-photos.py catalogs/*.pdf"
            "\n",
            file=sys.stderr,
        )
        sys.exit(1)

    for pdf_path in args.pdfs:
        source = Path(pdf_path)
        doc = pymupdf.open(source)
        for pno in range(doc.page_count):
            page = doc[pno]
            for info in page.get_images(full=True):
                xref, smask = info[0], info[1]
                # بدون ماسک یعنی عکس کارخانه، گواهی‌نامه یا پس‌زمینه — نه محصول
                if not smask:
                    continue
                try:
                    base = pymupdf.Pixmap(doc, xref)
                    if base.n - base.alpha > 3:      # CMYK و مانندش
                        base = pymupdf.Pixmap(pymupdf.csRGB, base)
                    pix = pymupdf.Pixmap(base, pymupdf.Pixmap(doc, smask))
                except Exception as error:           # noqa: BLE001
                    print(f"  ⚠ رد شد (ص{pno + 1}): {error}")
                    continue

                if pix.width * pix.height < MIN_PIXELS:
                    continue
                digest = hashlib.sha1(pix.samples).hexdigest()[:10]
                if digest in seen:                    # همان عکس در چند صفحه
                    continue
                seen.add(digest)

                text = nearby_text(page, page.get_image_rects(xref)[0]) \
                    if page.get_image_rects(xref) else ""

                name = f"{source.stem}-p{pno + 1:02d}-{digest}"
                key, score = ("", 0.0)
                if families:
                    key, score = best_family(text, families)
                    if score >= args.min_score:
                        # نام خانواده، با شمارهٔ ترتیبی تا دو عکس هم‌نام نشوند
                        name = key
                        matched += 1

                target = out / f"{name}.png"
                counter = 2
                while target.exists():
                    target = out / f"{name}--{counter}.png"
                    counter += 1
                pix.save(target)

                index.append({
                    "file": target.name, "source": source.name, "page": pno + 1,
                    "size": f"{pix.width}x{pix.height}",
                    "text": text, "family": key, "score": round(score, 2),
                })
        doc.close()

    (out / "index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=1), encoding="utf8")

    print(f"\n  {len(index)} عکس بریده استخراج شد → {out}/")
    if families:
        print(f"  {matched} تای آن‌ها خودکار به خانواده تطبیق داده شد"
              f" (اطمینان ≥ {args.min_score})")
        print(f"  بقیه با نام صفحه ذخیره شدند؛ index.json متنِ کنارشان را دارد.")
    print(f"\n  گام بعد: فایل‌ها را ببینید، نام‌های نادرست را درست کنید،")
    print(f"  به photos/ منتقلشان کنید و npm run photos:apply را بزنید.\n")


if __name__ == "__main__":
    main()

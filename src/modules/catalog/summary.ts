import { stripHtml, truncate } from "@/lib/utils";

/**
 * =============================================================================
 *  یک جملهٔ توصیفی برای هر محصول — بدون اینکه چیزی از خودمان بگوییم
 * =============================================================================
 *  متادیتای محصول تا امروز این زنجیره را داشت:
 *
 *      metaDescription ?? shortDescription ?? undefined
 *
 *  و `pageMetadata` وقتی `undefined` می‌گرفت، توضیحِ خودِ سایت را می‌گذاشت.
 *  نتیجه‌اش در کاتالوگ واقعی این بود که **۳۷۸ محصول از ۷۲۹** دقیقاً یک جملهٔ
 *  یکسان به‌عنوان meta description داشتند — همان جملهٔ «تأمین‌کنندهٔ تخصصی…».
 *  برای گوگل یعنی نیمی از کاتالوگ توضیح تکراری دارد، و برای کاربر یعنی هیچ
 *  صفحه‌ای در نتایج جست‌وجو دربارهٔ خودش حرفی نمی‌زند.
 *
 *  دو حفره در آن زنجیره بود:
 *    ۱. ستون `description` اصلاً خوانده نمی‌شد — حتی محصولی که توضیح داشت
 *       هم اگر shortDescription نداشت، به همان جملهٔ عمومی می‌افتاد.
 *    ۲. برای محصولی که هیچ متنی ندارد هیچ راه دیگری امتحان نمی‌شد، در حالی
 *       که نام و دسته و برند و مدل و مشخصات فنی‌اش در همان ردیف نشسته بود.
 *
 *  قاعده — و این قاعده مذاکره‌پذیر نیست: **هیچ ادعای تازه‌ای ساخته نمی‌شود.**
 *  جملهٔ خودکار فقط داده‌ای را کنار هم می‌گذارد که در پایگاه داده هست و روی
 *  خود صفحه هم دیده می‌شود. نه کاربرد حدس زده می‌شود، نه کیفیت، نه گارانتی،
 *  نه «بهترین» و «باکیفیت». اگر داده‌ای نباشد، گفته نمی‌شود.
 *
 *  همین یک تابع هم متادیتا را می‌سازد و هم توضیحِ داده ساختاریافته را، تا آن
 *  دو هیچ‌وقت از هم و از صفحه جدا نیفتند.
 * =============================================================================
 */

/** طول هدف: چیزی که گوگل کامل نشان می‌دهد، نه بیشتر */
const TARGET = 155;
/** بیش از این تعداد مشخصه، جمله را به فهرست بی‌ربط تبدیل می‌کند */
const MAX_SPECS = 3;

export type SummaryInput = {
  product: {
    name: string;
    model?: string | null;
    metaDescription?: string | null;
    shortDescription?: string | null;
    description?: string | null;
  };
  category?: { name: string } | null;
  brand?: { name: string } | null;
  specs?: readonly {
    label: string;
    value?: string | null;
    valueNumber?: string | number | null;
    unit?: string | null;
  }[];
};

/** متن نوشته‌شده به دست آدم، اگر هست */
function authored(product: SummaryInput["product"]): string | null {
  for (const candidate of [product.metaDescription, product.shortDescription, product.description]) {
    const text = stripHtml(candidate ?? "").trim();
    if (text) return text;
  }
  return null;
}

/**
 * مشخصه را به «برچسب: مقدار واحد» تبدیل می‌کند.
 *
 * مقدار عددی و مقدار متنی هر دو ممکن است پر باشند؛ عددی مقدم است چون واحد
 * تایپ‌دار به آن می‌چسبد. مشخصهٔ بی‌مقدار کنار گذاشته می‌شود — «وزن:» بدون عدد
 * چیزی به کسی نمی‌گوید.
 */
function specPhrase(spec: NonNullable<SummaryInput["specs"]>[number]): string | null {
  const raw = spec.valueNumber ?? spec.value;
  const value = raw === null || raw === undefined ? "" : String(raw).trim();
  if (!value) return null;
  const label = spec.label.trim();
  if (!label) return null;
  const unit = spec.unit?.trim();
  return unit ? `${label} ${value} ${unit}` : `${label} ${value}`;
}

/**
 * توضیح محصول برای متادیتا و داده ساختاریافته.
 *
 * `null` یعنی حتی یک واقعیت هم برای گفتن نبود — که با نامِ اجباریِ محصول و
 * دستهٔ اجباری‌اش عملاً پیش نمی‌آید، ولی فراخوان باید برایش آماده باشد و
 * ترجیحاً چیزی نگوید تا اینکه حرف عمومی بزند.
 */
export function productSummary(input: SummaryInput): string | null {
  const written = authored(input.product);
  if (written) return truncate(written, 300);

  const name = input.product.name.trim();
  if (!name) return null;

  /*
    ترتیب عمدی است: اول اینکه این چیست و کجای کاتالوگ است، بعد اینکه مالِ کدام
    سازنده است، و آخر مشخصاتی که یک محصول را از هم‌خانواده‌اش جدا می‌کند —
    همان چیزی که کاربر در نتیجهٔ جست‌وجو دنبالش می‌گردد.
  */
  const head: string[] = [name];
  const category = input.category?.name?.trim();
  if (category && !name.includes(category)) head.push(`در دستهٔ ${category}`);

  const brand = input.brand?.name?.trim();
  if (brand && !name.includes(brand)) head.push(`برند ${brand}`);

  const model = input.product.model?.trim();
  if (model && !name.includes(model)) head.push(`مدل ${model}`);

  const facts: string[] = [];
  for (const spec of input.specs ?? []) {
    if (facts.length >= MAX_SPECS) break;
    const phrase = specPhrase(spec);
    if (phrase) facts.push(phrase);
  }

  const sentence = facts.length > 0 ? `${head.join(" · ")}. ${facts.join(" · ")}.` : `${head.join(" · ")}.`;
  return truncate(sentence, TARGET);
}

/**
 * عنوان محصول برای متادیتا.
 *
 * دو محصول واقعاً متفاوت در کاتالوگ هم‌نام بودند — «ست کنترل با درجه و پریز»
 * از برند وتو، یکی مدل DSK-2.2 و دیگری DSK-8.2. نه تکراری‌اند که حذف شوند و
 * نه قابل تشخیص، چون تنها چیزی که از هم جداشان می‌کند در `name` نیامده بود.
 *
 * مدل، همان تفاوت است و همان چیزی است که خریدار صنعتی با آن جست‌وجو می‌کند.
 * پس هر جا مدلی ثبت شده و در نام تکرار نشده، به عنوان اضافه می‌شود. عنوانِ
 * دست‌نویسِ مدیر همیشه مقدم است و دست نمی‌خورد.
 *
 * `slug` عوض نمی‌شود — نشانی محصول همان می‌ماند که بود.
 */
export function productTitle(product: {
  name: string;
  model?: string | null;
  metaTitle?: string | null;
}): string {
  const authored = product.metaTitle?.trim();
  if (authored) return authored;

  const name = product.name.trim();
  const model = product.model?.trim();
  if (!model || name.includes(model)) return name;
  return `${name} ${model}`;
}

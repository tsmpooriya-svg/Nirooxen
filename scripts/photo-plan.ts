/**
 * =============================================================================
 *  نقشهٔ عکس محصولات
 * =============================================================================
 *  مسئله این نیست که برای ۸۰۰ محصول ۸۰۰ عکس پیدا کنیم. آن ۸۰۰ محصول، ۸۰۰ چیز
 *  متفاوت نیستند: «پمپ شناور پمپیران UQH 205/9» و بیست خواهر و برادرش که فقط
 *  در سایز و توان فرق دارند، یک عکس دارند.
 *
 *  این اسکریپت کاتالوگ را به خانواده می‌شکند و می‌گوید هر خانواده چند محصول
 *  دارد. خروجی مهمش همان ستون «پوشش تجمعی» است: معمولاً چند ده خانواده بیشترِ
 *  کاتالوگ را می‌پوشانند، و کار از «۸۰۰ عکس» به «۵۰ عکس» کوچک می‌شود.
 *
 *  چیزی را تغییر نمی‌دهد؛ فقط می‌خواند و یک فایل نقشه می‌نویسد.
 *
 *  اجرا:
 *      npm run photos:plan
 *
 *  خروجی: photo-plan.json — **قابل ویرایش با دست**. خانواده‌بندی خودکار هیچ‌وقت
 *  کامل نیست؛ پیش از اینکه یک عکس به بیست محصول بچسبد، آدم باید نگاهش کند.
 * =============================================================================
 */
import "dotenv/config";

import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";

import { Client } from "pg";

type Row = {
  id: string;
  name: string;
  model: string | null;
  brand: string | null;
  category: string;
  has_photo: boolean;
};

/** واژه‌هایی که چیزی دربارهٔ «کدام مدل» نمی‌گویند و در کلید خانواده نمی‌آیند */
const NOISE = new Set([
  "مدل", "اینچ", "سایز", "تک", "فاز", "سه", "بار", "ولت", "وات", "کیلووات",
  "اسب", "بخار", "لیتری", "لیتر", "متر", "میلی", "سانتی", "قطر", "نوع",
  "با", "و", "از", "در", "به", "برای",
]);

const faDigits = /[۰-۹٠-٩]/g;
const toEn = (s: string) => s.replace(faDigits, (d) => String("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(d) % 10));

/**
 * ریشهٔ مدل: «UQH 205/9» → «UQH»، «CM 5-4» → «CM».
 *
 * عدد است که نسخه‌های یک خانواده را از هم جدا می‌کند، پس عدد همان چیزی است که
 * باید برود.
 */
function modelStem(model: string | null): string {
  if (!model) return "";
  const head = toEn(model)
    .replace(/[0-9]+([./-][0-9]+)*/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(" ");
  return head;
}

/** وقتی مدل نیست: چند واژهٔ معنادار اول نام */
function nameStem(name: string): string {
  return toEn(name)
    .replace(/[0-9]+([./-][0-9]+)*/g, " ")
    .replace(/[^\p{L}\p{N} ]+/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !NOISE.has(w))
    .slice(0, 3)
    .join(" ");
}

/**
 * کلید خانواده — نام فایلی که عکس با آن ذخیره می‌شود.
 *
 * دو شرط دارد و هر دو از تجربهٔ عملی می‌آیند:
 *
 *   • **لاتین باشد.** کلید فارسی یعنی نام فایل فارسی، و آن روی ویندوز و در
 *     خط فرمان دردسر است.
 *   • **پایدار باشد.** اگر کلید شمارهٔ ردیف بود، با اضافه شدن یک محصول کل
 *     شماره‌ها جابه‌جا می‌شدند و عکس‌هایی که از قبل نام‌گذاری شده بودند به
 *     خانوادهٔ اشتباه می‌چسبیدند. پس از خودِ برچسب ساخته می‌شود، نه از ترتیب.
 *
 *  بخش لاتینِ ریشهٔ مدل جلو می‌آید تا کلید خواندنی بماند («uqh-a3f1c2»)، و
 *  درهم کوتاه ته آن، دو خانواده با ریشهٔ یکسان را از هم جدا می‌کند.
 */
function familyKey(label: string, stem: string): string {
  const latin = stem
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 16);
  const hash = createHash("sha1").update(label).digest("hex").slice(0, 6);
  return latin ? `${latin}-${hash}` : hash;
}

function familyOf(row: Row): { key: string; label: string } {
  const stem = modelStem(row.model) || nameStem(row.name);
  const parts = [row.brand ?? "بی‌برند", row.category, stem].filter(Boolean);
  const label = parts.join(" · ");
  return { key: familyKey(label, stem), label };
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<Row>(`
    select p.id, p.name, p.model, b.name as brand, c.name as category,
           exists (
             select 1 from product_images i
              where i.product_id = p.id
                and i.url not like '%.svg'
           ) as has_photo
      from products p
      join categories c on c.id = p.category_id
      left join brands b on b.id = p.brand_id
     order by p.name`);

  const families = new Map<
    string,
    { key: string; label: string; products: { id: string; name: string }[]; withPhoto: number }
  >();

  for (const row of rows) {
    const { key, label } = familyOf(row);
    const entry = families.get(key) ?? { key, label, products: [], withPhoto: 0 };
    entry.products.push({ id: row.id, name: row.name });
    if (row.has_photo) entry.withPhoto += 1;
    families.set(key, entry);
  }

  const sorted = [...families.values()].sort((a, b) => b.products.length - a.products.length);
  const totalProducts = rows.length;
  const missing = rows.filter((r) => !r.has_photo).length;

  console.log(`\n── نقشهٔ عکس ──\n`);
  console.log(`  ${totalProducts} محصول · ${missing} بدون عکس واقعی · ${sorted.length} خانواده\n`);

  console.log("  پرجمعیت‌ترین خانواده‌ها:\n");
  console.log("     محصول  بی‌عکس  پوشش   نام فایل عکس          خانواده");
  let cumulative = 0;
  for (const family of sorted.slice(0, 30)) {
    cumulative += family.products.length;
    const share = ((cumulative / totalProducts) * 100).toFixed(0);
    console.log(
      `     ${String(family.products.length).padStart(5)}` +
        `  ${String(family.products.length - family.withPhoto).padStart(5)}` +
        `  ${(share + "٪").padStart(5)}   ${(family.key + ".jpg").padEnd(20)}  ${family.label}`,
    );
  }

  /*
    همان عددی که ارزش کل این اسکریپت است: با چند عکس، چه بخشی از کاتالوگ
    پوشانده می‌شود.
  */
  console.log("\n  برای پوشاندن کاتالوگ چند عکس لازم است:\n");
  for (const target of [0.5, 0.8, 0.9, 1]) {
    let sum = 0;
    let count = 0;
    for (const family of sorted) {
      if (sum / totalProducts >= target) break;
      sum += family.products.length;
      count += 1;
    }
    console.log(`     ${String(count).padStart(4)} عکس  →  ${(target * 100).toFixed(0)}٪ محصولات`);
  }

  const plan = {
    generatedAt: new Date().toISOString(),
    totalProducts,
    families: sorted.map((f) => ({
      key: f.key,
      label: f.label,
      productCount: f.products.length,
      withPhoto: f.withPhoto,
      /* برای اینکه هنگام بازبینی معلوم باشد این خانواده واقعاً یک چیز است */
      samples: f.products.slice(0, 3).map((p) => p.name),
      productIds: f.products.map((p) => p.id),
    })),
  };

  writeFileSync("photo-plan.json", JSON.stringify(plan, null, 2), "utf8");

  console.log(`\n  ✓ photo-plan.json نوشته شد\n`);
  console.log(`  گام بعد: برای هر خانواده یک عکس در پوشهٔ photos/ بگذارید،`);
  console.log(`  با همان نامی که در ستون «نام فایل عکس» آمده.\n`);
  console.log(`  بعد:  npm run photos:apply          (پیش‌نمایش)`);
  console.log(`        npm run photos:apply -- --apply\n`);

  await client.end();
}

main().catch((error) => {
  console.error("\n✖ خطا:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

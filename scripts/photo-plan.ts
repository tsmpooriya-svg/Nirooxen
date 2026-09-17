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

/**
 * واژه‌هایی که چیزی دربارهٔ «کدام مدل» نمی‌گویند و در کلید خانواده نمی‌آیند.
 *
 * عددهای حروفی اینجا مهم‌ترین‌اند. در نخستین اجرای واقعی، «کفکش فلوتر راین» و
 * «کفکش فلوتر دو» دو خانوادهٔ جدا شدند — فقط چون نام یکی سایز را با حرف نوشته
 * بود («دو اینچ») و دیگری نه. یک خانواده بودند و دو عکس می‌خواستند.
 */
const NOISE = new Set([
  "مدل", "اینچ", "اینچی", "سایز", "تک", "فاز", "بار", "ولت", "وات", "کیلووات",
  "اسب", "بخار", "لیتری", "لیتر", "متر", "متری", "میلی", "سانتی", "قطر", "نوع",
  "کیلو", "کیلویی", "گرم", "گرمی", "کیلوگرم", "عدد", "عددی", "دستگاه",
  // عدد حروفی: همان چیزی که نسخه‌های یک خانواده را از هم جدا می‌کند
  "نیم", "یک", "دو", "سه", "چهار", "پنج", "شش", "هفت", "هشت", "نه", "ده",
  "یازده", "دوازده", "پانزده", "بیست", "سی", "چهل", "پنجاه", "صد",
  "با", "و", "از", "در", "به", "برای", "جهت",
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

function familyOf(row: Row): { key: string; label: string; stem: string; category: string } {
  const stem = modelStem(row.model) || nameStem(row.name);
  const parts = [row.brand ?? "بی‌برند", row.category, stem].filter(Boolean);
  const label = parts.join(" · ");
  return { key: familyKey(label, stem), label, stem, category: row.category };
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
    {
      key: string;
      label: string;
      stem: string;
      category: string;
      brand: string;
      products: { id: string; name: string }[];
      withPhoto: number;
    }
  >();

  for (const row of rows) {
    const { key, label, stem, category } = familyOf(row);
    const entry = families.get(key) ?? {
      key,
      label,
      stem,
      category,
      brand: row.brand ?? "بی‌برند",
      products: [],
      withPhoto: 0,
    };
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

  /*
    نامزدهای ادغام: خانواده‌هایی که دسته و ریشهٔ یکسان دارند و فقط برندشان فرق
    می‌کند — «موتور برق بنزینی» ویگو و پارامونت و ناکایو، یا «کفکش فلوتر» پنج
    برند ایرانی. اگر ظاهرشان نزدیک باشد، یک عکس هر چند تا را می‌پوشاند و این
    بزرگ‌ترین صرفه‌جویی ممکن در کل کار است.

    تصمیمش با آدم است، نه اسکریپت: دو برند از یک قلم گاهی یک ریخته‌گری با
    برچسب متفاوت‌اند و گاهی واقعاً فرق دارند. اینجا فقط نشان داده می‌شود که
    کجا ارزش نگاه کردن دارد و چقدر صرفه دارد.
  */
  const byShape = new Map<string, typeof sorted>();
  for (const family of sorted) {
    if (!family.stem) continue;
    const shape = `${family.category}|${family.stem}`;
    byShape.set(shape, [...(byShape.get(shape) ?? []), family]);
  }
  const candidates = [...byShape.values()]
    .filter((group) => group.length > 1)
    .map((group) => ({
      group,
      products: group.reduce((n, f) => n + f.products.length, 0),
      saved: group.length - 1,
    }))
    .sort((a, b) => b.products - a.products)
    .slice(0, 12);

  if (candidates.length > 0) {
    console.log("\n  ── جای ادغام: یک قلم، چند برند ──");
    console.log("  اگر ظاهرشان نزدیک است، در photo-plan.json فیلد photo همه را یک نام بگذارید.\n");
    console.log("     محصول  عکسِ صرفه‌جویی   قلم");
    for (const c of candidates) {
      console.log(
        `     ${String(c.products).padStart(5)}  ${String(c.saved).padStart(12)}   ` +
          `${c.group[0]!.category} · ${c.group[0]!.stem}`,
      );
      console.log(`            ${c.group.map((f) => f.brand).join("، ")}`);
    }
    const totalSaved = candidates.reduce((n, c) => n + c.saved, 0);
    console.log(`\n     جمعاً ${totalSaved} عکس کمتر، اگر همه را ادغام کنید.\n`);
  }

  const tail = sorted.filter((f) => f.products.length <= 2);
  console.log(
    `\n  دمِ فهرست: ${tail.length} خانواده با یک یا دو محصول` +
      ` (${tail.reduce((n, f) => n + f.products.length, 0)} محصول).` +
      `\n  اگر دو خانواده در عمل یک عکس دارند، در photo-plan.json فیلد photo` +
      `\n  هر دو را یک نام بگذارید — لازم نیست فایل را دو بار کپی کنید.\n`,
  );

  const plan = {
    generatedAt: new Date().toISOString(),
    totalProducts,
    /*
      `photo` جای دستکاری دستی است: اگر دو خانواده در عمل یک عکس دارند، به‌جای
      کپی کردن فایل زیر دو نام، در هر دو ردیف همان یک نام فایل نوشته می‌شود.
      خالی یعنی «از key استفاده کن».
    */
    families: sorted.map((f) => ({
      key: f.key,
      photo: "",
      label: f.label,
      brand: f.brand,
      stem: f.stem,
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

/**
 * =============================================================================
 *  سنجش متادیتای کاتالوگ
 * =============================================================================
 *  همان زنجیره‌ای را که صفحهٔ محصول برای ساخت عنوان و توضیح طی می‌کند، برای
 *  تک‌تک محصولات منتشرشده اجرا می‌کند و می‌گوید نتیجه چقدر یکتاست.
 *
 *  چرا اسکریپت و نه نگاه کردن: با ۸۰۰ محصول، «توضیح‌ها تکراری‌اند» یک حدس
 *  است تا وقتی شمرده نشود. این اسکریپت عدد می‌دهد، و بعد از هر تغییر دوباره
 *  همان عدد را می‌دهد.
 *
 *  چیزی را تغییر نمی‌دهد؛ فقط می‌خواند.
 *
 *  اجرا:
 *      npm run audit:seo
 *      npm run audit:seo -- --json     برای مقایسهٔ ماشینی پیش و پس
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

import { siteConfig } from "../src/config/site";
import { productSummary, productTitle } from "../src/modules/catalog/summary";

const JSON_OUT = process.argv.includes("--json");

/** توضیحی که گوگل کامل نشان می‌دهد، تقریباً در همین حدود تمام می‌شود */
const DESC_SHORT = 70;
const TITLE_SHORT = 30;
const TITLE_LONG = 65;

type Row = {
  id: string;
  slug: string;
  name: string;
  model: string | null;
  meta_title: string | null;
  meta_description: string | null;
  short_description: string | null;
  description: string | null;
  category_name: string;
  brand_name: string | null;
};

type Spec = { product_id: string; label: string; value: string | null; value_num: string | null; unit: string | null };

function tally(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return counts;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query<Row>(`
    select p.id, p.slug, p.name, p.model, p.meta_title, p.meta_description,
           p.short_description, p.description,
           c.name as category_name, b.name as brand_name
      from products p
      join categories c on c.id = p.category_id
      left join brands b on b.id = p.brand_id
     where p.status = 'PUBLISHED'
     order by p.name`);

  /* مشخصات با همان ترتیب و همان واحدِ تایپ‌دارِ صفحهٔ محصول */
  const { rows: specRows } = await client.query<Spec>(`
    select s.product_id, s.label, s.value, s.value_num,
           coalesce(u.symbol, u.label, s.unit) as unit
      from product_specs s
      left join units u on u.id = s.unit_id
     order by s.position asc`);

  const specsByProduct = new Map<string, Spec[]>();
  for (const spec of specRows) {
    const list = specsByProduct.get(spec.product_id) ?? [];
    list.push(spec);
    specsByProduct.set(spec.product_id, list);
  }

  const titles: string[] = [];
  const descriptions: string[] = [];
  let boilerplate = 0;
  let derived = 0;
  let shortDesc = 0;
  let shortTitle = 0;
  let longTitle = 0;

  for (const row of rows) {
    const title = productTitle({ name: row.name, model: row.model, metaTitle: row.meta_title });
    titles.push(title);
    if (title.length < TITLE_SHORT) shortTitle += 1;
    if (title.length > TITLE_LONG) longTitle += 1;

    const authored = row.meta_description ?? row.short_description ?? row.description;
    const summary = productSummary({
      product: {
        name: row.name,
        model: row.model,
        metaDescription: row.meta_description,
        shortDescription: row.short_description,
        description: row.description,
      },
      category: { name: row.category_name },
      brand: row.brand_name ? { name: row.brand_name } : null,
      specs: (specsByProduct.get(row.id) ?? []).map((s) => ({
        label: s.label,
        value: s.value,
        valueNumber: s.value_num,
        unit: s.unit,
      })),
    });

    const effective = summary ?? siteConfig.description;
    descriptions.push(effective);
    if (effective === siteConfig.description) boilerplate += 1;
    if (!authored && summary) derived += 1;
    if (effective.length < DESC_SHORT) shortDesc += 1;
  }

  const titleCounts = tally(titles);
  const descCounts = tally(descriptions);
  const dupTitles = [...titleCounts.entries()].filter(([, n]) => n > 1);
  const dupDescs = [...descCounts.entries()].filter(([, n]) => n > 1);

  const report = {
    products: rows.length,
    titles: {
      unique: titleCounts.size,
      duplicated: dupTitles.length,
      duplicatedProducts: dupTitles.reduce((sum, [, n]) => sum + n, 0),
      shorterThan: { [TITLE_SHORT]: shortTitle },
      longerThan: { [TITLE_LONG]: longTitle },
    },
    descriptions: {
      unique: descCounts.size,
      duplicated: dupDescs.length,
      duplicatedProducts: dupDescs.reduce((sum, [, n]) => sum + n, 0),
      siteBoilerplate: boilerplate,
      derivedFromData: derived,
      shorterThan: { [DESC_SHORT]: shortDesc },
    },
  };

  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    const line = (label: string, value: number | string) =>
      console.log(`  ${label.padEnd(34, "·")} ${value}`);
    console.log("\n── متادیتای محصولات ──\n");
    line("محصول منتشرشده", report.products);
    console.log("\n  عنوان");
    line("یکتا", report.titles.unique);
    line("تکراری (گروه / محصول)", `${report.titles.duplicated} / ${report.titles.duplicatedProducts}`);
    line(`کوتاه‌تر از ${TITLE_SHORT} نویسه`, shortTitle);
    line(`بلندتر از ${TITLE_LONG} نویسه`, longTitle);
    console.log("\n  توضیح");
    line("یکتا", report.descriptions.unique);
    line("تکراری (گروه / محصول)", `${report.descriptions.duplicated} / ${report.descriptions.duplicatedProducts}`);
    line("افتاده به توضیح عمومی سایت", boilerplate);
    line("ساخته‌شده از دادهٔ خود محصول", derived);
    line(`کوتاه‌تر از ${DESC_SHORT} نویسه`, shortDesc);

    if (dupTitles.length > 0) {
      console.log("\n  عنوان‌های تکراری");
      for (const [title, n] of dupTitles.slice(0, 10)) console.log(`    ${n}×  ${title}`);
    }
    if (dupDescs.length > 0) {
      console.log("\n  توضیح‌های تکراری");
      for (const [desc, n] of dupDescs.slice(0, 5)) console.log(`    ${n}×  ${desc.slice(0, 70)}…`);
    }
    console.log();
  }

  await client.end();
}

void main();

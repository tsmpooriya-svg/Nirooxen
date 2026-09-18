/**
 * =============================================================================
 *  جدا کردن توضیح محصولاتی که هم‌متن شده‌اند
 * =============================================================================
 *  ۶۹ محصول، توضیح کوتاهشان با دستِ‌کم یک محصول دیگر مو به مو یکی است. نمونه:
 *
 *      اسپرینکلر بغل‌زن واکنش سریع ۱/۲ اینچ ۶۸ درجه
 *      اسپرینکلر بغل‌زن واکنش سریع ۱/۲ اینچ ۶۸ درجه بدون تأییدیه
 *
 *  هر دو «اسپرینکلر بغل‌زن با واکنش سریع، سایز ۱/۲ اینچ و دمای فعال‌سازی ۶۸
 *  درجه» دارند. تفاوتشان واقعی و ثبت‌شده است — مشخصهٔ «تأییدیه» یکی دارد و
 *  دیگری ندارد — فقط در متن نیامده.
 *
 *  قاعده، همان قاعدهٔ همیشه: **هیچ حرف تازه‌ای زده نمی‌شود.** فقط مشخصه‌ای که
 *  همین حالا در پایگاه داده هست و اعضای گروه را از هم جدا می‌کند، به ته جمله
 *  اضافه می‌شود. گروهی که چنین مشخصه‌ای نداشته باشد دست‌نخورده می‌ماند و در
 *  گزارش می‌آید تا آدم خودش نگاهش کند.
 *
 *  اجرا:
 *      node scripts/distinguish-descriptions.mjs            پیش‌نمایش
 *      node scripts/distinguish-descriptions.mjs --apply    اعمال
 * =============================================================================
 */
import "dotenv/config";

import { Client } from "pg";

const APPLY = process.argv.includes("--apply");

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

/* متن فعلیِ هر محصول، برای بی‌اثر بودنِ اجرای دوباره */
const { rows: textRows } = await client.query(
  `select id, coalesce(short_description,'') as short, coalesce(meta_description,'') as meta
     from products where status = 'PUBLISHED'`,
);
const currentText = new Map(textRows.map((r) => [r.id, { short: r.short, meta: r.meta }]));

const { rows: dupes } = await client.query(`
  select short_description, array_agg(id) as ids, count(*) as n
    from products
   where status = 'PUBLISHED' and coalesce(short_description,'') <> ''
   group by short_description
  having count(*) > 1
   order by count(*) desc`);

const { rows: specRows } = await client.query(`
  select s.product_id, s.label,
         coalesce(s.value, s.value_num::text, '') as value,
         coalesce(u.symbol, u.label, s.unit, '') as unit
    from product_specs s
    left join units u on u.id = s.unit_id
   order by s.position asc`);

const specsOf = new Map();
for (const row of specRows) {
  const list = specsOf.get(row.product_id) ?? [];
  list.push(row);
  specsOf.set(row.product_id, list);
}

console.log(`\n${APPLY ? "── اصلاح توضیح ──" : "── پیش‌نمایش (چیزی نوشته نشد) ──"}\n`);
console.log(`  ${dupes.length} گروه هم‌متن · ${dupes.reduce((s, d) => s + Number(d.n), 0)} محصول\n`);

let fixed = 0;
const unresolved = [];

for (const group of dupes) {
  /*
    مشخصهٔ جداکننده: برچسبی که همهٔ اعضای گروه دارند و مقدارش برای همه یکسان
    نیست. اگر چند تا باشد، اولی به ترتیبِ نمایش برداشته می‌شود — همان ترتیبی
    که روی صفحهٔ محصول هم دیده می‌شود.
  */
  const labels = new Map();
  for (const id of group.ids) {
    for (const spec of specsOf.get(id) ?? []) {
      if (!spec.value) continue;
      const seen = labels.get(spec.label) ?? new Map();
      /* واحد همراه مقدار می‌آید — «قطر: ۱۸۸» بدون واحد ابهام دارد */
      seen.set(id, spec.unit ? `${spec.value} ${spec.unit}` : spec.value);
      labels.set(spec.label, seen);
    }
  }

  const discriminator = [...labels.entries()].find(([, byProduct]) => {
    if (byProduct.size !== group.ids.length) return false;
    return new Set(byProduct.values()).size === group.ids.length;
  });

  if (!discriminator) {
    unresolved.push(group);
    continue;
  }

  const [label, byProduct] = discriminator;
  for (const id of group.ids) {
    const suffix = `، ${label}: ${byProduct.get(id)}`;
    const current = currentText.get(id) ?? { short: "", meta: "" };

    // بار دوم اجرا، پسوند را دوباره نمی‌چسباند
    const already = current.short.endsWith(suffix);
    /* متن پیش از پسوند — مبنای مقایسه با meta_description */
    const base = already ? current.short.slice(0, -suffix.length) : current.short;
    const nextShort = base + suffix;

    /*
      meta_description هم باید برود، وگرنه کار نیمه‌کاره است.

      در زنجیرهٔ توضیح، meta_description مقدم بر short_description است. بیشترِ
      این محصولات یک meta_description دارند که کپیِ همان short_description
      قدیمی است — یعنی مشتق شده، نه نوشته‌شده به دست آدم. آن‌ها همراه می‌روند.
      اگر کسی متن جداگانه‌ای نوشته باشد، دست نمی‌خورد.
    */
    const metaFollows = current.meta === "" || current.meta === base || current.meta === nextShort;
    const needsWrite = !already || (metaFollows && current.meta !== nextShort);

    if (APPLY && needsWrite) {
      await client.query(
        `update products
            set short_description = $1,
                meta_description  = case when $3 then $1 else meta_description end,
                updated_at        = now()
          where id = $2`,
        [nextShort, id, metaFollows],
      );
    }
    fixed += 1;
  }
  if (fixed <= 6) {
    console.log(`  «${label}» گروه ${group.n}تایی را جدا می‌کند:`);
    for (const id of group.ids) console.log(`     …${group.short_description.slice(-34)}، ${label}: ${byProduct.get(id)}`);
  }
}

/*
  گذر دوم: meta_description ای که نسخهٔ کهنهٔ short_description است.

  در زنجیرهٔ توضیح، meta_description مقدم است. اگر گذر اول پسوند را به
  short_description چسبانده باشد ولی meta همان متن قدیمی مانده باشد، چیزی که
  گوگل می‌بیند هنوز تکراری است. شرط عمداً تنگ است — فقط وقتی meta دقیقاً
  پیشوندِ short باشد، یعنی از روی همان ساخته شده و به دست کسی نوشته نشده.
*/
const { rows: stale } = await client.query(
  `select id, name, meta_description, short_description
     from products
    where status = 'PUBLISHED'
      and coalesce(meta_description,'') <> ''
      and coalesce(short_description,'') <> ''
      and meta_description <> short_description
      and short_description like meta_description || '%'`,
);

console.log(`\n  meta_description کهنه········· ${stale.length}`);
for (const row of stale.slice(0, 3)) {
  console.log(`     ${row.name.slice(0, 34)}  →  …${row.short_description.slice(-38)}`);
}
if (APPLY && stale.length > 0) {
  await client.query(
    `update products set meta_description = short_description, updated_at = now()
      where id = any($1::uuid[])`,
    [stale.map((row) => row.id)],
  );
}

console.log(`\n  محصول اصلاح‌شده··············· ${fixed}`);
console.log(`  گروه بدون مشخصهٔ جداکننده····· ${unresolved.length}`);
for (const group of unresolved.slice(0, 5)) {
  console.log(`     ${group.n}×  ${group.short_description.slice(0, 64)}…`);
}
console.log(APPLY ? "" : "\n  برای اجرای واقعی:  node scripts/distinguish-descriptions.mjs --apply\n");

await client.end();

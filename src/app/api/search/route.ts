import { and, desc, eq, or, sql, type AnyColumn, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { brands, categories, products } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { toEnDigits } from "@/lib/utils";
import { searchQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

const ZWNJ_CODEPOINT = 8204;
const MAX_TOKENS = 6;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
const LATIN_DIGITS = "01234567890123456789";

/** %  _  \ در ILIKE معنی دارند؛ ورودی کاربر باید متن ساده بماند نه الگو */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function normalizeSearchText(value: string): string {
  return toEnDigits(value).replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function tokenize(value: string): string[] {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_TOKENS);
}

function normalizedColumn(column: AnyColumn): SQL {
  return sql`translate(replace(coalesce(${column}, ''), chr(${ZWNJ_CODEPOINT}), ''), ${PERSIAN_DIGITS}, ${LATIN_DIGITS})`;
}

/** جستجوی سریع برای دیالوگ Ctrl+K — حداکثر ۸ نتیجه */
export async function GET(request: Request) {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  if (!rateLimit(`search:${ip}`, RATE_LIMITS.search).success) {
    return NextResponse.json({ items: [] }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = searchQuerySchema.safeParse(searchParams.get("q") ?? "");

  if (!parsed.success) return NextResponse.json({ items: [] });

  const tokens = tokenize(parsed.data);

  if (tokens.length === 0) return NextResponse.json({ items: [] });

  const searchableColumns: AnyColumn[] = [
    products.name,
    products.model,
    products.sku,
    products.shortDescription,
    categories.name,
    brands.name,
    brands.latinName,
  ];

  const tokenConditions = tokens.map((token) => {
    const pattern = `%${escapeLikePattern(token)}%`;
    return or(
      ...searchableColumns.map((column) => sql`${normalizedColumn(column)} ilike ${pattern}`),
    ) as SQL;
  });

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      model: products.model,
      price: products.price,
      priceMode: products.priceMode,
      categoryName: categories.name,
      brandName: brands.name,
      imageUrl: sql<string | null>`(
        select pi.url from product_images pi
        where pi.product_id = products.id
        order by pi.is_primary desc, pi.position asc limit 1
      )`,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.status, "PUBLISHED"), ...tokenConditions))
    .orderBy(desc(products.isFeatured), desc(products.viewCount))
    .limit(8);

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}

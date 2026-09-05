import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { brands, categories, products } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { searchQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** %  _  \ در ILIKE معنی دارند؛ ورودی کاربر باید متن ساده بماند نه الگو */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
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

  const term = `%${escapeLikePattern(parsed.data)}%`;

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
    .where(
      and(
        eq(products.status, "PUBLISHED"),
        or(
          ilike(products.name, term),
          ilike(products.model, term),
          ilike(products.sku, term),
          ilike(products.shortDescription, term),
          ilike(categories.name, term),
          ilike(brands.name, term),
        ),
      ),
    )
    .orderBy(desc(products.isFeatured), desc(products.viewCount))
    .limit(8);

  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}

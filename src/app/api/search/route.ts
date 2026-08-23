import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { brands, categories, products } from "@/db/schema";

export const dynamic = "force-dynamic";

/** جستجوی سریع برای دیالوگ Ctrl+K — حداکثر ۸ نتیجه */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) return NextResponse.json({ items: [] });

  const term = `%${q}%`;

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

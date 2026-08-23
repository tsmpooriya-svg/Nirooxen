/**
 * =============================================================================
 *  ماژول کاتالوگ — لایه خواندن داده
 * =============================================================================
 *  تمام کوئری‌های محصول/دسته‌بندی/برند اینجا متمرکز شده‌اند. صفحات هرگز
 *  مستقیم با db کار نمی‌کنند؛ این مرز باعث می‌شود جایگزینی منبع داده
 *  (کش، سرویس جدا، ORM دیگر) بدون دست‌زدن به UI ممکن باشد.
 * =============================================================================
 */
import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import {
  brands,
  categories,
  categorySpecs,
  productImages,
  productSpecs,
  products,
  specDefinitions,
  units,
  type Brand,
  type Category,
  type PriceMode,
  type Product,
  type SpecDataType,
  type SpecFilterUi,
  type StockStatus,
} from "@/db/schema";
import { PAGE_SIZE, type SortOption } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  انواع خروجی                                                                */
/* -------------------------------------------------------------------------- */

export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  model: string | null;
  shortDescription: string | null;
  priceMode: PriceMode;
  price: number | null;
  comparePrice: number | null;
  unit: string;
  stockStatus: StockStatus;
  isNew: boolean;
  isFeatured: boolean;
  imageUrl: string | null;
  categoryName: string;
  categorySlug: string;
  brandName: string | null;
  brandSlug: string | null;
  keySpecs: { label: string; value: string; unit: string | null }[];
};

export type CategoryNode = Category & { children: Category[]; productCount: number };

/* -------------------------------------------------------------------------- */
/*  دسته‌بندی‌ها                                                                */
/* -------------------------------------------------------------------------- */

/** درخت کامل دسته‌بندی‌ها به همراه تعداد محصول هر شاخه — برای مگا‌منو و فیلترها */
export const getCategoryTree = cache(async (): Promise<CategoryNode[]> => {
  const rows = await db
    .select({
      category: categories,
      // ⚠️ ارجاع به ستون‌ها عمداً به‌صورت خام و با نام کامل جدول نوشته شده:
      // درج ${categories.id} داخل subquery نام ستون را بدون prefix تولید می‌کند
      // و با ستون هم‌نام جدول داخلی تداخل پیدا می‌کند.
      productCount: sql<number>`(
        select count(*)::int from products p
        where p.category_id = categories.id and p.status = 'PUBLISHED'
      )`,
    })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(asc(categories.position), asc(categories.name));

  const all = rows.map((r) => ({ ...r.category, productCount: r.productCount }));
  const roots = all.filter((c) => !c.parentId);

  return roots.map((root) => {
    const children = all.filter((c) => c.parentId === root.id);
    return {
      ...root,
      children,
      // تعداد محصول شاخه = محصولات مستقیم + محصولات زیرشاخه‌ها
      productCount: root.productCount + children.reduce((sum, c) => sum + c.productCount, 0),
    };
  });
});

export const getCategoryBySlug = cache(async (slug: string) => {
  const [row] = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
  return row ?? null;
});

/** شناسه دسته‌بندی به‌همراه تمام زیرشاخه‌های آن */
async function collectCategoryIds(categoryId: string): Promise<string[]> {
  const children = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId));
  return [categoryId, ...children.map((c) => c.id)];
}

/** مسیر دسته‌بندی از ریشه تا خودش — برای breadcrumb */
export const getCategoryPath = cache(async (slug: string): Promise<Category[]> => {
  const current = await getCategoryBySlug(slug);
  if (!current) return [];
  if (!current.parentId) return [current];
  const [parent] = await db.select().from(categories).where(eq(categories.id, current.parentId)).limit(1);
  return parent ? [parent, current] : [current];
});

/* -------------------------------------------------------------------------- */
/*  برندها                                                                      */
/* -------------------------------------------------------------------------- */

export const getBrands = cache(async (onlyActive = true): Promise<(Brand & { productCount: number })[]> => {
  const rows = await db
    .select({
      brand: brands,
      productCount: sql<number>`(
        select count(*)::int from products p
        where p.brand_id = brands.id and p.status = 'PUBLISHED'
      )`,
    })
    .from(brands)
    .where(onlyActive ? eq(brands.isActive, true) : sql`true`)
    .orderBy(asc(brands.position), asc(brands.name));

  return rows.map((r) => ({ ...r.brand, productCount: r.productCount }));
});

export const getBrandBySlug = cache(async (slug: string) => {
  const [row] = await db.select().from(brands).where(eq(brands.slug, slug)).limit(1);
  return row ?? null;
});

/* -------------------------------------------------------------------------- */
/*  محصولات                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * فیلتر یک مشخصه فنی.
 *
 * برای مشخصه عددی `min`/`max` (بر حسب **واحد پایه**) و برای مشخصه متنی
 * `values` پر می‌شود. ساختار عمداً عمومی است تا افزودن مشخصه تازه از پنل
 * مدیریت، بدون تغییر کد فرانت‌اند کار کند.
 */
export type SpecFilterInput = {
  definitionKey: string;
  min?: number;
  max?: number;
  values?: string[];
};

export type ProductFilters = {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  stock?: StockStatus;
  onlyPriced?: boolean;
  featured?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
  /** فیلترهای مشخصات فنی — از تعریف‌های همان دسته‌بندی ساخته می‌شوند */
  specs?: SpecFilterInput[];
};

/** انتخاب ستون‌های کارت محصول — از تکرار در چند کوئری جلوگیری می‌کند */
const cardSelection = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  sku: products.sku,
  model: products.model,
  shortDescription: products.shortDescription,
  priceMode: products.priceMode,
  price: products.price,
  comparePrice: products.comparePrice,
  unit: products.unit,
  stockStatus: products.stockStatus,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  categoryName: categories.name,
  categorySlug: categories.slug,
  brandName: brands.name,
  brandSlug: brands.slug,
  imageUrl: sql<string | null>`(
    select pi.url from product_images pi
    where pi.product_id = products.id
    order by pi.is_primary desc, pi.position asc
    limit 1
  )`,
};

async function attachKeySpecs(rows: Omit<ProductCardData, "keySpecs">[]): Promise<ProductCardData[]> {
  if (rows.length === 0) return [];
  const specs = await db
    .select({
      productId: productSpecs.productId,
      label: productSpecs.label,
      value: productSpecs.value,
      unit: productSpecs.unit,
    })
    .from(productSpecs)
    .where(and(inArray(productSpecs.productId, rows.map((r) => r.id)), eq(productSpecs.isKey, true)))
    .orderBy(asc(productSpecs.position));

  const grouped = new Map<string, ProductCardData["keySpecs"]>();
  for (const spec of specs) {
    const list = grouped.get(spec.productId) ?? [];
    if (list.length < 3) list.push({ label: spec.label, value: spec.value, unit: spec.unit });
    grouped.set(spec.productId, list);
  }

  return rows.map((row) => ({ ...row, keySpecs: grouped.get(row.id) ?? [] }));
}

export async function listProducts(filters: ProductFilters = {}) {
  const {
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    stock,
    onlyPriced,
    featured,
    sort = "newest",
    page = 1,
    pageSize = PAGE_SIZE.products,
    specs,
  } = filters;

  const conditions = [eq(products.status, "PUBLISHED")];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(products.model, term),
        ilike(products.sku, term),
        ilike(products.shortDescription, term),
        sql`${products.tags}::text ilike ${term}`,
      )!,
    );
  }

  if (category) {
    const categoryRow = await getCategoryBySlug(category);
    if (categoryRow) {
      const ids = await collectCategoryIds(categoryRow.id);
      conditions.push(inArray(products.categoryId, ids));
    } else {
      return { items: [] as ProductCardData[], total: 0, page, pageSize, pageCount: 0 };
    }
  }

  if (brand) {
    const brandRow = await getBrandBySlug(brand);
    if (brandRow) conditions.push(eq(products.brandId, brandRow.id));
    else return { items: [] as ProductCardData[], total: 0, page, pageSize, pageCount: 0 };
  }

  if (typeof minPrice === "number") conditions.push(gte(products.price, minPrice));
  if (typeof maxPrice === "number") conditions.push(lte(products.price, maxPrice));
  if (stock) conditions.push(eq(products.stockStatus, stock));
  if (onlyPriced) conditions.push(eq(products.priceMode, "PUBLIC"));
  if (featured) conditions.push(eq(products.isFeatured, true));

  /*
   * فیلتر مشخصات فنی.
   *
   * هر مشخصه یک EXISTS جداگانه می‌سازد، پس چند فیلتر هم‌زمان با AND ترکیب
   * می‌شوند (محصول باید همه شرط‌ها را داشته باشد). ایندکس
   * product_specs_numeric_filter_idx روی (definition_id, value_base) این
   * زیرکوئری‌ها را برای کاتالوگ بزرگ هم سریع نگه می‌دارد.
   *
   * مقایسه عددی روی `value_base` انجام می‌شود نه `value_num`، چون فقط
   * مقدار پایه بین واحدهای مختلف (اسب بخار / کیلووات / وات) قابل مقایسه است.
   * برای مقادیر بازه‌ای، منطق «هم‌پوشانی» به‌کار می‌رود: محصولی که هد آن
   * «تا ۱۶۰» است، در بازه ۵۰ تا ۱۰۰ هم پاسخ می‌دهد.
   */
  for (const spec of specs ?? []) {
    const hasRange = typeof spec.min === "number" || typeof spec.max === "number";
    const hasValues = Array.isArray(spec.values) && spec.values.length > 0;
    if (!hasRange && !hasValues) continue;

    const clauses = [
      sql`sd.key = ${spec.definitionKey}`,
      sql`ps.product_id = ${products.id}`,
    ];

    if (typeof spec.min === "number") {
      clauses.push(sql`coalesce(ps.value_base_max, ps.value_base) >= ${spec.min}`);
    }
    if (typeof spec.max === "number") {
      clauses.push(sql`coalesce(ps.value_base, ps.value_base_max) <= ${spec.max}`);
    }
    if (hasValues) {
      /*
       * مقدار انتخابی می‌تواند متنی («چدن») یا عددی گسسته («۳۸۰» به‌صورت
       * مقدار پایه) باشد. چون نوع مشخصه اینجا در دسترس نیست، هر دو ستون
       * بررسی می‌شوند؛ ستون‌ها ایندکس دارند و مقادیر بین دو نوع تداخل
       * معنایی ندارند.
       */
      const numeric = spec.values!.filter((v) => v.trim() !== "" && Number.isFinite(Number(v)));
      const textual = spec.values!;

      const valueClauses = [
        sql`ps.value_text in (${sql.join(
          textual.map((v) => sql`${v}`),
          sql`, `,
        )})`,
      ];

      if (numeric.length > 0) {
        valueClauses.push(
          sql`ps.value_base in (${sql.join(
            numeric.map((v) => sql`${Number(v)}`),
            sql`, `,
          )})`,
        );
      }

      clauses.push(sql`(${sql.join(valueClauses, sql` or `)})`);
    }

    conditions.push(
      sql`exists (
        select 1 from product_specs ps
        join spec_definitions sd on sd.id = ps.definition_id
        where ${sql.join(clauses, sql` and `)}
      )`,
    );
  }

  const where = and(...conditions);

  const orderBy = (() => {
    switch (sort) {
      case "popular":
        return [desc(products.viewCount), desc(products.publishedAt)];
      case "price-asc":
        return [asc(sql`${products.price} nulls last`), asc(products.name)];
      case "price-desc":
        return [desc(sql`${products.price} nulls last`), asc(products.name)];
      case "name":
        return [asc(products.name)];
      default:
        return [desc(products.isFeatured), desc(products.publishedAt), asc(products.position)];
    }
  })();

  const [{ total }] = await db
    .select({ total: count() })
    .from(products)
    .where(where)
    .then((r) => (r.length ? r : [{ total: 0 }]));

  const rows = await db
    .select(cardSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(where)
    .orderBy(...orderBy)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return {
    items: await attachKeySpecs(rows as Omit<ProductCardData, "keySpecs">[]),
    total: total ?? 0,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil((total ?? 0) / pageSize)),
  };
}

export const getFeaturedProducts = cache(async (limit = 8): Promise<ProductCardData[]> => {
  const rows = await db
    .select(cardSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.status, "PUBLISHED"), eq(products.isFeatured, true)))
    .orderBy(asc(products.position), desc(products.publishedAt))
    .limit(limit);

  return attachKeySpecs(rows as Omit<ProductCardData, "keySpecs">[]);
});

/* -------------------------------------------------------------------------- */
/*  فیلترهای مشخصات فنی — کاملاً داده‌محور                                      */
/* -------------------------------------------------------------------------- */

export type SpecFacet = {
  key: string;
  label: string;
  dataType: SpecDataType;
  filterUi: SpecFilterUi;
  groupName: string;
  /** برچسب واحد پایه، برای نمایش کنار ورودی‌های عددی */
  unitLabel: string | null;
  unitSymbol: string | null;
  /** برای filterUi=RANGE — کمینه/بیشینه واقعی موجود در همین دسته */
  min: number | null;
  max: number | null;
  /**
   * برای filterUi=CHECKBOX — مقادیر موجود با تعداد محصول.
   *
   * `value` چیزی است که در URL می‌رود و کوئری روی آن اجرا می‌شود (برای
   * مشخصه عددی، مقدار پایه)، و `label` چیزی است که به کاربر نشان داده
   * می‌شود (مقدار اصلی با ارقام فارسی).
   */
  options: { value: string; label: string; count: number }[];
};

/**
 * فیلترهای قابل نمایش برای یک دسته‌بندی.
 *
 * هیچ چیز اینجا hard-code نشده: فهرست مشخصه‌ها از `category_specs` می‌آید،
 * فیلترپذیری از `spec_definitions.is_filterable` (با امکان override در
 * سطح دسته)، و بازه/گزینه‌ها از داده واقعی محصولات همان دسته محاسبه می‌شود.
 *
 * یعنی وقتی مدیر در پنل آینده یک مشخصه تازه بسازد و آن را به دسته‌ای وصل
 * کند، فیلترش بدون هیچ تغییر کدی روی سایت ظاهر می‌شود. مشخصه‌ای که در آن
 * دسته هیچ مقداری ندارد، نمایش داده نمی‌شود تا فیلتر بی‌فایده ساخته نشود.
 */
export const getCategorySpecFacets = cache(
  async (categorySlug: string | null | undefined): Promise<SpecFacet[]> => {
    if (!categorySlug) return [];

    const categoryRow = await getCategoryBySlug(categorySlug);
    if (!categoryRow) return [];

    // دسته و همه زیرشاخه‌هایش — محصولات زیرشاخه هم باید در فیلتر بیایند
    const categoryIds = await collectCategoryIds(categoryRow.id);

    // تعریف‌های وصل‌شده به این دسته یا والدش
    const scopeIds = categoryRow.parentId
      ? [categoryRow.id, categoryRow.parentId]
      : categoryIds;

    const defs = await db
      .select({
        id: specDefinitions.id,
        key: specDefinitions.key,
        label: specDefinitions.label,
        dataType: specDefinitions.dataType,
        filterUi: specDefinitions.filterUi,
        groupName: specDefinitions.groupName,
        defIsFilterable: specDefinitions.isFilterable,
        overrideFilterable: categorySpecs.isFilterable,
        position: categorySpecs.position,
        unitLabel: units.label,
        unitSymbol: units.symbol,
      })
      .from(categorySpecs)
      .innerJoin(specDefinitions, eq(categorySpecs.definitionId, specDefinitions.id))
      .leftJoin(units, eq(specDefinitions.defaultUnitId, units.id))
      .where(and(inArray(categorySpecs.categoryId, scopeIds), eq(specDefinitions.isActive, true)))
      .orderBy(asc(categorySpecs.position), asc(specDefinitions.position));

    // حذف تکراری‌ها (وقتی هم دسته و هم والد به یک تعریف وصل‌اند)
    const unique = new Map<string, (typeof defs)[number]>();
    for (const d of defs) if (!unique.has(d.key)) unique.set(d.key, d);

    const facets: SpecFacet[] = [];

    for (const def of unique.values()) {
      const filterable = def.overrideFilterable ?? def.defIsFilterable;
      if (!filterable || def.filterUi === "NONE") continue;

      if (def.filterUi === "RANGE") {
        const [bounds] = await db
          .select({
            min: sql<string | null>`min(least(${productSpecs.valueBase}, coalesce(${productSpecs.valueBaseMax}, ${productSpecs.valueBase})))`,
            max: sql<string | null>`max(greatest(coalesce(${productSpecs.valueBaseMax}, ${productSpecs.valueBase}), ${productSpecs.valueBase}))`,
          })
          .from(productSpecs)
          .innerJoin(products, eq(productSpecs.productId, products.id))
          .where(
            and(
              eq(productSpecs.definitionId, def.id),
              eq(products.status, "PUBLISHED"),
              inArray(products.categoryId, categoryIds),
            ),
          );

        const min = bounds?.min === null || bounds?.min === undefined ? null : Number(bounds.min);
        const max = bounds?.max === null || bounds?.max === undefined ? null : Number(bounds.max);
        // بدون داده یا با تک‌مقدار، فیلتر بازه‌ای معنا ندارد
        if (min === null || max === null || min === max) continue;

        facets.push({
          key: def.key,
          label: def.label,
          dataType: def.dataType,
          filterUi: def.filterUi,
          groupName: def.groupName,
          unitLabel: def.unitLabel,
          unitSymbol: def.unitSymbol,
          min,
          max,
          options: [],
        });
      } else {
        /*
         * فهرست گزینه‌ها.
         *
         * مشخصه متنی از `value_text` خوانده می‌شود و مشخصه عددیِ گسسته
         * (مثل ولتاژ ۲۲۰/۳۸۰ یا تعداد طبقات) از `value_base`. بدون شاخه
         * دوم، یک مشخصه NUMBER با نمایش CHECKBOX بی‌صدا ناپدید می‌شد،
         * چون value_text آن خالی است.
         */
        const isNumericFacet = def.dataType === "NUMBER" || def.dataType === "RANGE";
        const valueColumn = isNumericFacet ? productSpecs.valueBase : productSpecs.valueText;

        const rows = await db
          .select({
            value: sql<string | null>`${valueColumn}::text`,
            display: sql<string | null>`min(${productSpecs.value})`,
            count: sql<number>`count(distinct ${products.id})::int`,
          })
          .from(productSpecs)
          .innerJoin(products, eq(productSpecs.productId, products.id))
          .where(
            and(
              eq(productSpecs.definitionId, def.id),
              isNotNull(valueColumn),
              eq(products.status, "PUBLISHED"),
              inArray(products.categoryId, categoryIds),
            ),
          )
          .groupBy(valueColumn)
          .orderBy(desc(sql`count(distinct ${products.id})`), asc(valueColumn));

        const options = rows
          .filter((r) => r.value !== null)
          .map((r) => ({
            value: isNumericFacet ? String(Number(r.value)) : r.value!,
            label: r.display ?? r.value!,
            count: r.count,
          }));

        if (options.length === 0) continue;

        facets.push({
          key: def.key,
          label: def.label,
          dataType: def.dataType,
          filterUi: def.filterUi,
          groupName: def.groupName,
          unitLabel: def.unitLabel,
          unitSymbol: def.unitSymbol,
          min: null,
          max: null,
          options,
        });
      }
    }

    return facets;
  },
);

/**
 * محصولات یک راهکار — بر اساس برچسب.
 *
 * انتخاب عمدی: تطبیق فقط با `products.tags` انجام می‌شود، نه با دسته‌بندی.
 * دلیلش دقت است؛ دسته‌بندی‌های ریشه مثل «پمپ‌های آب» کل زیردرخت را برمی‌گردانند
 * و راهکارهای متفاوت را شبیه هم می‌کنند. مثلاً «تخلیه فاضلاب» با تطبیق
 * دسته‌ای، پمپ طبقاتی و خودمکش هم نشان می‌داد — که عملاً ادعای مناسب‌بودن آن
 * تجهیز برای فاضلاب است.
 *
 * برچسب‌ها توسط ویرایشگر محتوا انتخاب می‌شوند، پس فهرست هر راهکار عمدی و
 * قابل کنترل است. اگر راهکاری برچسبی نداشته باشد یا هیچ کالایی با آن
 * برچسب‌ها موجود نباشد، آرایه خالی برمی‌گردد و رابط کاربری حالت خالی نشان
 * می‌دهد — هیچ محصولی حدس زده نمی‌شود.
 */
export const getProductsForSolution = cache(
  async (productTags: readonly string[], limit = 8): Promise<ProductCardData[]> => {
    if (productTags.length === 0) return [];

    const rows = await db
      .select(cardSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(
        and(
          eq(products.status, "PUBLISHED"),
          // `&&` عملگر هم‌پوشانی آرایه در پستگرس است
          sql`${products.tags} && ARRAY[${sql.join(
            productTags.map((tag) => sql`${tag}`),
            sql`, `,
          )}]::text[]`,
        ),
      )
      .orderBy(desc(products.isFeatured), asc(products.position), desc(products.publishedAt))
      .limit(limit);

    return attachKeySpecs(rows as Omit<ProductCardData, "keySpecs">[]);
  },
);

/**
 * دسته‌بندی‌ها بر اساس اسلاگ — فقط آن‌هایی که واقعاً در پایگاه داده هستند.
 *
 * هم شاخه‌های اصلی و هم زیرشاخه‌ها پیدا می‌شوند، تا تعریف یک راهکار به
 * اسلاگ‌های سطح ریشه محدود نباشد. اسلاگ ناموجود بی‌صدا نادیده گرفته می‌شود
 * (مثلاً وقتی دسته‌ای از پنل مدیریت حذف شده)، پس صفحه راهکار هرگز خطا
 * نمی‌دهد.
 */
export const getCategoriesBySlugs = cache(
  async (slugs: readonly string[]): Promise<CategoryNode[]> => {
    if (slugs.length === 0) return [];
    const tree = await getCategoryTree();

    const find = (slug: string): CategoryNode | undefined => {
      const root = tree.find((node) => node.slug === slug);
      if (root) return root;
      // زیرشاخه‌ها در تایپ `Category` اعلام شده‌اند اما در زمان اجرا
      // productCount خودشان را از getCategoryTree همراه دارند
      for (const node of tree) {
        const child = node.children.find((c) => c.slug === slug);
        if (child) {
          const count = (child as Category & { productCount?: number }).productCount ?? 0;
          return { ...child, children: [], productCount: count };
        }
      }
      return undefined;
    };

    // ترتیب خروجی از ترتیب تعریف‌شده در راهکار پیروی می‌کند، نه از ترتیب جدول
    return slugs
      .map(find)
      .filter((node): node is CategoryNode => Boolean(node));
  },
);

export const getNewProducts = cache(async (limit = 6): Promise<ProductCardData[]> => {
  const rows = await db
    .select(cardSelection)
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.status, "PUBLISHED"), isNotNull(products.publishedAt)))
    .orderBy(desc(products.publishedAt))
    .limit(limit);

  return attachKeySpecs(rows as Omit<ProductCardData, "keySpecs">[]);
});

/** جزئیات کامل محصول برای صفحه محصول */
export const getProductBySlug = cache(async (slug: string) => {
  const [row] = await db
    .select({
      product: products,
      category: categories,
      brand: brands,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(and(eq(products.slug, slug), eq(products.status, "PUBLISHED")))
    .limit(1);

  if (!row) return null;

  const [images, specs] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, row.product.id))
      .orderBy(desc(productImages.isPrimary), asc(productImages.position)),
    db
      .select()
      .from(productSpecs)
      .where(eq(productSpecs.productId, row.product.id))
      .orderBy(asc(productSpecs.position)),
  ]);

  // گروه‌بندی مشخصات فنی با حفظ ترتیب اولین ظهور هر گروه
  const specGroups: { name: string; items: typeof specs }[] = [];
  for (const spec of specs) {
    let group = specGroups.find((g) => g.name === spec.groupName);
    if (!group) {
      group = { name: spec.groupName, items: [] };
      specGroups.push(group);
    }
    group.items.push(spec);
  }

  return { ...row, images, specs, specGroups };
});

/** محصولات مشابه: هم‌دسته، به‌جز خودش */
export const getRelatedProducts = cache(
  async (productId: string, categoryId: string, limit = 4): Promise<ProductCardData[]> => {
    const rows = await db
      .select(cardSelection)
      .from(products)
      .innerJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(
        and(
          eq(products.status, "PUBLISHED"),
          eq(products.categoryId, categoryId),
          ne(products.id, productId),
        ),
      )
      .orderBy(desc(products.isFeatured), desc(products.viewCount))
      .limit(limit);

    return attachKeySpecs(rows as Omit<ProductCardData, "keySpecs">[]);
  },
);

/** بازه قیمت محصولات دارای قیمت عمومی — برای اسلایدر فیلتر */
export const getPriceRange = cache(async () => {
  const [row] = await db
    .select({
      min: sql<number>`coalesce(min(${products.price}), 0)::int`,
      max: sql<number>`coalesce(max(${products.price}), 0)::int`,
    })
    .from(products)
    .where(and(eq(products.status, "PUBLISHED"), eq(products.priceMode, "PUBLIC")));

  return { min: row?.min ?? 0, max: row?.max ?? 0 };
});

/** افزایش شمارنده بازدید — بدون بلاک‌کردن رندر صفحه */
export async function incrementProductView(productId: string) {
  await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, productId));
}

/** تمام slug های منتشرشده — برای sitemap و generateStaticParams */
export async function getAllProductSlugs() {
  return db
    .select({ slug: products.slug, updatedAt: products.updatedAt })
    .from(products)
    .where(eq(products.status, "PUBLISHED"));
}

export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>;
export type { Product };

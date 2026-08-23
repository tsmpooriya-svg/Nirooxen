"use server";

/**
 * =============================================================================
 *  ماژول مدیریت — عملیات نوشتن
 * =============================================================================
 *  هر اکشن سه کار را همیشه انجام می‌دهد:
 *   1. requirePermission — چون layout فقط رندر را محافظت می‌کند نه اکشن‌ها
 *   2. اعتبارسنجی با Zod
 *   3. ثبت لاگ فعالیت
 * =============================================================================
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  brands,
  categories,
  contactMessages,
  customers,
  orderEvents,
  orderItems,
  orders,
  posts,
  productImages,
  productSpecs,
  products,
  projects,
  settings,
  users,
  type MessageStatus,
  type OrderPriority,
  type OrderStatus,
  type UserRole,
} from "@/db/schema";
import { buildSpecRows } from "@/modules/catalog/spec-writer";
import { logActivity } from "@/lib/activity";
import { AuthError, destroyAllSessions, hashPassword, requirePermission } from "@/lib/auth";
import { ORDER_STATUS } from "@/lib/constants";
import { readingTime, slugify, stripHtml, truncate } from "@/lib/utils";
import {
  brandFormSchema,
  categoryFormSchema,
  customerFormSchema,
  postFormSchema,
  productFormSchema,
  projectFormSchema,
  toFieldErrors,
  userFormSchema,
  type FieldErrors,
} from "@/lib/validation";

export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  id?: string;
};

/** پوشش مشترک خطا — از تکرار try/catch در هر اکشن جلوگیری می‌کند */
async function guard(fn: () => Promise<ActionState>): Promise<ActionState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError) {
      return { status: "error", message: error.message };
    }
    // خطای یکتایی postgres (مثلاً slug تکراری)
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      return { status: "error", message: "رکوردی با این نامک (slug) یا شناسه یکتا از قبل وجود دارد." };
    }
    console.error("[admin]", error);
    return { status: "error", message: "عملیات ناموفق بود. جزئیات در لاگ سرور ثبت شد." };
  }
}

/** ساخت نامک یکتا؛ اگر تکراری بود پسوند عددی اضافه می‌کند */
async function uniqueSlug(
  table: typeof products | typeof categories | typeof brands | typeof posts | typeof projects,
  base: string,
  excludeId?: string,
): Promise<string> {
  const candidate = slugify(base) || `item-${Date.now()}`;
  let slug = candidate;
  let counter = 1;

  // حداکثر ۵۰ تلاش — عملاً هرگز به آن نمی‌رسد
  while (counter < 50) {
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(excludeId ? and(eq(table.slug, slug), sql`${table.id} <> ${excludeId}`) : eq(table.slug, slug))
      .limit(1);
    if (rows.length === 0) return slug;
    slug = `${candidate}-${++counter}`;
  }
  return `${candidate}-${Date.now()}`;
}

/* ========================================================================== */
/*  سفارش‌ها                                                                    */
/* ========================================================================== */

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");

    const [current] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!current) return { status: "error", message: "سفارش پیدا نشد." };
    if (current.status === status) return { status: "success", message: "وضعیت تغییری نکرد." };

    const patch: Partial<typeof orders.$inferInsert> = { status, updatedAt: new Date() };
    if (status === "QUOTED") patch.quotedAt = new Date();
    if (status === "CONFIRMED") patch.confirmedAt = new Date();
    if (status === "COMPLETED") patch.completedAt = new Date();

    await db.update(orders).set(patch).where(eq(orders.id, orderId));

    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "STATUS_CHANGED",
      message: `وضعیت از «${ORDER_STATUS[current.status].label}» به «${ORDER_STATUS[status].label}» تغییر کرد.`,
      meta: { from: current.status, to: status },
    });

    await logActivity({
      userId: user.id,
      action: "status_change",
      entity: "order",
      entityId: orderId,
      summary: `وضعیت سفارش ${current.number} به «${ORDER_STATUS[status].label}» تغییر کرد.`,
    });

    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin");
    return { status: "success", message: "وضعیت به‌روزرسانی شد." };
  });
}

export async function updateOrderPriority(orderId: string, priority: OrderPriority): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");
    await db.update(orders).set({ priority, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "SYSTEM",
      message: `اولویت پرونده تغییر کرد.`,
      meta: { priority },
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "اولویت به‌روزرسانی شد." };
  });
}

export async function assignOrder(orderId: string, assigneeId: string | null): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");

    let assigneeName = "هیچ‌کس";
    if (assigneeId) {
      const [assignee] = await db.select({ name: users.name }).from(users).where(eq(users.id, assigneeId)).limit(1);
      assigneeName = assignee?.name ?? "نامشخص";
    }

    await db.update(orders).set({ assignedToId: assigneeId, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "ASSIGNED",
      message: assigneeId ? `پرونده به ${assigneeName} ارجاع شد.` : "ارجاع پرونده برداشته شد.",
    });

    await logActivity({
      userId: user.id,
      action: "assign",
      entity: "order",
      entityId: orderId,
      summary: `ارجاع سفارش به ${assigneeName}`,
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { status: "success", message: "ارجاع ثبت شد." };
  });
}

export async function addOrderNote(orderId: string, body: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");
    const text = body.trim();
    if (text.length < 2) return { status: "error", message: "متن یادداشت خیلی کوتاه است." };

    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "NOTE_ADDED",
      message: text.slice(0, 2000),
    });
    await db.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, orderId));

    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "یادداشت ثبت شد." };
  });
}

export async function logOrderContact(orderId: string, note: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");
    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "CONTACTED",
      message: note.trim() || "تماس با مشتری برقرار شد.",
    });
    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "تماس ثبت شد." };
  });
}

/** ثبت قیمت اعلامی برای اقلام و انتقال پرونده به وضعیت «قیمت اعلام شد» */
export async function submitQuote(
  orderId: string,
  prices: { itemId: string; price: number }[],
  extra: { discount?: number; tax?: number; shipping?: number; validDays?: number } = {},
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("orders");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) return { status: "error", message: "این پرونده قلمی ندارد." };

    let subtotal = 0;

    for (const item of items) {
      const entry = prices.find((p) => p.itemId === item.id);
      const unit = entry
        ? Math.max(0, Math.round(entry.price))
        : (item.quotedUnitPrice ?? item.unitPrice ?? 0);
      const lineTotal = unit * item.quantity;
      subtotal += lineTotal;

      if (entry) {
        await db
          .update(orderItems)
          .set({ quotedUnitPrice: unit, lineTotal })
          .where(eq(orderItems.id, item.id));
      }
    }

    const discount = Math.max(0, extra.discount ?? 0);
    const tax = Math.max(0, extra.tax ?? 0);
    const shipping = Math.max(0, extra.shipping ?? 0);
    const total = Math.max(0, subtotal - discount + tax + shipping);
    const validUntil = new Date(Date.now() + (extra.validDays ?? 7) * 864e5);

    await db
      .update(orders)
      .set({
        subtotal,
        discount,
        tax,
        shipping,
        total,
        status: "QUOTED",
        quotedAt: new Date(),
        quoteValidUntil: validUntil,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));

    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "QUOTE_SENT",
      message: `پیش‌فاکتور با مبلغ کل ${total.toLocaleString("en-US")} تومان ثبت شد.`,
      meta: { subtotal, discount, tax, shipping, total },
    });

    await logActivity({
      userId: user.id,
      action: "update",
      entity: "order",
      entityId: orderId,
      summary: `ثبت پیش‌فاکتور برای سفارش`,
    });

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
    return { status: "success", message: "پیش‌فاکتور ثبت شد." };
  });
}

/* ========================================================================== */
/*  محصولات                                                                     */
/* ========================================================================== */

export async function saveProduct(
  productId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("products");

    const parsed = productFormSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
      sku: formData.get("sku") || undefined,
      model: formData.get("model") || undefined,
      shortDescription: formData.get("shortDescription") || undefined,
      description: formData.get("description") || undefined,
      categoryId: formData.get("categoryId"),
      brandId: formData.get("brandId") || "",
      status: formData.get("status") || "DRAFT",
      priceMode: formData.get("priceMode") || "ON_REQUEST",
      price: formData.get("price") || undefined,
      comparePrice: formData.get("comparePrice") || undefined,
      unit: formData.get("unit") || "دستگاه",
      stockStatus: formData.get("stockStatus") || "ORDER_ONLY",
      leadTimeDays: formData.get("leadTimeDays") || undefined,
      minOrderQty: formData.get("minOrderQty") || 1,
      warrantyMonths: formData.get("warrantyMonths") || undefined,
      isFeatured: formData.get("isFeatured"),
      isNew: formData.get("isNew"),
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      metaTitle: formData.get("metaTitle") || undefined,
      metaDescription: formData.get("metaDescription") || undefined,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(products, input.slug || input.name, productId ?? undefined);

    const values = {
      name: input.name,
      slug,
      sku: input.sku ?? null,
      model: input.model ?? null,
      shortDescription: input.shortDescription ?? null,
      description: input.description ?? null,
      categoryId: input.categoryId,
      brandId: input.brandId ?? null,
      status: input.status,
      priceMode: input.priceMode,
      price: input.priceMode === "PUBLIC" ? (input.price ?? null) : null,
      comparePrice: input.priceMode === "PUBLIC" ? (input.comparePrice ?? null) : null,
      unit: input.unit,
      stockStatus: input.stockStatus,
      leadTimeDays: input.leadTimeDays ?? null,
      minOrderQty: input.minOrderQty,
      warrantyMonths: input.warrantyMonths ?? null,
      isFeatured: input.isFeatured,
      isNew: input.isNew,
      tags: input.tags,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      updatedAt: new Date(),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    };

    // تصاویر و مشخصات به‌صورت JSON از فرم می‌آیند
    const images = safeJson<{ url: string; alt?: string }[]>(formData.get("images"), []);
    const specs = safeJson<{ groupName: string; label: string; value: string; unit?: string; isKey?: boolean }[]>(
      formData.get("specs"),
      [],
    );

    let id = productId;

    if (id) {
      const [existing] = await db.select({ publishedAt: products.publishedAt }).from(products).where(eq(products.id, id)).limit(1);
      await db
        .update(products)
        .set({ ...values, publishedAt: existing?.publishedAt ?? values.publishedAt })
        .where(eq(products.id, id));
    } else {
      const [created] = await db.insert(products).values(values).returning({ id: products.id });
      id = created!.id;
    }

    // جایگزینی کامل تصاویر و مشخصات — ساده‌تر و قابل اتکاتر از diff جزئی
    await db.delete(productImages).where(eq(productImages.productId, id!));
    if (images.length > 0) {
      await db.insert(productImages).values(
        images.map((image, index) => ({
          productId: id!,
          url: image.url,
          alt: image.alt ?? input.name,
          position: index,
          isPrimary: index === 0,
        })),
      );
    }

    await db.delete(productSpecs).where(eq(productSpecs.productId, id!));
    if (specs.length > 0) {
      // از buildSpecRows عبور می‌کند تا مقادیر نوع‌دار و مقدار پایه ساخته
      // شوند؛ درج مستقیم، محصول را بی‌صدا از فیلترها حذف می‌کرد.
      const rows = await buildSpecRows(id!, specs);
      await db.insert(productSpecs).values(rows);
    }

    await logActivity({
      userId: user.id,
      action: productId ? "update" : "create",
      entity: "product",
      entityId: id!,
      summary: `${productId ? "ویرایش" : "ایجاد"} محصول «${input.name}»`,
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);

    return { status: "success", message: productId ? "محصول به‌روزرسانی شد." : "محصول ایجاد شد.", id: id! };
  });
}

export async function deleteProduct(productId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("products");
    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);

    await db.delete(products).where(eq(products.id, productId));

    await logActivity({
      userId: user.id,
      action: "delete",
      entity: "product",
      entityId: productId,
      summary: `حذف محصول «${product?.name ?? productId}»`,
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { status: "success", message: "محصول حذف شد." };
  });
}

export async function bulkUpdateProductStatus(
  ids: string[],
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("products");
    if (ids.length === 0) return { status: "error", message: "محصولی انتخاب نشده است." };

    await db
      .update(products)
      .set({ status, updatedAt: new Date(), publishedAt: status === "PUBLISHED" ? new Date() : undefined })
      .where(inArray(products.id, ids));

    await logActivity({
      userId: user.id,
      action: "update",
      entity: "product",
      summary: `تغییر وضعیت گروهی ${ids.length} محصول`,
      meta: { ids, status },
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { status: "success", message: `${ids.length} محصول به‌روزرسانی شد.` };
  });
}

/* ========================================================================== */
/*  دسته‌بندی و برند                                                            */
/* ========================================================================== */

export async function saveCategory(
  categoryId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("categories");

    const parsed = categoryFormSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
      description: formData.get("description") || undefined,
      icon: formData.get("icon") || undefined,
      parentId: formData.get("parentId") || "",
      position: formData.get("position") || 0,
      isActive: formData.get("isActive"),
      isFeatured: formData.get("isFeatured"),
      metaTitle: formData.get("metaTitle") || undefined,
      metaDescription: formData.get("metaDescription") || undefined,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;

    // جلوگیری از حلقه: دسته نمی‌تواند والد خودش باشد
    if (categoryId && input.parentId === categoryId) {
      return { status: "error", message: "یک دسته‌بندی نمی‌تواند والد خودش باشد." };
    }

    const slug = await uniqueSlug(categories, input.slug || input.name, categoryId ?? undefined);
    const values = {
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? null,
      parentId: input.parentId ?? null,
      position: input.position,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      updatedAt: new Date(),
    };

    if (categoryId) await db.update(categories).set(values).where(eq(categories.id, categoryId));
    else await db.insert(categories).values(values);

    await logActivity({
      userId: user.id,
      action: categoryId ? "update" : "create",
      entity: "category",
      entityId: categoryId ?? undefined,
      summary: `${categoryId ? "ویرایش" : "ایجاد"} دسته‌بندی «${input.name}»`,
    });

    revalidatePath("/admin/categories");
    revalidatePath("/products");
    return { status: "success", message: "دسته‌بندی ذخیره شد." };
  });
}

export async function deleteCategory(categoryId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("categories");

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.categoryId, categoryId));

    if (total > 0) {
      return {
        status: "error",
        message: `این دسته‌بندی ${total} محصول دارد. ابتدا محصولات را به دسته دیگری منتقل کنید.`,
      };
    }

    await db.delete(categories).where(eq(categories.id, categoryId));
    await logActivity({
      userId: user.id,
      action: "delete",
      entity: "category",
      entityId: categoryId,
      summary: "حذف دسته‌بندی",
    });

    revalidatePath("/admin/categories");
    return { status: "success", message: "دسته‌بندی حذف شد." };
  });
}

export async function saveBrand(
  brandId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("brands");

    const parsed = brandFormSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug") || undefined,
      latinName: formData.get("latinName") || undefined,
      country: formData.get("country") || undefined,
      description: formData.get("description") || undefined,
      website: formData.get("website") || undefined,
      logoUrl: formData.get("logoUrl") || undefined,
      isFeatured: formData.get("isFeatured"),
      isActive: formData.get("isActive"),
      position: formData.get("position") || 0,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(brands, input.slug || input.latinName || input.name, brandId ?? undefined);

    const values = {
      name: input.name,
      slug,
      latinName: input.latinName ?? null,
      country: input.country ?? null,
      description: input.description ?? null,
      website: input.website ?? null,
      logoUrl: input.logoUrl ?? null,
      isFeatured: input.isFeatured,
      isActive: input.isActive,
      position: input.position,
      updatedAt: new Date(),
    };

    if (brandId) await db.update(brands).set(values).where(eq(brands.id, brandId));
    else await db.insert(brands).values(values);

    await logActivity({
      userId: user.id,
      action: brandId ? "update" : "create",
      entity: "brand",
      entityId: brandId ?? undefined,
      summary: `${brandId ? "ویرایش" : "ایجاد"} برند «${input.name}»`,
    });

    revalidatePath("/admin/brands");
    revalidatePath("/brands");
    return { status: "success", message: "برند ذخیره شد." };
  });
}

export async function deleteBrand(brandId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("brands");
    await db.delete(brands).where(eq(brands.id, brandId));
    await logActivity({ userId: user.id, action: "delete", entity: "brand", entityId: brandId, summary: "حذف برند" });
    revalidatePath("/admin/brands");
    revalidatePath("/brands");
    return { status: "success", message: "برند حذف شد." };
  });
}

/* ========================================================================== */
/*  مشتریان                                                                     */
/* ========================================================================== */

export async function saveCustomer(
  customerId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("customers");

    const parsed = customerFormSchema.safeParse({
      fullName: formData.get("fullName"),
      phone: formData.get("phone"),
      email: formData.get("email") || undefined,
      type: formData.get("type") || "INDIVIDUAL",
      companyName: formData.get("companyName") || undefined,
      economicCode: formData.get("economicCode") || undefined,
      nationalId: formData.get("nationalId") || undefined,
      province: formData.get("province") || undefined,
      city: formData.get("city") || undefined,
      address: formData.get("address") || undefined,
      postalCode: formData.get("postalCode") || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const values = {
      ...parsed.data,
      email: parsed.data.email ?? null,
      companyName: parsed.data.companyName ?? null,
      economicCode: parsed.data.economicCode ?? null,
      nationalId: parsed.data.nationalId ?? null,
      province: parsed.data.province ?? null,
      city: parsed.data.city ?? null,
      address: parsed.data.address ?? null,
      postalCode: parsed.data.postalCode ?? null,
      updatedAt: new Date(),
    };

    if (customerId) await db.update(customers).set(values).where(eq(customers.id, customerId));
    else await db.insert(customers).values(values);

    await logActivity({
      userId: user.id,
      action: customerId ? "update" : "create",
      entity: "customer",
      entityId: customerId ?? undefined,
      summary: `${customerId ? "ویرایش" : "ایجاد"} مشتری «${parsed.data.fullName}»`,
    });

    revalidatePath("/admin/customers");
    return { status: "success", message: "اطلاعات مشتری ذخیره شد." };
  });
}

/* ========================================================================== */
/*  اخبار                                                                       */
/* ========================================================================== */

export async function savePost(
  postId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("posts");

    const parsed = postFormSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      excerpt: formData.get("excerpt") || undefined,
      content: formData.get("content"),
      coverUrl: formData.get("coverUrl") || undefined,
      category: formData.get("category") || "اخبار",
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: formData.get("status") || "DRAFT",
      isFeatured: formData.get("isFeatured"),
      metaTitle: formData.get("metaTitle") || undefined,
      metaDescription: formData.get("metaDescription") || undefined,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(posts, input.slug || input.title, postId ?? undefined);

    const values = {
      title: input.title,
      slug,
      excerpt: input.excerpt ?? truncate(stripHtml(input.content), 200),
      content: input.content,
      coverUrl: input.coverUrl ?? null,
      category: input.category,
      tags: input.tags,
      status: input.status,
      isFeatured: input.isFeatured,
      readingMinutes: readingTime(input.content),
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      authorId: user.id,
      updatedAt: new Date(),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    };

    let id = postId;
    if (id) {
      const [existing] = await db.select({ publishedAt: posts.publishedAt }).from(posts).where(eq(posts.id, id)).limit(1);
      await db
        .update(posts)
        .set({ ...values, publishedAt: existing?.publishedAt ?? values.publishedAt })
        .where(eq(posts.id, id));
    } else {
      const [created] = await db.insert(posts).values(values).returning({ id: posts.id });
      id = created!.id;
    }

    await logActivity({
      userId: user.id,
      action: postId ? "update" : "create",
      entity: "post",
      entityId: id!,
      summary: `${postId ? "ویرایش" : "ایجاد"} مطلب «${input.title}»`,
    });

    revalidatePath("/admin/posts");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
    return { status: "success", message: "مطلب ذخیره شد.", id: id! };
  });
}

export async function deletePost(postId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("posts");
    await db.delete(posts).where(eq(posts.id, postId));
    await logActivity({ userId: user.id, action: "delete", entity: "post", entityId: postId, summary: "حذف مطلب" });
    revalidatePath("/admin/posts");
    revalidatePath("/news");
    return { status: "success", message: "مطلب حذف شد." };
  });
}

/* ========================================================================== */
/*  پروژه‌ها                                                                    */
/* ========================================================================== */

export async function saveProject(
  projectId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("projects");

    const parsed = projectFormSchema.safeParse({
      title: formData.get("title"),
      slug: formData.get("slug") || undefined,
      client: formData.get("client") || undefined,
      location: formData.get("location") || undefined,
      year: formData.get("year") || undefined,
      capacity: formData.get("capacity") || undefined,
      summary: formData.get("summary") || undefined,
      description: formData.get("description") || undefined,
      coverUrl: formData.get("coverUrl") || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      position: formData.get("position") || 0,
      isActive: formData.get("isActive"),
      isFeatured: formData.get("isFeatured"),
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(projects, input.slug || input.title, projectId ?? undefined);

    const values = {
      title: input.title,
      slug,
      client: input.client ?? null,
      location: input.location ?? null,
      year: input.year ?? null,
      capacity: input.capacity ?? null,
      summary: input.summary ?? null,
      description: input.description ?? null,
      coverUrl: input.coverUrl ?? null,
      tags: input.tags,
      position: input.position,
      isActive: input.isActive,
      isFeatured: input.isFeatured,
      updatedAt: new Date(),
    };

    if (projectId) await db.update(projects).set(values).where(eq(projects.id, projectId));
    else await db.insert(projects).values(values);

    await logActivity({
      userId: user.id,
      action: projectId ? "update" : "create",
      entity: "project",
      entityId: projectId ?? undefined,
      summary: `${projectId ? "ویرایش" : "ایجاد"} پروژه «${input.title}»`,
    });

    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath("/");
    return { status: "success", message: "پروژه ذخیره شد." };
  });
}

export async function deleteProject(projectId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("projects");
    await db.delete(projects).where(eq(projects.id, projectId));
    await logActivity({
      userId: user.id, action: "delete", entity: "project", entityId: projectId, summary: "حذف پروژه",
    });
    revalidatePath("/admin/projects");
    revalidatePath("/projects");
    revalidatePath("/");
    return { status: "success", message: "پروژه حذف شد." };
  });
}

/* ========================================================================== */
/*  پیام‌ها                                                                     */
/* ========================================================================== */

export async function updateMessageStatus(messageId: string, status: MessageStatus): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("messages");
    await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, messageId));
    await logActivity({
      userId: user.id,
      action: "status_change",
      entity: "message",
      entityId: messageId,
      summary: `تغییر وضعیت پیام تماس`,
    });
    revalidatePath("/admin/messages");
    revalidatePath("/admin");
    return { status: "success", message: "وضعیت پیام تغییر کرد." };
  });
}

/* ========================================================================== */
/*  کاربران                                                                     */
/* ========================================================================== */

export async function saveUser(
  userId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const actor = await requirePermission("users");

    const parsed = userFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      role: formData.get("role") || "SALES",
      password: formData.get("password") || undefined,
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;

    if (!userId && !input.password) {
      return { status: "error", message: "برای کاربر جدید، تعیین رمز عبور الزامی است.", errors: { password: "رمز عبور الزامی است" } };
    }

    // مدیر ارشد نمی‌تواند حساب خودش را غیرفعال یا تنزل دهد
    if (userId === actor.id && (!input.isActive || input.role !== "OWNER")) {
      return { status: "error", message: "نمی‌توانید سطح دسترسی یا وضعیت حساب خودتان را تغییر دهید." };
    }

    const values: Record<string, unknown> = {
      name: input.name,
      email: input.email.toLowerCase(),
      phone: input.phone ?? null,
      role: input.role as UserRole,
      isActive: input.isActive,
      updatedAt: new Date(),
    };

    if (input.password) values.passwordHash = await hashPassword(input.password);

    if (userId) {
      await db.update(users).set(values).where(eq(users.id, userId));
      // تغییر رمز یا غیرفعال‌سازی، همه نشست‌های آن کاربر را باطل می‌کند
      if (input.password || !input.isActive) await destroyAllSessions(userId);
    } else {
      await db.insert(users).values(values as typeof users.$inferInsert);
    }

    await logActivity({
      userId: actor.id,
      action: userId ? "update" : "create",
      entity: "user",
      entityId: userId ?? undefined,
      summary: `${userId ? "ویرایش" : "ایجاد"} کاربر «${input.name}»`,
    });

    revalidatePath("/admin/users");
    return { status: "success", message: "کاربر ذخیره شد." };
  });
}

/* ========================================================================== */
/*  تنظیمات                                                                     */
/* ========================================================================== */

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const user = await requirePermission("settings");

    const entries = Array.from(formData.entries()).filter(([key]) => key.startsWith("setting:"));

    for (const [formKey, raw] of entries) {
      const key = formKey.replace("setting:", "");
      const value = raw === "on" ? true : raw === "" ? "" : String(raw);
      const parsedValue = value === "true" ? true : value === "false" ? false : value;

      await db
        .insert(settings)
        .values({ key, value: parsedValue, group: key.split(".")[0] ?? "general" })
        .onConflictDoUpdate({ target: settings.key, set: { value: parsedValue, updatedAt: new Date() } });
    }

    // چک‌باکس‌های تیک‌نخورده در FormData نمی‌آیند؛ باید صراحتاً false شوند
    const booleanKeys = String(formData.get("__booleanKeys") ?? "").split(",").filter(Boolean);
    for (const key of booleanKeys) {
      if (formData.has(`setting:${key}`)) continue;
      await db
        .insert(settings)
        .values({ key, value: false, group: key.split(".")[0] ?? "general" })
        .onConflictDoUpdate({ target: settings.key, set: { value: false, updatedAt: new Date() } });
    }

    await logActivity({ userId: user.id, action: "update", entity: "settings", summary: "به‌روزرسانی تنظیمات سایت" });

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    return { status: "success", message: "تنظیمات ذخیره شد." };
  });
}

/* -------------------------------------------------------------------------- */

function safeJson<T>(value: FormDataEntryValue | null, fallback: T): T {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

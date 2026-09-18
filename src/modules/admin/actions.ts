"use server";

/**
 * =============================================================================
 *  ماژول مدیریت — عملیات نوشتن
 * =============================================================================
 *  هر اکشن سه کار را همیشه انجام می‌دهد:
 *   1. requireWritePermission — چون layout فقط رندر را محافظت می‌کند نه اکشن‌ها
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
  categorySpecs,
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
  specDefinitions,
  units,
  users,
  type MessageStatus,
  type OrderPriority,
  type OrderStatus,
  type UserRole,
} from "@/db/schema";
import { buildSpecRows } from "@/modules/catalog/spec-writer";
import { logActivity } from "@/lib/activity";
import { deleteAssetByPrefix } from "@/lib/media/assets";
import { isOwnProductAssetPrefix } from "@/lib/storage/keys";
import { AuthError, destroyAllSessions, hashPassword, requireWritePermission } from "@/lib/auth";
import { ORDER_PRIORITY, ORDER_STATUS } from "@/lib/constants";
import { readingTime, slugify, stripHtml, truncate } from "@/lib/utils";
import {
  brandFormSchema,
  categoryFormSchema,
  customerFormSchema,
  categorySpecFormSchema,
  postFormSchema,
  productFormSchema,
  projectFormSchema,
  specDefinitionFormSchema,
  unitFormSchema,
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
    const user = await requireWritePermission("orders");

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
    const user = await requireWritePermission("orders");
    await db.update(orders).set({ priority, updatedAt: new Date() }).where(eq(orders.id, orderId));
    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "SYSTEM",
      message: `اولویت پرونده تغییر کرد.`,
      meta: { priority },
    });

    await logActivity({
      userId: user.id,
      action: "update",
      entity: "order",
      entityId: orderId,
      summary: `اولویت سفارش به «${ORDER_PRIORITY[priority].label}» تغییر کرد.`,
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "اولویت به‌روزرسانی شد." };
  });
}

export async function assignOrder(orderId: string, assigneeId: string | null): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("orders");

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
    const user = await requireWritePermission("orders");
    const text = body.trim();
    if (text.length < 2) return { status: "error", message: "متن یادداشت خیلی کوتاه است." };

    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "NOTE_ADDED",
      message: text.slice(0, 2000),
    });
    await db.update(orders).set({ updatedAt: new Date() }).where(eq(orders.id, orderId));

    await logActivity({
      userId: user.id,
      action: "update",
      entity: "order",
      entityId: orderId,
      summary: "یادداشت به سفارش افزوده شد.",
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "یادداشت ثبت شد." };
  });
}

export async function logOrderContact(orderId: string, note: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("orders");
    await db.insert(orderEvents).values({
      orderId,
      userId: user.id,
      type: "CONTACTED",
      message: note.trim() || "تماس با مشتری برقرار شد.",
    });

    await logActivity({
      userId: user.id,
      action: "update",
      entity: "order",
      entityId: orderId,
      summary: "تماس با مشتری ثبت شد.",
    });

    revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "تماس ثبت شد." };
  });
}

/** ثبت قیمت اعلامی برای اقلام و انتقال پرونده به وضعیت «قیمت اعلام شد» */
export async function deleteOrder(orderId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("orders");
    const [order] = await db
      .select({ number: orders.number, contactName: orders.contactName })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);
    if (!order) return { status: "error", message: "این سفارش پیدا نشد؛ شاید قبلاً حذف شده باشد." };

    /*
      اقلام، رویدادها و پرداخت‌های سفارش با کلید خارجی cascade پاک می‌شوند؛
      اینجا دستی حذفشان نمی‌کنیم تا تنها یک جای حقیقت برای این رفتار بماند.
    */
    await db.delete(orders).where(eq(orders.id, orderId));

    await logActivity({
      userId: user.id,
      action: "delete",
      entity: "order",
      entityId: orderId,
      summary: `حذف سفارش ${order.number} («${order.contactName}»)`,
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return { status: "success", message: `سفارش ${order.number} حذف شد.` };
  });
}

export async function submitQuote(
  orderId: string,
  prices: { itemId: string; price: number }[],
  extra: { discount?: number; tax?: number; shipping?: number; validDays?: number } = {},
): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("orders");

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    if (items.length === 0) return { status: "error", message: "این پرونده قلمی ندارد." };

    const discount = Math.max(0, extra.discount ?? 0);
    const tax = Math.max(0, extra.tax ?? 0);
    const shipping = Math.max(0, extra.shipping ?? 0);
    const validUntil = new Date(Date.now() + (extra.validDays ?? 7) * 864e5);

    /*
      همه در یک تراکنش.

      پیش‌تر اقلام یکی‌یکی و بیرون از تراکنش به‌روز می‌شدند و بعد خود سفارش. هر
      خطایی در میانهٔ راه — قطع اتصال، مهلت تمام‌شده — پرونده‌ای می‌ساخت که
      نیمی از اقلامش قیمت خورده بود ولی وضعیتش هنوز عوض نشده بود، و هیچ‌چیز در
      پنل نشان نمی‌داد کدام نیمه. ثبت سفارش از همان اول این کار را درست
      می‌کرد؛ اینجا هم همان الگو.
    */
    await db.transaction(async (tx) => {
      let subtotal = 0;

      for (const item of items) {
        const entry = prices.find((p) => p.itemId === item.id);
        const unit = entry
          ? Math.max(0, Math.round(entry.price))
          : (item.quotedUnitPrice ?? item.unitPrice ?? 0);
        const lineTotal = unit * item.quantity;
        subtotal += lineTotal;

        if (entry) {
          await tx
            .update(orderItems)
            .set({ quotedUnitPrice: unit, lineTotal })
            .where(eq(orderItems.id, item.id));
        }
      }

      const sum = Math.max(0, subtotal - discount + tax + shipping);

      await tx
        .update(orders)
        .set({
          subtotal,
          discount,
          tax,
          shipping,
          total: sum,
          status: "QUOTED",
          quotedAt: new Date(),
          quoteValidUntil: validUntil,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(orderEvents).values({
        orderId,
        userId: user.id,
        type: "QUOTE_SENT",
        message: `پیش‌فاکتور با مبلغ کل ${sum.toLocaleString("en-US")} تومان ثبت شد.`,
        meta: { subtotal, discount, tax, shipping, total: sum },
      });
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
    const user = await requireWritePermission("products");

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
      priceConditionCode: formData.get("priceConditionCode") || undefined,
      priceConditionText: formData.get("priceConditionText") || undefined,
      isPromotional: formData.get("isPromotional"),
      sourceRef: formData.get("sourceRef") || undefined,
      unit: formData.get("unit") || "دستگاه",
      stockStatus: formData.get("stockStatus") || "ORDER_ONLY",
      leadTimeDays: formData.get("leadTimeDays") || undefined,
      minOrderQty: formData.get("minOrderQty") || 1,
      warrantyMonths: formData.get("warrantyMonths") || undefined,
      isFeatured: formData.get("isFeatured"),
      isNew: formData.get("isNew"),
      position: formData.get("position") || 0,
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
      priceConditionCode: input.priceConditionCode ?? null,
      priceConditionText: input.priceConditionText ?? null,
      isPromotional: input.isPromotional,
      sourceRef: input.sourceRef ?? null,
      unit: input.unit,
      stockStatus: input.stockStatus,
      leadTimeDays: input.leadTimeDays ?? null,
      minOrderQty: input.minOrderQty,
      warrantyMonths: input.warrantyMonths ?? null,
      isFeatured: input.isFeatured,
      isNew: input.isNew,
      position: input.position,
      tags: input.tags,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      updatedAt: new Date(),
      publishedAt: input.status === "PUBLISHED" ? new Date() : null,
    };

    // تصاویر و مشخصات به‌صورت JSON از فرم می‌آیند
    const images = safeJson<
      {
        url: string;
        alt?: string;
        storageKey?: string;
        width?: number;
        height?: number;
        /** از پاسخ آپلود می‌آید؛ برای تصویر دستی تهی می‌ماند و یعنی «بدون ترکیب» */
        backdrop?: string;
      }[]
    >(formData.get("images"), []);
    const specs = safeJson<{ groupName: string; label: string; value: string; unit?: string; isKey?: boolean }[]>(
      formData.get("specs"),
      [],
    );

    /*
      کلید ذخیره‌سازی از کلاینت برمی‌گردد و هنگام ذخیره مبنای حذف فایل است. اگر
      کلید محصول دیگری پذیرفته شود، ویرایش بعدیِ همین محصول دارایی آن محصول را
      پاک می‌کند. پس پیش از هر نوشتنی رد می‌شود.
    */
    const foreignAsset = images.some(
      (image) => image.storageKey && !isOwnProductAssetPrefix(image.storageKey, productId ?? undefined),
    );
    if (foreignAsset) {
      return { status: "error", message: "شناسه یکی از تصاویر معتبر نیست. صفحه را تازه کنید و دوباره تلاش کنید." };
    }

    /*
      کلیدهای فعلی و ردیف‌های مشخصات پیش از تراکنش آماده می‌شوند — هر دو فقط
      خواندن و محاسبه‌اند. دلیلش دو چیز است: ورودی نامعتبرِ مشخصات باید پیش از
      هر نوشتنی رد شود، و buildSpecRows نباید داخل تراکنش یک اتصال دوم از
      استخر بگیرد (با استخر پر، همان‌جا قفل می‌شد).

      برای محصول تازه هنوز شناسه‌ای وجود ندارد؛ ردیف‌ها با شناسهٔ واقعی داخل
      تراکنش مهر می‌خورند و طبعاً تصویر قبلی هم ندارد.
    */
    const previousKeys = new Set(
      productId
        ? (
            await db
              .select({ storageKey: productImages.storageKey })
              .from(productImages)
              .where(eq(productImages.productId, productId))
          )
            .map((row) => row.storageKey)
            .filter((key): key is string => Boolean(key))
        : [],
    );

    // از buildSpecRows عبور می‌کند تا مقادیر نوع‌دار و مقدار پایه ساخته شوند؛
    // درج مستقیم، محصول را بی‌صدا از فیلترها حذف می‌کرد.
    const specRows = await buildSpecRows(productId ?? "", specs);

    /*
      محصول، تصاویر و مشخصات یک واحد منطقی‌اند. اگر درج مشخصات شکست بخورد و
      حذفشان جدا کامیت شده باشد، محصول بی‌صدا بدون هیچ مشخصه‌ای می‌ماند و از
      فیلترهای کاتالوگ بیرون می‌افتد — دقیقاً همان حالتی که برای تصاویر هم
      یک بار رخ داد. پس هر چهار نوشتن در یک تراکنش‌اند.
    */
    const id = await db.transaction(async (tx) => {
      let resolved = productId;

      if (resolved) {
        const [existing] = await tx
          .select({ publishedAt: products.publishedAt })
          .from(products)
          .where(eq(products.id, resolved))
          .limit(1);
        await tx
          .update(products)
          .set({ ...values, publishedAt: existing?.publishedAt ?? values.publishedAt })
          .where(eq(products.id, resolved));
      } else {
        const [created] = await tx.insert(products).values(values).returning({ id: products.id });
        resolved = created!.id;
      }

      await tx.delete(productImages).where(eq(productImages.productId, resolved));
      if (images.length > 0) {
        await tx.insert(productImages).values(
          images.map((image, index) => ({
            productId: resolved!,
            url: image.url,
            storageKey: image.storageKey ?? null,
            width: image.width ?? null,
            height: image.height ?? null,
            // فقط مقدار شناخته‌شده پذیرفته می‌شود؛ هر چیز دیگری یعنی نامعلوم
            backdrop: image.backdrop === "light" || image.backdrop === "dark" ? image.backdrop : null,
            alt: image.alt ?? input.name,
            position: index,
            isPrimary: index === 0,
          })),
        );
      }

      await tx.delete(productSpecs).where(eq(productSpecs.productId, resolved));
      if (specRows.length > 0) {
        await tx.insert(productSpecs).values(specRows.map((row) => ({ ...row, productId: resolved! })));
      }

      return resolved!;
    });

    /*
      فایل دارایی‌هایی که مدیر از فهرست برداشته، فقط پس از کامیت شدن تراکنش از
      دیسک پاک می‌شوند؛ وگرنه یک rollback فایلی را نابود می‌کرد که رکوردش هنوز
      هست. حذف فایل تراکنشی نیست، پس شکستش ذخیره را برنمی‌گرداند و فقط لاگ
      می‌شود.
    */
    for (const image of images) {
      if (image.storageKey) previousKeys.delete(image.storageKey);
    }
    let orphaned = 0;
    for (const orphan of previousKeys) {
      orphaned += await deleteAssetByPrefix(orphan);
    }
    if (orphaned > 0) {
      console.error(`[admin] ذخیرهٔ محصول ${id} انجام شد اما ${orphaned} فایل دارایی روی دیسک باقی ماند.`);
    }

    await logActivity({
      userId: user.id,
      action: productId ? "update" : "create",
      entity: "product",
      entityId: id,
      summary: `${productId ? "ویرایش" : "ایجاد"} محصول «${input.name}»`,
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath(`/products/${slug}`);

    return { status: "success", message: productId ? "محصول به‌روزرسانی شد." : "محصول ایجاد شد.", id };
  });
}

export async function deleteProduct(productId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("products");
    const [product] = await db.select({ name: products.name }).from(products).where(eq(products.id, productId)).limit(1);

    /*
      کلیدهای دارایی پیش از حذف خوانده می‌شوند، چون حذف محصول ردیف‌های
      product_images را هم cascade می‌کند و بعد از آن دیگر معلوم نیست کدام فایل
      به این محصول تعلق داشت.

      فیلتر مالکیت لازم است: ردیف‌های قدیمی (پیش از افزوده شدن بررسی مالکیت در
      saveProduct) ممکن است کلیدی از محصول دیگر داشته باشند و حذف محصول نباید
      دارایی محصول دیگری را پاک کند. ردیف‌های میراثی با storage_key تهی —
      فایلشان در public/ است — اصلاً وارد این فهرست نمی‌شوند.
    */
    const ownedKeys = [
      ...new Set(
        (
          await db
            .select({ storageKey: productImages.storageKey })
            .from(productImages)
            .where(eq(productImages.productId, productId))
        )
          .map((row) => row.storageKey)
          .filter((key): key is string => Boolean(key) && isOwnProductAssetPrefix(key!, productId)),
      ),
    ];

    await db.delete(products).where(eq(products.id, productId));

    /*
      فایل‌ها فقط پس از کامیت شدن حذفِ پایگاه داده پاک می‌شوند. ترتیب عکس،
      در صورت شکست تراکنش، دارایی محصولی را نابود می‌کرد که هنوز وجود دارد.
      حذف فایل تراکنشی نیست، پس شکستش حذف محصول را برنمی‌گرداند؛ فقط لاگ
      می‌شود و فایل به‌عنوان یتیمِ مستند باقی می‌ماند.
    */
    let orphaned = 0;
    for (const key of ownedKeys) {
      orphaned += await deleteAssetByPrefix(key);
    }
    if (orphaned > 0) {
      console.error(
        `[admin] حذف محصول ${productId} انجام شد اما ${orphaned} فایل دارایی روی دیسک باقی ماند.`,
      );
    }

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
    const user = await requireWritePermission("products");
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
    const user = await requireWritePermission("categories");

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
    const user = await requireWritePermission("categories");

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
    const user = await requireWritePermission("brands");

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
    const user = await requireWritePermission("brands");
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
    const user = await requireWritePermission("customers");

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

export async function deleteCustomer(customerId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("customers");
    const [customer] = await db
      .select({ fullName: customers.fullName })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!customer) return { status: "error", message: "این مشتری پیدا نشد؛ شاید قبلاً حذف شده باشد." };

    /*
      سفارش‌های مشتری پاک نمی‌شوند: کلید خارجی‌شان set null است، پس سفارش با
      همان نام و شمارهٔ تماسِ ثبت‌شده در خودش می‌ماند و فقط اتصالش به پروندهٔ
      مشتری قطع می‌شود. سابقهٔ فروش نباید با حذف یک پرونده از بین برود.
      یادداشت‌های مشتری اما cascade پاک می‌شوند، چون بیرون از آن پرونده معنایی
      ندارند.
    */
    const detached = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.customerId, customerId));

    await db.delete(customers).where(eq(customers.id, customerId));

    await logActivity({
      userId: user.id,
      action: "delete",
      entity: "customer",
      entityId: customerId,
      summary:
        `حذف مشتری «${customer.fullName}»` +
        (detached.length > 0 ? ` — ${detached.length} سفارش بدون مشتری ماند` : ""),
    });

    revalidatePath("/admin/customers");
    revalidatePath("/admin/orders");
    return {
      status: "success",
      message:
        detached.length > 0
          ? `مشتری حذف شد. ${detached.length} سفارش باقی ماند و بدون مشتری شد.`
          : "مشتری حذف شد.",
    };
  });
}

export async function savePost(
  postId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("posts");

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
    const user = await requireWritePermission("posts");
    await db.delete(posts).where(eq(posts.id, postId));
    await logActivity({ userId: user.id, action: "delete", entity: "post", entityId: postId, summary: "حذف مطلب" });
    revalidatePath("/admin/posts");
    revalidatePath("/news");
    return { status: "success", message: "مطلب حذف شد." };
  });
}

/* ========================================================================== */
/*  مشخصات فنی — واحد، تعریف، اتصال به دسته                                    */
/* ========================================================================== */
/*
 *  این سه اکشن همان چیزی هستند که «مدیریت کاتالوگ بدون کدنویسی» را ممکن
 *  می‌کنند: مدیر می‌تواند واحد تازه بسازد، مشخصه تعریف کند، فیلترپذیرش کند و
 *  به دسته‌بندی وصلش کند. فرانت‌اند بدون تغییر کد آن را نشان می‌دهد، چون
 *  getCategorySpecFacets فیلترها را از همین جدول‌ها می‌سازد.
 */

export async function saveUnit(
  unitId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("products");

    const parsed = unitFormSchema.safeParse({
      code: formData.get("code"),
      label: formData.get("label"),
      symbol: formData.get("symbol") || undefined,
      dimension: formData.get("dimension"),
      toBaseFactor: formData.get("toBaseFactor"),
      isBase: formData.get("isBase"),
      isActive: formData.get("isActive"),
      position: formData.get("position") || 0,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;

    const values = {
      code: input.code,
      label: input.label,
      symbol: input.symbol ?? null,
      dimension: input.dimension,
      toBaseFactor: String(input.toBaseFactor),
      isBase: input.isBase,
      isActive: input.isActive,
      position: input.position,
      updatedAt: new Date(),
    };

    if (unitId) await db.update(units).set(values).where(eq(units.id, unitId));
    else await db.insert(units).values(values);

    /*
     * در هر بُعد باید دقیقاً یک واحد پایه باشد. اگر این واحد پایه اعلام شد،
     * بقیه واحدهای همان بُعد از حالت پایه خارج می‌شوند — وگرنه تبدیل واحد
     * بی‌معنا می‌شد و فیلتر عددی نتیجه اشتباه می‌داد.
     */
    if (input.isBase) {
      await db
        .update(units)
        .set({ isBase: false })
        .where(and(eq(units.dimension, input.dimension), sql`${units.code} <> ${input.code}`));
    }

    await logActivity({
      userId: user.id,
      action: unitId ? "update" : "create",
      entity: "product",
      entityId: unitId ?? undefined,
      summary: `${unitId ? "ویرایش" : "ایجاد"} واحد «${input.label}»`,
    });

    revalidatePath("/admin/specs");
    revalidatePath("/products");
    return { status: "success", message: "واحد ذخیره شد." };
  });
}

export async function saveSpecDefinition(
  definitionId: string | null,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("products");

    const parsed = specDefinitionFormSchema.safeParse({
      key: formData.get("key"),
      label: formData.get("label"),
      description: formData.get("description") || undefined,
      dataType: formData.get("dataType"),
      dimension: formData.get("dimension") || undefined,
      defaultUnitId: formData.get("defaultUnitId") || undefined,
      groupName: formData.get("groupName") || "مشخصات عمومی",
      isFilterable: formData.get("isFilterable"),
      filterUi: formData.get("filterUi") || "NONE",
      isActive: formData.get("isActive"),
      position: formData.get("position") || 0,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;

    // فیلتر بازه‌ای فقط روی مقدار عددی معنا دارد
    if (input.filterUi === "RANGE" && (input.dataType === "TEXT" || input.dataType === "BOOLEAN")) {
      return { status: "error", message: "فیلتر بازه‌ای فقط برای مشخصه عددی معنا دارد." };
    }

    const values = {
      key: input.key,
      label: input.label,
      description: input.description ?? null,
      dataType: input.dataType,
      dimension: input.dimension ?? null,
      defaultUnitId: input.defaultUnitId || null,
      groupName: input.groupName,
      isFilterable: input.isFilterable,
      filterUi: input.filterUi,
      isActive: input.isActive,
      position: input.position,
      updatedAt: new Date(),
    };

    if (definitionId) await db.update(specDefinitions).set(values).where(eq(specDefinitions.id, definitionId));
    else await db.insert(specDefinitions).values(values);

    await logActivity({
      userId: user.id,
      action: definitionId ? "update" : "create",
      entity: "product",
      entityId: definitionId ?? undefined,
      summary: `${definitionId ? "ویرایش" : "ایجاد"} مشخصه «${input.label}»`,
    });

    revalidatePath("/admin/specs");
    revalidatePath("/products");
    return { status: "success", message: "مشخصه ذخیره شد." };
  });
}

export async function deleteSpecDefinition(definitionId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("products");

    /*
     * حذف تعریف، definition_id ردیف‌های مقدار را null می‌کند (ON DELETE SET
     * NULL) و آن مقادیر بی‌صدا از فیلترها بیرون می‌افتند. پس به‌جای حذف
     * خاموش، تعداد وابستگی را گزارش و غیرفعال‌کردن را پیشنهاد می‌کنیم.
     */
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(productSpecs)
      .where(eq(productSpecs.definitionId, definitionId));

    const used = row?.n ?? 0;
    if (used > 0) {
      return {
        status: "error",
        message: `این مشخصه روی ${used} مقدار محصول استفاده شده است. به‌جای حذف، آن را غیرفعال کنید.`,
      };
    }

    await db.delete(specDefinitions).where(eq(specDefinitions.id, definitionId));
    await logActivity({
      userId: user.id, action: "delete", entity: "product", entityId: definitionId, summary: "حذف مشخصه فنی",
    });

    revalidatePath("/admin/specs");
    revalidatePath("/products");
    return { status: "success", message: "مشخصه حذف شد." };
  });
}

export async function saveCategorySpec(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("categories");

    const parsed = categorySpecFormSchema.safeParse({
      categoryId: formData.get("categoryId"),
      definitionId: formData.get("definitionId"),
      isKey: formData.get("isKey"),
      position: formData.get("position") || 0,
    });

    if (!parsed.success) {
      return { status: "error", message: "لطفاً خطاهای فرم را برطرف کنید.", errors: toFieldErrors(parsed.error) };
    }

    const input = parsed.data;

    await db
      .insert(categorySpecs)
      .values({
        categoryId: input.categoryId,
        definitionId: input.definitionId,
        isKey: input.isKey,
        position: input.position,
      })
      .onConflictDoUpdate({
        target: [categorySpecs.categoryId, categorySpecs.definitionId],
        set: { isKey: input.isKey, position: input.position },
      });

    await logActivity({
      userId: user.id, action: "update", entity: "category", entityId: input.categoryId,
      summary: "اتصال مشخصه فنی به دسته‌بندی",
    });

    revalidatePath("/admin/specs");
    revalidatePath("/products");
    return { status: "success", message: "اتصال ذخیره شد." };
  });
}

export async function deleteCategorySpec(linkId: string): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("categories");
    await db.delete(categorySpecs).where(eq(categorySpecs.id, linkId));
    await logActivity({
      userId: user.id, action: "delete", entity: "category", entityId: linkId,
      summary: "حذف اتصال مشخصه از دسته‌بندی",
    });
    revalidatePath("/admin/specs");
    revalidatePath("/products");
    return { status: "success", message: "اتصال حذف شد." };
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
    const user = await requireWritePermission("projects");

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
    const user = await requireWritePermission("projects");
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
    const user = await requireWritePermission("messages");
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
    const actor = await requireWritePermission("users");

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

export async function deleteUser(userId: string): Promise<ActionState> {
  return guard(async () => {
    const actor = await requireWritePermission("users");

    if (userId === actor.id) {
      return { status: "error", message: "نمی‌توانید حساب خودتان را حذف کنید." };
    }

    const [target] = await db
      .select({ name: users.name, role: users.role })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!target) return { status: "error", message: "این کاربر پیدا نشد؛ شاید قبلاً حذف شده باشد." };

    /*
      حذف آخرین مدیر ارشدِ فعال یعنی قفل شدن پنل روی همه. بررسی روی «فعال»
      انجام می‌شود، نه صرفاً نقش: یک OWNER غیرفعال نمی‌تواند وارد شود، پس
      جانشین حساب نمی‌آید.
    */
    if (target.role === "OWNER") {
      const others = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.role, "OWNER"), eq(users.isActive, true), sql`${users.id} <> ${userId}`));
      if (others.length === 0) {
        return { status: "error", message: "این تنها مدیر ارشد فعال است و حذفش پنل را بدون مدیر می‌گذارد." };
      }
    }

    /*
      نشست‌ها با کلید خارجی cascade پاک می‌شوند، ولی صریح باطلشان می‌کنیم تا
      اگر روزی آن کلید عوض شد، کاربرِ حذف‌شده با کوکی قدیمی داخل نماند.
    */
    await destroyAllSessions(userId);
    await db.delete(users).where(eq(users.id, userId));

    await logActivity({
      userId: actor.id,
      action: "delete",
      entity: "user",
      entityId: userId,
      summary: `حذف کاربر پنل «${target.name}»`,
    });

    revalidatePath("/admin/users");
    return { status: "success", message: "کاربر حذف شد." };
  });
}

/* ========================================================================== */
/*  تنظیمات                                                                     */
/* ========================================================================== */

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return guard(async () => {
    const user = await requireWritePermission("settings");

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

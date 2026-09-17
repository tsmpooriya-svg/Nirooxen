"use server";

/**
 * =============================================================================
 *  ماژول سفارش — عملیات نوشتن (Server Actions)
 * =============================================================================
 *  مسیر «ثبت سفارش / استعلام قیمت» از سایت عمومی. خروجی این عملیات مستقیماً
 *  در پنل مدیریت به‌عنوان یک پرونده باز ظاهر می‌شود تا کارشناس تماس بگیرد.
 *
 *  نکته معماری: همین اکشن هم استعلام (QUOTE) و هم سفارش (ORDER) را می‌سازد.
 *  وقتی فاز پرداخت آنلاین اضافه شود، فقط شاخه‌ای برای هدایت به درگاه به انتهای
 *  createOrder افزوده می‌شود؛ نه مدل داده تغییر می‌کند، نه فرم‌ها.
 * =============================================================================
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { after } from "next/server";

import { db } from "@/db";
import { newOrderMessage, notifyStaff } from "@/lib/notify";
import {
  counters,
  customers,
  orderEvents,
  orderItems,
  orders,
  products,
  type OrderType,
} from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { toFieldErrors, orderInputSchema, type FieldErrors } from "@/lib/validation";
import { normalizePhone } from "@/lib/utils";

export type OrderActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  orderNumber?: string;
  errors?: FieldErrors;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** شماره پرونده خوانا: ARQ-1404-0042 */
async function nextOrderNumber(tx: Tx, type: OrderType): Promise<string> {
  const key = `order:${type}`;
  const [row] = await tx
    .insert(counters)
    .values({ key, value: 1 })
    .onConflictDoUpdate({ target: counters.key, set: { value: sql`${counters.value} + 1` } })
    .returning();

  const year = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric" })
    .format(new Date())
    .replace(/\D/g, "");

  return `AR${type === "QUOTE" ? "Q" : "O"}-${year}-${String(row!.value).padStart(4, "0")}`;
}

/**
 * ثبت استعلام قیمت یا سفارش.
 *
 * مراحل: محدودیت نرخ → اعتبارسنجی → تطبیق/ساخت مشتری → قیمت‌گذاری از روی
 * پایگاه داده (نه از روی ورودی کاربر) → ثبت پرونده و خط زمانی.
 */
export async function createOrder(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  const limit = rateLimit(`order:${ip}`, RATE_LIMITS.order);
  if (!limit.success) {
    return {
      status: "error",
      message: `تعداد درخواست‌های شما زیاد است. لطفاً ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
    };
  }

  let itemsRaw: unknown = [];
  try {
    itemsRaw = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { status: "error", message: "اطلاعات محصولات نامعتبر است." };
  }

  const parsed = orderInputSchema.safeParse({
    type: formData.get("type") ?? "QUOTE",
    source: formData.get("source") ?? "PRODUCT_PAGE",
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    contactEmail: formData.get("contactEmail") ?? undefined,
    contactCompany: formData.get("contactCompany") ?? undefined,
    contactCity: formData.get("contactCity") ?? undefined,
    note: formData.get("note") ?? undefined,
    website: formData.get("website") ?? undefined,
    items: itemsRaw,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "لطفاً خطاهای فرم را برطرف کنید.",
      errors: toFieldErrors(parsed.error),
    };
  }

  const input = parsed.data;

  // honeypot — ربات‌ها این فیلد مخفی را پر می‌کنند
  if (input.website) {
    return { status: "success", message: "درخواست شما ثبت شد.", orderNumber: "—" };
  }

  try {
    /* ---- قیمت‌گذاری معتبر: همیشه از پایگاه داده، نه از ورودی کاربر ---- */
    const productIds = input.items.map((i) => i.productId).filter(Boolean) as string[];
    const dbProducts = productIds.length
      ? await db
          .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            sku: products.sku,
            unit: products.unit,
            price: products.price,
            priceMode: products.priceMode,
            minOrderQty: products.minOrderQty,
            imageUrl: sql<string | null>`(
              select pi.url from product_images pi
              where pi.product_id = products.id
              order by pi.is_primary desc, pi.position asc
              limit 1
            )`,
          })
          .from(products)
          .where(and(eq(products.status, "PUBLISHED"), inArray(products.id, productIds)))
      : [];

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    /*
      هر قلم باید به یک محصول منتشرشده برسد. اگر شناسه‌ای وجود نداشته باشد یا به
      محصول پیش‌نویس/بایگانی‌شده اشاره کند، کل درخواست رد می‌شود؛ در غیر این صورت
      قلمی با product_id تهی و نامِ ارسالی کلاینت در پرونده ثبت می‌شد.
    */
    const resolved = input.items.map((item) =>
      item.productId ? productMap.get(item.productId) : undefined,
    );

    if (resolved.some((product) => !product)) {
      return {
        status: "error",
        message:
          "برخی از اقلام سبد شما دیگر در دسترس نیستند. لطفاً سبد را بازبینی کنید و دوباره تلاش کنید.",
      };
    }

    const lines = input.items.map((item, index) => {
      // پس از بررسی بالا، حتماً مقدار دارد
      const product = resolved[index]!;
      const quantity = Math.max(item.quantity, product.minOrderQty);
      const unitPrice = product.priceMode === "PUBLIC" ? product.price : null;
      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        productSlug: product.slug,
        imageUrl: product.imageUrl,
        quantity,
        unit: product.unit,
        unitPrice,
        lineTotal: unitPrice ? unitPrice * quantity : null,
        note: item.note ?? null,
      };
    });

    const subtotal = lines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);
    const phone = normalizePhone(input.contactPhone);

    /*
      شماره‌گذاری، مشتری، پرونده، اقلام و رویداد یک واحد منطقی‌اند: اگر میان دو
      نوشتن خطایی رخ دهد نباید پرونده‌ای بدون قلم در پنل باقی بماند.
    */
    const number = await db.transaction(async (tx) => {
      const orderNumber = await nextOrderNumber(tx, input.type);

      /* ---------- مشتری: اگر شماره قبلاً ثبت شده، همان رکورد به‌روز شود ---------- */
      const [customer] = await tx
        .insert(customers)
        .values({
          fullName: input.contactName,
          phone,
          email: input.contactEmail ?? null,
          companyName: input.contactCompany ?? null,
          city: input.contactCity ?? null,
          type: input.contactCompany ? "COMPANY" : "INDIVIDUAL",
        })
        .onConflictDoUpdate({
          target: customers.phone,
          set: {
            fullName: input.contactName,
            email: sql`coalesce(excluded.email, ${customers.email})`,
            companyName: sql`coalesce(excluded.company_name, ${customers.companyName})`,
            city: sql`coalesce(excluded.city, ${customers.city})`,
            updatedAt: new Date(),
          },
        })
        .returning();

      /* --------------------------- ثبت پرونده --------------------------- */
      const [order] = await tx
        .insert(orders)
        .values({
          number: orderNumber,
          type: input.type,
          source: input.source,
          status: "NEW",
          priority: lines.length > 3 ? "HIGH" : "NORMAL",
          customerId: customer!.id,
          contactName: input.contactName,
          contactPhone: phone,
          contactEmail: input.contactEmail ?? null,
          contactCompany: input.contactCompany ?? null,
          contactCity: input.contactCity ?? null,
          note: input.note ?? null,
          subtotal,
          total: subtotal,
          ip,
          userAgent: headerList.get("user-agent")?.slice(0, 400) ?? null,
          referrer: headerList.get("referer")?.slice(0, 400) ?? null,
        })
        .returning();

      await tx.insert(orderItems).values(lines.map((line) => ({ ...line, orderId: order!.id })));

      await tx.insert(orderEvents).values({
        orderId: order!.id,
        type: "CREATED",
        message:
          input.type === "QUOTE"
            ? "درخواست استعلام قیمت از سایت ثبت شد."
            : "سفارش جدید از سایت ثبت شد.",
        meta: { itemCount: lines.length, subtotal },
      });

      // شمارنده سفارش محصولات — برای گزارش «پرفروش‌ترین‌ها»
      for (const line of lines) {
        if (!line.productId) continue;
        await tx
          .update(products)
          .set({ orderCount: sql`${products.orderCount} + 1` })
          .where(eq(products.id, line.productId));
      }

      return orderNumber;
    });

    revalidatePath("/admin");
    revalidatePath("/admin/orders");

    /*
      اعلان پس از ارسال پاسخ به مشتری فرستاده می‌شود: نه او منتظر سرویس پیامک
      می‌ماند، و نه قطعی آن سرویس درخواستی را که همین حالا ثبت شده از بین
      می‌برد. اگر پیامک تنظیم نشده باشد، notifyStaff بی‌صدا برمی‌گردد.
    */
    after(() =>
      notifyStaff(
        newOrderMessage({
          type: input.type,
          number,
          contactName: input.contactName,
          contactPhone: input.contactPhone,
          itemCount: lines.length,
        }),
      ),
    );

    return {
      status: "success",
      message:
        input.type === "QUOTE"
          ? "درخواست استعلام شما ثبت شد. کارشناسان ما در اولین فرصت کاری تماس می‌گیرند."
          : "سفارش شما ثبت شد. برای هماهنگی نهایی با شما تماس گرفته می‌شود.",
      orderNumber: number,
    };
  } catch (error) {
    console.error("[orders] ثبت سفارش ناموفق:", error);
    return {
      status: "error",
      message: "در ثبت درخواست خطایی رخ داد. لطفاً دوباره تلاش کنید یا تلفنی تماس بگیرید.",
    };
  }
}

/**
 * طرح‌های اعتبارسنجی مشترک بین کلاینت و سرور (Zod).
 * پیام‌های خطا فارسی و کاربرپسند هستند — مستقیماً کنار فیلد نمایش داده می‌شوند.
 */
import { z } from "zod";

import { isValidIranianPhone, normalizePhone, toEnDigits } from "@/lib/utils";

const phoneSchema = z
  .string({ error: "شماره تماس الزامی است" })
  .trim()
  .min(1, "شماره تماس الزامی است")
  .transform(normalizePhone)
  .refine(isValidIranianPhone, "شماره تماس معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)");

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "ایمیل معتبر نیست")
  .optional()
  .or(z.literal("").transform(() => undefined));

/**
 * چک‌باکس فرم: مقدارهای "on" / "true" / true را true و بقیه را false می‌کند.
 * z.coerce.boolean() اینجا اشتباه است چون رشته "false" را هم true می‌کند.
 */
const checkbox = z
  .union([z.boolean(), z.string(), z.undefined(), z.null()])
  .transform((v) => v === true || v === "on" || v === "true" || v === "1")
  .pipe(z.boolean());

const numericString = z
  .string()
  .trim()
  .transform((v) => toEnDigits(v));

/* ------------------------- ثبت سفارش / استعلام ---------------------------- */

export const orderItemInputSchema = z.object({
  productId: z.string().uuid().optional(),
  productName: z.string().trim().min(1).max(220),
  productSku: z.string().trim().max(64).optional(),
  productSlug: z.string().trim().max(250).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(32).default("دستگاه"),
  unitPrice: z.number().int().nonnegative().nullable().optional(),
  quantity: z.coerce.number().int().min(1, "حداقل تعداد ۱ است").max(9999),
  note: z.string().trim().max(500).optional(),
});

export const orderInputSchema = z.object({
  type: z.enum(["QUOTE", "ORDER"]).default("QUOTE"),
  source: z.enum(["PRODUCT_PAGE", "CART", "CONTACT_FORM", "PHONE", "ADMIN", "OTHER"]).default("PRODUCT_PAGE"),
  contactName: z
    .string({ error: "نام و نام خانوادگی الزامی است" })
    .trim()
    .min(3, "نام باید حداقل ۳ حرف باشد")
    .max(160),
  contactPhone: phoneSchema,
  contactEmail: optionalEmail,
  contactCompany: z.string().trim().max(190).optional(),
  contactCity: z.string().trim().max(80).optional(),
  note: z.string().trim().max(2000).optional(),
  items: z.array(orderItemInputSchema).min(1, "حداقل یک محصول باید انتخاب شود").max(50),
  /** honeypot ضد ربات — باید خالی بماند */
  website: z.string().max(0).optional(),
});

export type OrderInput = z.infer<typeof orderInputSchema>;

/* ------------------------------ فرم تماس ---------------------------------- */

export const contactInputSchema = z.object({
  name: z.string().trim().min(3, "نام باید حداقل ۳ حرف باشد").max(160),
  phone: phoneSchema,
  email: optionalEmail,
  subject: z.string().trim().max(190).optional(),
  message: z.string().trim().min(10, "متن پیام باید حداقل ۱۰ حرف باشد").max(3000),
  website: z.string().max(0).optional(),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export const subscribeSchema = z.object({
  email: z.string().trim().refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "ایمیل معتبر نیست"),
});

/* ------------------------------- ورود پنل --------------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().min(1, "ایمیل الزامی است").refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "ایمیل معتبر نیست"),
  password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد").max(128),
});

/* ------------------------------- محصولات ---------------------------------- */

export const productFormSchema = z.object({
  name: z.string().trim().min(3, "نام محصول الزامی است").max(220),
  slug: z.string().trim().max(250).optional(),
  sku: z.string().trim().max(64).optional(),
  model: z.string().trim().max(120).optional(),
  shortDescription: z.string().trim().max(400).optional(),
  description: z.string().trim().max(20000).optional(),
  categoryId: z.string().uuid("انتخاب دسته‌بندی الزامی است"),
  brandId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  priceMode: z.enum(["PUBLIC", "ON_REQUEST", "CALL"]).default("ON_REQUEST"),
  price: numericString
    .optional()
    .transform((v) => (v ? Number(v.replace(/,/g, "")) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), "قیمت معتبر نیست"),
  comparePrice: numericString
    .optional()
    .transform((v) => (v ? Number(v.replace(/,/g, "")) : undefined))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), "قیمت معتبر نیست"),
  unit: z.string().trim().max(32).default("دستگاه"),
  stockStatus: z
    .enum(["IN_STOCK", "LOW_STOCK", "ORDER_ONLY", "OUT_OF_STOCK", "DISCONTINUED"])
    .default("ORDER_ONLY"),
  leadTimeDays: z.coerce.number().int().min(0).max(365).optional(),
  minOrderQty: z.coerce.number().int().min(1).max(9999).default(1),
  warrantyMonths: z.coerce.number().int().min(0).max(240).optional(),
  isFeatured: checkbox.default(false),
  isNew: checkbox.default(false),
  tags: z.array(z.string().trim().max(48)).max(20).default([]),
  metaTitle: z.string().trim().max(190).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

/* ----------------------------- دسته‌بندی و برند --------------------------- */

export const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "نام دسته‌بندی الزامی است").max(160),
  slug: z.string().trim().max(190).optional(),
  description: z.string().trim().max(2000).optional(),
  icon: z.string().trim().max(48).optional(),
  parentId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: checkbox.default(true),
  isFeatured: checkbox.default(false),
  metaTitle: z.string().trim().max(190).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

export const brandFormSchema = z.object({
  name: z.string().trim().min(2, "نام برند الزامی است").max(120),
  slug: z.string().trim().max(160).optional(),
  latinName: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.string().trim().max(200).optional(),
  logoUrl: z.string().trim().max(500).optional(),
  isFeatured: checkbox.default(false),
  isActive: checkbox.default(true),
  position: z.coerce.number().int().min(0).max(9999).default(0),
});

/* --------------------------------- اخبار ---------------------------------- */

export const postFormSchema = z.object({
  title: z.string().trim().min(3, "عنوان الزامی است").max(220),
  slug: z.string().trim().max(250).optional(),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(20, "متن مطلب خیلی کوتاه است").max(80000),
  coverUrl: z.string().trim().max(500).optional(),
  category: z.string().trim().max(80).default("اخبار"),
  tags: z.array(z.string().trim().max(48)).max(20).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  isFeatured: checkbox.default(false),
  metaTitle: z.string().trim().max(190).optional(),
  metaDescription: z.string().trim().max(320).optional(),
});

/* -------------------------------- پروژه‌ها -------------------------------- */

export const projectFormSchema = z.object({
  title: z.string().trim().min(3, "عنوان الزامی است").max(220),
  slug: z.string().trim().max(250).optional(),
  client: z.string().trim().max(190).optional(),
  location: z.string().trim().max(160).optional(),
  year: z.string().trim().max(12).optional(),
  capacity: z.string().trim().max(120).optional(),
  summary: z.string().trim().max(600).optional(),
  description: z.string().trim().max(20000).optional(),
  coverUrl: z.string().trim().max(500).optional(),
  tags: z.array(z.string().trim().max(48)).max(20).default([]),
  position: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: checkbox.default(true),
  isFeatured: checkbox.default(false),
});

/* -------------------------------- مشتریان --------------------------------- */

export const customerFormSchema = z.object({
  fullName: z.string().trim().min(3, "نام الزامی است").max(160),
  phone: phoneSchema,
  email: optionalEmail,
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  companyName: z.string().trim().max(190).optional(),
  economicCode: z.string().trim().max(32).optional(),
  nationalId: z.string().trim().max(24).optional(),
  province: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  address: z.string().trim().max(500).optional(),
  postalCode: z.string().trim().max(16).optional(),
  tags: z.array(z.string().trim().max(48)).max(20).default([]),
});

/* ------------------------------- کاربران ---------------------------------- */

export const userFormSchema = z.object({
  name: z.string().trim().min(3, "نام الزامی است").max(120),
  email: z.string().trim().refine((v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "ایمیل معتبر نیست"),
  phone: z.string().trim().max(24).optional(),
  role: z.enum(["OWNER", "ADMIN", "SALES", "EDITOR", "VIEWER"]).default("SALES"),
  password: z
    .string()
    .min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد")
    .max(128)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  isActive: checkbox.default(true),
});

/* -------------------------- تبدیل خطا به فرم ------------------------------ */

export type FieldErrors = Record<string, string>;

/** تبدیل ZodError به نگاشت ساده «نام فیلد → پیام» برای نمایش در فرم */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

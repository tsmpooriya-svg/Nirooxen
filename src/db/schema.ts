/**
 * =============================================================================
 *  ARIA — طرح پایگاه داده (Drizzle ORM / PostgreSQL)
 * =============================================================================
 *  دامنه: کاتالوگ تجهیزات صنعتی + استعلام قیمت و ثبت سفارش + محتوا + مدیریت
 *
 *  قرارداد مبالغ: تمام قیمت‌ها عدد صحیح و بر حسب «تومان» ذخیره می‌شوند.
 *  فیلد currency برای پشتیبانی از ارزهای دیگر در آینده نگه داشته شده است.
 *
 *  آمادگی فاز دوم (سبد خرید + درگاه پرداخت):
 *   • جدول orders از ابتدا فیلدهای paymentStatus/paymentMethod/paidAt دارد
 *   • جدول payments ساخته شده و منتظر اتصال درگاه است
 *   • orderType بین QUOTE (استعلام) و ORDER (سفارش) تمایز می‌گذارد
 * =============================================================================
 */

import { relations, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Enums                                                                      */
/* -------------------------------------------------------------------------- */

export const userRoleEnum = pgEnum("user_role", [
  "OWNER", // مدیر ارشد — دسترسی کامل
  "ADMIN", // مدیر — همه بخش‌ها به جز کاربران
  "SALES", // کارشناس فروش — سفارش‌ها، استعلام‌ها، مشتریان
  "EDITOR", // تولید محتوا — محصولات، اخبار، پروژه‌ها
  "VIEWER", // فقط مشاهده
]);

export const productStatusEnum = pgEnum("product_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);

/** نحوه نمایش قیمت روی سایت */
export const priceModeEnum = pgEnum("price_mode", [
  "PUBLIC", // قیمت نمایش داده می‌شود
  "ON_REQUEST", // استعلام قیمت
  "CALL", // تماس بگیرید
]);

export const stockStatusEnum = pgEnum("stock_status", [
  "IN_STOCK",
  "LOW_STOCK",
  "ORDER_ONLY",
  "OUT_OF_STOCK",
  "DISCONTINUED",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "CATALOG",
  "MANUAL",
  "CERTIFICATE",
  "DATASHEET",
  "DRAWING",
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "RELATED",
  "ACCESSORY",
  "ALTERNATIVE",
  "SPARE_PART",
]);

/* ----------------------- مشخصات فنی نوع‌دار (فاز ۳) ----------------------- */

/** نوع داده یک مشخصه — تعیین می‌کند کدام ستون مقدار پر می‌شود */
export const specDataTypeEnum = pgEnum("spec_data_type", [
  "NUMBER", // یک عدد: value_num
  "RANGE", // بازه عددی: value_num تا value_num_max (هر طرف می‌تواند باز باشد)
  "TEXT", // متن آزاد یا گزینه‌ای: value_text
  "BOOLEAN", // بله/خیر: value_bool
]);

/** شکل نمایش فیلتر در ستون کناری — مدیر آن را انتخاب می‌کند */
export const specFilterUiEnum = pgEnum("spec_filter_ui", [
  "RANGE", // دو ورودی کمینه/بیشینه
  "CHECKBOX", // چند انتخابی از مقادیر موجود
  "BOOLEAN", // فقط دارد/ندارد
  "NONE", // فیلتر نشود
]);

/**
 * بُعد فیزیکی یک واحد.
 *
 * فیلتر عددی فقط داخل یک بُعد معنا دارد؛ واحدهای هم‌بُعد با ضریب به واحد
 * پایه همان بُعد تبدیل می‌شوند تا مقایسه ممکن شود.
 */
export const unitDimensionEnum = pgEnum("unit_dimension", [
  "POWER",
  "LENGTH",
  "FLOW",
  "PRESSURE",
  "VOLUME",
  "TEMPERATURE",
  "VOLTAGE",
  "MASS",
  "ROTATION",
  "COUNT",
  "OTHER",
]);

export const customerTypeEnum = pgEnum("customer_type", ["INDIVIDUAL", "COMPANY"]);

export const orderTypeEnum = pgEnum("order_type", ["QUOTE", "ORDER"]);

export const orderStatusEnum = pgEnum("order_status", [
  "NEW", // ثبت شده
  "REVIEWING", // در حال بررسی
  "QUOTED", // قیمت اعلام شد
  "AWAITING_CUSTOMER", // منتظر پاسخ مشتری
  "CONFIRMED", // تأیید نهایی
  "IN_PROGRESS", // در حال آماده‌سازی
  "SHIPPED", // ارسال شد
  "COMPLETED", // تکمیل شد
  "CANCELLED", // لغو شد
  "REJECTED", // رد شد
]);

export const orderPriorityEnum = pgEnum("order_priority", ["LOW", "NORMAL", "HIGH", "URGENT"]);

export const orderSourceEnum = pgEnum("order_source", [
  "PRODUCT_PAGE",
  "CART",
  "CONTACT_FORM",
  "PHONE",
  "ADMIN",
  "OTHER",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "NOT_APPLICABLE",
  "UNPAID",
  "PENDING",
  "PAID",
  "PARTIALLY_PAID",
  "REFUNDED",
  "FAILED",
]);

export const orderEventTypeEnum = pgEnum("order_event_type", [
  "CREATED",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "ASSIGNED",
  "QUOTE_SENT",
  "CONTACTED",
  "PAYMENT",
  "SYSTEM",
]);

export const postStatusEnum = pgEnum("post_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const messageStatusEnum = pgEnum("message_status", [
  "NEW",
  "READ",
  "REPLIED",
  "ARCHIVED",
  "SPAM",
]);

/* -------------------------------------------------------------------------- */
/*  کاربران و نشست‌ها                                                          */
/* -------------------------------------------------------------------------- */

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    email: varchar("email", { length: 190 }).notNull(),
    phone: varchar("phone", { length: 24 }),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("SALES"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_key").on(t.email), index("users_role_idx").on(t.role, t.isActive)],
);

/** نشست‌های فعال پنل — امکان ابطال از راه دور را می‌دهد */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 128 }).notNull(),
    userAgent: text("user_agent"),
    ip: varchar("ip", { length: 64 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("sessions_token_key").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    index("sessions_expiry_idx").on(t.expiresAt),
  ],
);

/* -------------------------------------------------------------------------- */
/*  کاتالوگ                                                                     */
/* -------------------------------------------------------------------------- */

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 190 }).notNull(),
    description: text("description"),
    /** کلید آیکون از مجموعه آیکون داخلی، مثلاً "pump" */
    icon: varchar("icon", { length: 48 }),
    imageUrl: text("image_url"),
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    metaTitle: varchar("meta_title", { length: 190 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    index("categories_parent_idx").on(t.parentId, t.position),
    index("categories_active_idx").on(t.isActive),
  ],
);

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    latinName: varchar("latin_name", { length: 120 }),
    logoUrl: text("logo_url"),
    country: varchar("country", { length: 80 }),
    description: text("description"),
    website: text("website"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    position: integer("position").notNull().default(0),
    metaTitle: varchar("meta_title", { length: 190 }),
    metaDescription: text("meta_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("brands_slug_key").on(t.slug),
    index("brands_active_idx").on(t.isActive, t.position),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 220 }).notNull(),
    slug: varchar("slug", { length: 250 }).notNull(),
    sku: varchar("sku", { length: 64 }),
    /** مدل/نام لاتین برای جستجوی فنی */
    model: varchar("model", { length: 120 }),
    shortDescription: text("short_description"),
    description: text("description"),

    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: uuid("brand_id").references(() => brands.id, { onDelete: "set null" }),

    status: productStatusEnum("status").notNull().default("DRAFT"),
    priceMode: priceModeEnum("price_mode").notNull().default("ON_REQUEST"),
    /** قیمت به تومان */
    price: integer("price"),
    comparePrice: integer("compare_price"),
    currency: varchar("currency", { length: 8 }).notNull().default("IRT"),

    /*
     * شرط قیمتی — مثل «افزایش ۳٪» یا «تخفیف بر اساس تعداد». عمداً از price جدا
     * است: قیمت پایه هرگز نباید شرط را در خود حل کند. در tags هم نمی‌آید چون
     * tags عمومی است و در جست‌وجو و محصولات مرتبط مشارکت می‌کند.
     */
    priceConditionCode: varchar("price_condition_code", { length: 32 }),
    priceConditionText: varchar("price_condition_text", { length: 200 }),
    /** فروش ویژه — بدون هیچ قیمت مقایسه‌ای ساختگی */
    isPromotional: boolean("is_promotional").notNull().default(false),
    unit: varchar("unit", { length: 32 }).notNull().default("دستگاه"),

    stockStatus: stockStatusEnum("stock_status").notNull().default("ORDER_ONLY"),
    leadTimeDays: integer("lead_time_days"),
    minOrderQty: integer("min_order_qty").notNull().default(1),
    warrantyMonths: integer("warranty_months"),

    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    position: integer("position").notNull().default(0),

    viewCount: integer("view_count").notNull().default(0),
    orderCount: integer("order_count").notNull().default(0),

    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),

    metaTitle: varchar("meta_title", { length: 190 }),
    metaDescription: text("meta_description"),

    /*
     * ارجاع خنثای منبع داده — فقط کد داخلی. هرگز نباید نام فروشنده، کانال،
     * شماره تماس یا نشانی در آن بیاید و در هیچ مسیر عمومی خوانده نمی‌شود.
     */
    sourceRef: varchar("source_ref", { length: 64 }),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_category_idx").on(t.categoryId, t.status),
    index("products_brand_idx").on(t.brandId),
    index("products_featured_idx").on(t.status, t.isFeatured),
    index("products_published_idx").on(t.status, t.publishedAt),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    /*
     * ارجاع مستقل از provider به دارایی آپلودشده — پیشوند مشترک نسخه‌ها.
     * برای رکوردهای قدیمی که فایلشان در public/ است تهی می‌ماند و url مبنا است.
     */
    storageKey: text("storage_key"),
    width: integer("width"),
    height: integer("height"),
    alt: varchar("alt", { length: 220 }),
    position: integer("position").notNull().default(0),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

/** مشخصات فنی، گروه‌بندی‌شده برای رندر «برگه مشخصات» */
/* -------------------------------------------------------------------------- */
/*  مشخصات فنی نوع‌دار                                                          */
/* -------------------------------------------------------------------------- */

/**
 * واحدهای اندازه‌گیری.
 *
 * هر واحد به یک بُعد فیزیکی تعلق دارد و با `toBaseFactor` به واحد پایه همان
 * بُعد تبدیل می‌شود. بدون این تبدیل، فیلتر عددی روی «توان» بی‌معنا می‌شد؛
 * چون در کاتالوگ همین حالا اسب بخار، کیلووات و وات کنار هم استفاده شده‌اند.
 *
 * مقدار پایه هنگام ذخیره محاسبه و در `product_specs.value_base` نگهداری
 * می‌شود تا کوئری بازه‌ای بتواند از ایندکس استفاده کند.
 */
/**
 * مشاهدات قیمت از منابع مختلف و تاریخ‌های مختلف. قیمت جاری محصول در
 * products.price می‌ماند؛ این جدول تاریخچه را نگه می‌دارد تا با هر به‌روزرسانی
 * قیمت، مشاهدهٔ قبلی از بین نرود. هیچ مسیر عمومی از آن نمی‌خواند.
 */
export const productPriceObservations = pgTable(
  "product_price_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** کد خنثای منبع — بدون هویت فروشنده */
    sourceRef: varchar("source_ref", { length: 64 }).notNull(),
    /*
     * تاریخ چاپ‌شدهٔ منبع؛ ممکن است فقط ماه و سال باشد. رشتهٔ خالی یعنی منبع
     * تاریخی چاپ نکرده — عمداً NOT NULL است، چون در ایندکس یکتا مقدار NULL با
     * NULL برابر شمرده نمی‌شود و ورود دوباره ردیف تکراری می‌ساخت.
     */
    sourceDate: varchar("source_date", { length: 16 }).notNull().default(""),
    /** مقدار دقیقاً همان‌طور که در منبع چاپ شده — هرگز اصلاح نمی‌شود */
    rawPrice: varchar("raw_price", { length: 32 }),
    /** عدد پاک‌شده پیش از تبدیل واحد */
    normalizedPrice: numeric("normalized_price", { precision: 20, scale: 0 }),
    /** ضریب مقیاس بخش منبع (مثلاً ۱۰۰۰ برای فهرست هزارتومانی) */
    priceScale: integer("price_scale").notNull().default(1),
    /** مقدار نهایی به تومان — همان واحدی که products.price دارد */
    finalPrice: integer("final_price"),
    currency: varchar("currency", { length: 8 }),
    priceStatus: varchar("price_status", { length: 32 }),
    conditionCode: varchar("condition_code", { length: 32 }),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** یک منبع در یک تاریخ فقط یک مشاهده برای هر محصول دارد — ورود دوباره بی‌اثر است */
    uniqueIndex("price_obs_unique").on(t.productId, t.sourceRef, t.sourceDate),
    index("price_obs_product_idx").on(t.productId, t.sourceDate),
  ],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** شناسه ماشینی، مثل "kw" یا "hp" */
    code: varchar("code", { length: 32 }).notNull(),
    /** برچسب فارسی که به کاربر نشان داده می‌شود، مثل «کیلووات» */
    label: varchar("label", { length: 64 }).notNull(),
    /** نماد کوتاه اختیاری، مثل kW */
    symbol: varchar("symbol", { length: 16 }),
    dimension: unitDimensionEnum("dimension").notNull().default("OTHER"),
    /** ضریب تبدیل به واحد پایهٔ همین بُعد */
    toBaseFactor: numeric("to_base_factor", { precision: 20, scale: 10 }).notNull().default("1"),
    /** واحد پایهٔ بُعد — در هر بُعد باید دقیقاً یکی true باشد */
    isBase: boolean("is_base").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("units_code_key").on(t.code),
    index("units_dimension_idx").on(t.dimension, t.position),
  ],
);

/**
 * تعریف یک مشخصه فنی — منبع حقیقت برای برچسب، نوع داده، واحد و فیلترپذیری.
 *
 * این جدول همان چیزی است که پنل مدیریت آینده ویرایش می‌کند: مدیر یک مشخصه
 * تازه می‌سازد، نوع داده و واحد پیش‌فرضش را انتخاب می‌کند و تعیین می‌کند
 * فیلترپذیر باشد یا نه. فرانت‌اند بدون تغییر کد آن را نمایش می‌دهد.
 */
export const specDefinitions = pgTable(
  "spec_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** شناسه ماشینی پایدار — در URL فیلترها استفاده می‌شود، مثل "head" */
    key: varchar("key", { length: 64 }).notNull(),
    label: varchar("label", { length: 160 }).notNull(),
    description: text("description"),
    dataType: specDataTypeEnum("data_type").notNull().default("TEXT"),
    /** برای مشخصه‌های عددی: بُعد فیزیکی که واحدهای مجاز را محدود می‌کند */
    dimension: unitDimensionEnum("dimension"),
    defaultUnitId: uuid("default_unit_id").references(() => units.id, { onDelete: "set null" }),
    /** گروه نمایشی در جدول مشخصات صفحه محصول */
    groupName: varchar("group_name", { length: 120 }).notNull().default("مشخصات عمومی"),
    isFilterable: boolean("is_filterable").notNull().default(false),
    filterUi: specFilterUiEnum("filter_ui").notNull().default("NONE"),
    isActive: boolean("is_active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("spec_definitions_key_key").on(t.key),
    index("spec_definitions_active_idx").on(t.isActive, t.position),
    index("spec_definitions_filterable_idx").on(t.isFilterable, t.isActive),
  ],
);

/**
 * کدام مشخصه به کدام دسته‌بندی تعلق دارد.
 *
 * همین جدول است که باعث می‌شود «پمپ» فیلتر هد و دبی نشان دهد و «مخزن»
 * فیلتر حجم و جنس. مدیر می‌تواند یک مشخصه را به چند دسته وصل کند و برای هر
 * دسته جداگانه تصمیم بگیرد فیلترپذیر باشد یا در کارت محصول دیده شود.
 */
export const categorySpecs = pgTable(
  "category_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    definitionId: uuid("definition_id")
      .notNull()
      .references(() => specDefinitions.id, { onDelete: "cascade" }),
    /** null یعنی از تعریف مشخصه ارث‌بری کن */
    isFilterable: boolean("is_filterable"),
    /** در کارت محصول این دسته نمایش داده شود */
    isKey: boolean("is_key").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    uniqueIndex("category_specs_key").on(t.categoryId, t.definitionId),
    index("category_specs_category_idx").on(t.categoryId, t.position),
    index("category_specs_definition_idx").on(t.definitionId),
  ],
);

/**
 * مقدار یک مشخصه برای یک محصول.
 *
 * ستون‌های قدیمی (label/value/unit) عمداً حفظ شده‌اند:
 *   • هیچ داده‌ای در مهاجرت از دست نمی‌رود
 *   • ردیفی که قابل تبدیل به مقدار نوع‌دار نبوده، همچنان درست نمایش داده
 *     می‌شود و فقط با `isUnparsed` علامت می‌خورد تا مدیر بعداً اصلاحش کند
 *   • `label` نقش «بازنویسی برچسب» برای همان محصول را پیدا می‌کند؛ اگر خالی
 *     بماند برچسب از تعریف مشخصه خوانده می‌شود
 *
 * فیلتر عددی همیشه روی `valueBase` اجرا می‌شود، نه `valueNum` — چون فقط
 * مقدار پایه بین واحدهای مختلف قابل مقایسه است.
 */
export const productSpecs = pgTable(
  "product_specs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    /** null یعنی این ردیف هنوز به هیچ تعریفی نگاشت نشده (میراث) */
    definitionId: uuid("definition_id").references(() => specDefinitions.id, {
      onDelete: "set null",
    }),

    groupName: varchar("group_name", { length: 120 }).notNull().default("مشخصات عمومی"),
    label: varchar("label", { length: 160 }).notNull(),
    /** متن اصلی همان‌طور که وارد شده — همیشه حفظ می‌شود */
    value: varchar("value", { length: 260 }).notNull(),
    unit: varchar("unit", { length: 32 }),

    /* --- مقادیر نوع‌دار --- */
    valueText: varchar("value_text", { length: 260 }),
    valueNum: numeric("value_num", { precision: 20, scale: 6 }),
    /** کران بالای بازه؛ برای مقدار تکی null است */
    valueNumMax: numeric("value_num_max", { precision: 20, scale: 6 }),
    valueBool: boolean("value_bool"),
    unitId: uuid("unit_id").references(() => units.id, { onDelete: "set null" }),
    /** valueNum تبدیل‌شده به واحد پایه — ستونی که فیلتر روی آن اجرا می‌شود */
    valueBase: numeric("value_base", { precision: 20, scale: 6 }),
    valueBaseMax: numeric("value_base_max", { precision: 20, scale: 6 }),
    /** مقدار قابل تبدیل به نوع تعریف‌شده نبود و خام نگه داشته شد */
    isUnparsed: boolean("is_unparsed").notNull().default(false),

    position: integer("position").notNull().default(0),
    /** در کارت محصول و جدول مقایسه هم دیده می‌شود */
    isKey: boolean("is_key").notNull().default(false),
  },
  (t) => [
    index("product_specs_product_idx").on(t.productId, t.position),
    /** ایندکس اصلی فیلتر بازه‌ای عددی */
    index("product_specs_numeric_filter_idx").on(t.definitionId, t.valueBase),
    /** ایندکس فیلتر مقادیر متنی/گزینه‌ای */
    index("product_specs_text_filter_idx").on(t.definitionId, t.valueText),
    index("product_specs_definition_idx").on(t.definitionId),
  ],
);

export const productDocuments = pgTable(
  "product_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 190 }).notNull(),
    fileUrl: text("file_url").notNull(),
    type: documentTypeEnum("type").notNull().default("CATALOG"),
    sizeKb: integer("size_kb"),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("product_documents_product_idx").on(t.productId)],
);

export const productRelations = pgTable(
  "product_relations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    targetId: uuid("target_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: relationTypeEnum("type").notNull().default("RELATED"),
    position: integer("position").notNull().default(0),
  },
  (t) => [uniqueIndex("product_relations_key").on(t.sourceId, t.targetId, t.type)],
);

/* -------------------------------------------------------------------------- */
/*  مشتریان                                                                     */
/* -------------------------------------------------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 24 }).notNull(),
    email: varchar("email", { length: 190 }),
    type: customerTypeEnum("type").notNull().default("INDIVIDUAL"),
    companyName: varchar("company_name", { length: 190 }),
    economicCode: varchar("economic_code", { length: 32 }),
    nationalId: varchar("national_id", { length: 24 }),
    province: varchar("province", { length: 80 }),
    city: varchar("city", { length: 80 }),
    address: text("address"),
    postalCode: varchar("postal_code", { length: 16 }),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isBlocked: boolean("is_blocked").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("customers_phone_key").on(t.phone),
    index("customers_created_idx").on(t.createdAt),
  ],
);

export const customerNotes = pgTable(
  "customer_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("customer_notes_customer_idx").on(t.customerId)],
);

/* -------------------------------------------------------------------------- */
/*  سفارش‌ها و استعلام‌ها                                                        */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** شماره خوانا: ARQ-1404-0007 */
    number: varchar("number", { length: 32 }).notNull(),
    type: orderTypeEnum("type").notNull().default("QUOTE"),
    status: orderStatusEnum("status").notNull().default("NEW"),
    priority: orderPriorityEnum("priority").notNull().default("NORMAL"),
    source: orderSourceEnum("source").notNull().default("PRODUCT_PAGE"),

    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),

    /** اسنپ‌شات اطلاعات تماس در لحظه ثبت */
    contactName: varchar("contact_name", { length: 160 }).notNull(),
    contactPhone: varchar("contact_phone", { length: 24 }).notNull(),
    contactEmail: varchar("contact_email", { length: 190 }),
    contactCompany: varchar("contact_company", { length: 190 }),
    contactCity: varchar("contact_city", { length: 80 }),

    note: text("note"),
    /** یادداشت داخلی — هرگز به مشتری نشان داده نمی‌شود */
    internalNote: text("internal_note"),

    currency: varchar("currency", { length: 8 }).notNull().default("IRT"),
    subtotal: integer("subtotal").notNull().default(0),
    discount: integer("discount").notNull().default(0),
    tax: integer("tax").notNull().default(0),
    shipping: integer("shipping").notNull().default(0),
    total: integer("total").notNull().default(0),

    quotedAt: timestamp("quoted_at", { withTimezone: true }),
    quoteValidUntil: timestamp("quote_valid_until", { withTimezone: true }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    // — آماده برای فاز پرداخت آنلاین —
    paymentStatus: paymentStatusEnum("payment_status").notNull().default("NOT_APPLICABLE"),
    paymentMethod: varchar("payment_method", { length: 48 }),
    paidAt: timestamp("paid_at", { withTimezone: true }),

    assignedToId: uuid("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
    ip: varchar("ip", { length: 64 }),
    userAgent: text("user_agent"),
    referrer: text("referrer"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_key").on(t.number),
    index("orders_status_idx").on(t.status, t.createdAt),
    index("orders_type_idx").on(t.type, t.status),
    index("orders_customer_idx").on(t.customerId),
    index("orders_assignee_idx").on(t.assignedToId),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),

    /** اسنپ‌شات محصول تا تغییرات بعدی کاتالوگ سابقه را خراب نکند */
    productName: varchar("product_name", { length: 220 }).notNull(),
    productSku: varchar("product_sku", { length: 64 }),
    productSlug: varchar("product_slug", { length: 250 }),
    imageUrl: text("image_url"),

    quantity: integer("quantity").notNull().default(1),
    unit: varchar("unit", { length: 32 }).notNull().default("دستگاه"),
    unitPrice: integer("unit_price"),
    /** قیمتی که کارشناس در پاسخ استعلام اعلام کرده */
    quotedUnitPrice: integer("quoted_unit_price"),
    lineTotal: integer("line_total"),
    note: text("note"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

/** خط زمانی سفارش — ستون فقرات گردش‌کار پنل */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    type: orderEventTypeEnum("type").notNull().default("SYSTEM"),
    message: text("message").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

/** جدول پرداخت — در فاز اول خالی می‌ماند و آماده اتصال درگاه است */
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    gateway: varchar("gateway", { length: 48 }).notNull(),
    amount: integer("amount").notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    authority: varchar("authority", { length: 190 }),
    refId: varchar("ref_id", { length: 190 }),
    cardPan: varchar("card_pan", { length: 32 }),
    raw: jsonb("raw"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

/* -------------------------------------------------------------------------- */
/*  محتوا                                                                       */
/* -------------------------------------------------------------------------- */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 220 }).notNull(),
    slug: varchar("slug", { length: 250 }).notNull(),
    excerpt: text("excerpt"),
    content: text("content").notNull(),
    coverUrl: text("cover_url"),
    category: varchar("category", { length: 80 }).notNull().default("اخبار"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    status: postStatusEnum("status").notNull().default("DRAFT"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    readingMinutes: integer("reading_minutes").notNull().default(3),
    viewCount: integer("view_count").notNull().default(0),
    isFeatured: boolean("is_featured").notNull().default(false),
    metaTitle: varchar("meta_title", { length: 190 }),
    metaDescription: text("meta_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("posts_slug_key").on(t.slug),
    index("posts_status_idx").on(t.status, t.publishedAt),
  ],
);

/** پروژه‌های اجراشده — ویترین اعتبار شرکت */
export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 220 }).notNull(),
    slug: varchar("slug", { length: 250 }).notNull(),
    client: varchar("client", { length: 190 }),
    location: varchar("location", { length: 160 }),
    year: varchar("year", { length: 12 }),
    capacity: varchar("capacity", { length: 120 }),
    summary: text("summary"),
    description: text("description"),
    coverUrl: text("cover_url"),
    gallery: text("gallery")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("projects_slug_key").on(t.slug),
    index("projects_active_idx").on(t.isActive, t.position),
  ],
);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 24 }).notNull(),
    email: varchar("email", { length: 190 }),
    subject: varchar("subject", { length: 190 }),
    message: text("message").notNull(),
    status: messageStatusEnum("status").notNull().default("NEW"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contact_messages_status_idx").on(t.status, t.createdAt)],
);

export const subscribers = pgTable(
  "subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 190 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscribers_email_key").on(t.email)],
);

/* -------------------------------------------------------------------------- */
/*  زیرساخت                                                                     */
/* -------------------------------------------------------------------------- */

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    url: text("url").notNull(),
    filename: varchar("filename", { length: 220 }).notNull(),
    mimeType: varchar("mime_type", { length: 96 }).notNull(),
    sizeKb: integer("size_kb").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    alt: varchar("alt", { length: 220 }),
    folder: varchar("folder", { length: 64 }).notNull().default("general"),
    uploadedById: uuid("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("media_folder_idx").on(t.folder, t.createdAt)],
);

/** تنظیمات کلید-مقدار، گروه‌بندی‌شده برای رندر خودکار فرم‌های پنل */
export const settings = pgTable(
  "settings",
  {
    key: varchar("key", { length: 96 }).primaryKey(),
    value: jsonb("value").notNull(),
    group: varchar("group", { length: 48 }).notNull().default("general"),
    label: varchar("label", { length: 160 }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("settings_group_idx").on(t.group)],
);

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    /** create | update | delete | login | logout | status_change | export … */
    action: varchar("action", { length: 48 }).notNull(),
    entity: varchar("entity", { length: 48 }).notNull(),
    entityId: varchar("entity_id", { length: 64 }),
    summary: text("summary").notNull(),
    meta: jsonb("meta"),
    ip: varchar("ip", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("activity_logs_created_idx").on(t.createdAt),
    index("activity_logs_entity_idx").on(t.entity, t.entityId),
  ],
);

/** شمارنده اتمی برای تولید شماره سفارش بدون تداخل */
export const counters = pgTable("counters", {
  key: varchar("key", { length: 48 }).primaryKey(),
  value: integer("value").notNull().default(0),
});

/* -------------------------------------------------------------------------- */
/*  روابط (برای Relational Query API)                                          */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  assignedOrders: many(orders),
  posts: many(posts),
  activityLogs: many(activityLogs),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "category_tree",
  }),
  children: many(categories, { relationName: "category_tree" }),
  products: many(products),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, { fields: [products.categoryId], references: [categories.id] }),
  brand: one(brands, { fields: [products.brandId], references: [brands.id] }),
  images: many(productImages),
  specs: many(productSpecs),
  documents: many(productDocuments),
  priceObservations: many(productPriceObservations),
}));

export const productPriceObservationsRelations = relations(productPriceObservations, ({ one }) => ({
  product: one(products, { fields: [productPriceObservations.productId], references: [products.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.productId], references: [products.id] }),
}));

export const productSpecsRelations = relations(productSpecs, ({ one }) => ({
  product: one(products, { fields: [productSpecs.productId], references: [products.id] }),
  definition: one(specDefinitions, {
    fields: [productSpecs.definitionId],
    references: [specDefinitions.id],
  }),
  unitRef: one(units, { fields: [productSpecs.unitId], references: [units.id] }),
}));

export const unitsRelations = relations(units, ({ many }) => ({
  definitions: many(specDefinitions),
  specs: many(productSpecs),
}));

export const specDefinitionsRelations = relations(specDefinitions, ({ one, many }) => ({
  defaultUnit: one(units, { fields: [specDefinitions.defaultUnitId], references: [units.id] }),
  categoryLinks: many(categorySpecs),
  values: many(productSpecs),
}));

export const categorySpecsRelations = relations(categorySpecs, ({ one }) => ({
  category: one(categories, { fields: [categorySpecs.categoryId], references: [categories.id] }),
  definition: one(specDefinitions, {
    fields: [categorySpecs.definitionId],
    references: [specDefinitions.id],
  }),
}));

export const productDocumentsRelations = relations(productDocuments, ({ one }) => ({
  product: one(products, { fields: [productDocuments.productId], references: [products.id] }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  notes: many(customerNotes),
}));

export const customerNotesRelations = relations(customerNotes, ({ one }) => ({
  customer: one(customers, { fields: [customerNotes.customerId], references: [customers.id] }),
  user: one(users, { fields: [customerNotes.userId], references: [users.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, { fields: [orders.customerId], references: [customers.id] }),
  assignedTo: one(users, { fields: [orders.assignedToId], references: [users.id] }),
  items: many(orderItems),
  events: many(orderEvents),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, { fields: [orderEvents.orderId], references: [orders.id] }),
  user: one(users, { fields: [orderEvents.userId], references: [users.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------- */
/*  تایپ‌های استنتاجی                                                           */
/* -------------------------------------------------------------------------- */

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Brand = typeof brands.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductSpec = typeof productSpecs.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type NewUnit = typeof units.$inferInsert;
export type SpecDefinition = typeof specDefinitions.$inferSelect;
export type NewSpecDefinition = typeof specDefinitions.$inferInsert;
export type CategorySpec = typeof categorySpecs.$inferSelect;
export type NewCategorySpec = typeof categorySpecs.$inferInsert;
export type ProductDocument = typeof productDocuments.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Media = typeof media.$inferSelect;

export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ProductStatus = (typeof productStatusEnum.enumValues)[number];
export type PriceMode = (typeof priceModeEnum.enumValues)[number];
export type StockStatus = (typeof stockStatusEnum.enumValues)[number];
export type OrderType = (typeof orderTypeEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type OrderPriority = (typeof orderPriorityEnum.enumValues)[number];
export type OrderSource = (typeof orderSourceEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type PostStatus = (typeof postStatusEnum.enumValues)[number];
export type MessageStatus = (typeof messageStatusEnum.enumValues)[number];
export type SpecDataType = (typeof specDataTypeEnum.enumValues)[number];
export type SpecFilterUi = (typeof specFilterUiEnum.enumValues)[number];
export type UnitDimension = (typeof unitDimensionEnum.enumValues)[number];

/**
 * برچسب‌ها و رنگ‌های دامنه — تنها منبع حقیقت برای ترجمه enum های پایگاه داده
 * به متن فارسی و توکن رنگ. هیچ کامپوننتی نباید این رشته‌ها را تکرار کند.
 */

import type {
  MessageStatus,
  OrderPriority,
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PostStatus,
  PriceMode,
  ProductStatus,
  StockStatus,
  UserRole,
} from "@/db/schema";

export type ToneKey = "brand" | "signal" | "ok" | "warn" | "danger" | "info" | "neutral";

type LabelMap<T extends string> = Record<T, { label: string; tone: ToneKey; description?: string }>;

/* ----------------------------- سفارش / استعلام ---------------------------- */

export const ORDER_TYPE: LabelMap<OrderType> = {
  QUOTE: { label: "استعلام قیمت", tone: "info" },
  ORDER: { label: "ثبت سفارش", tone: "brand" },
};

export const ORDER_STATUS: LabelMap<OrderStatus> = {
  NEW: { label: "جدید", tone: "info", description: "ثبت شده و هنوز بررسی نشده" },
  REVIEWING: { label: "در حال بررسی", tone: "warn", description: "کارشناس در حال بررسی است" },
  QUOTED: { label: "قیمت اعلام شد", tone: "brand", description: "پیش‌فاکتور برای مشتری ارسال شد" },
  AWAITING_CUSTOMER: { label: "منتظر مشتری", tone: "warn", description: "منتظر تأیید یا پاسخ مشتری" },
  CONFIRMED: { label: "تأیید شده", tone: "ok", description: "مشتری سفارش را نهایی کرد" },
  IN_PROGRESS: { label: "در حال آماده‌سازی", tone: "brand", description: "تأمین و آماده‌سازی کالا" },
  SHIPPED: { label: "ارسال شده", tone: "brand", description: "کالا ارسال شده است" },
  COMPLETED: { label: "تکمیل شده", tone: "ok", description: "پرونده بسته شد" },
  CANCELLED: { label: "لغو شده", tone: "neutral", description: "توسط مشتری یا شرکت لغو شد" },
  REJECTED: { label: "رد شده", tone: "danger", description: "نامعتبر یا اسپم" },
};

/** ترتیب منطقی گردش‌کار — برای نمایش مراحل در پنل */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "NEW",
  "REVIEWING",
  "QUOTED",
  "AWAITING_CUSTOMER",
  "CONFIRMED",
  "IN_PROGRESS",
  "SHIPPED",
  "COMPLETED",
];

/** وضعیت‌هایی که پرونده را می‌بندند */
export const ORDER_CLOSED_STATUSES: OrderStatus[] = ["COMPLETED", "CANCELLED", "REJECTED"];

/** وضعیت‌هایی که نیازمند اقدام کارشناس هستند — در داشبورد هایلایت می‌شوند */
export const ORDER_ACTIONABLE_STATUSES: OrderStatus[] = ["NEW", "REVIEWING", "AWAITING_CUSTOMER"];

export const ORDER_PRIORITY: LabelMap<OrderPriority> = {
  LOW: { label: "کم", tone: "neutral" },
  NORMAL: { label: "عادی", tone: "info" },
  HIGH: { label: "بالا", tone: "warn" },
  URGENT: { label: "فوری", tone: "danger" },
};

export const ORDER_SOURCE: LabelMap<OrderSource> = {
  PRODUCT_PAGE: { label: "صفحه محصول", tone: "neutral" },
  CART: { label: "سبد استعلام", tone: "neutral" },
  CONTACT_FORM: { label: "فرم تماس", tone: "neutral" },
  PHONE: { label: "تماس تلفنی", tone: "neutral" },
  ADMIN: { label: "ثبت توسط کارشناس", tone: "neutral" },
  OTHER: { label: "سایر", tone: "neutral" },
};

export const PAYMENT_STATUS: LabelMap<PaymentStatus> = {
  NOT_APPLICABLE: { label: "بدون پرداخت آنلاین", tone: "neutral" },
  UNPAID: { label: "پرداخت‌نشده", tone: "warn" },
  PENDING: { label: "در انتظار پرداخت", tone: "warn" },
  PAID: { label: "پرداخت شده", tone: "ok" },
  PARTIALLY_PAID: { label: "پرداخت جزئی", tone: "warn" },
  REFUNDED: { label: "بازگشت وجه", tone: "info" },
  FAILED: { label: "ناموفق", tone: "danger" },
};

/* --------------------------------- کاتالوگ -------------------------------- */

export const PRODUCT_STATUS: LabelMap<ProductStatus> = {
  DRAFT: { label: "پیش‌نویس", tone: "neutral" },
  PUBLISHED: { label: "منتشر شده", tone: "ok" },
  ARCHIVED: { label: "بایگانی", tone: "warn" },
};

export const PRICE_MODE: LabelMap<PriceMode> = {
  PUBLIC: { label: "نمایش قیمت", tone: "ok", description: "قیمت روی سایت دیده می‌شود" },
  ON_REQUEST: { label: "استعلام قیمت", tone: "info", description: "قیمت فقط با استعلام اعلام می‌شود" },
  CALL: { label: "تماس بگیرید", tone: "warn", description: "بدون فرم، فقط تماس تلفنی" },
};

export const STOCK_STATUS: LabelMap<StockStatus> = {
  IN_STOCK: { label: "موجود در انبار", tone: "ok" },
  LOW_STOCK: { label: "موجودی محدود", tone: "warn" },
  ORDER_ONLY: { label: "تأمین با سفارش", tone: "info" },
  OUT_OF_STOCK: { label: "ناموجود", tone: "danger" },
  DISCONTINUED: { label: "تولید متوقف شده", tone: "neutral" },
};

/* --------------------------------- محتوا ---------------------------------- */

export const POST_STATUS: LabelMap<PostStatus> = {
  DRAFT: { label: "پیش‌نویس", tone: "neutral" },
  PUBLISHED: { label: "منتشر شده", tone: "ok" },
  ARCHIVED: { label: "بایگانی", tone: "warn" },
};

export const MESSAGE_STATUS: LabelMap<MessageStatus> = {
  NEW: { label: "خوانده‌نشده", tone: "info" },
  READ: { label: "خوانده شده", tone: "neutral" },
  REPLIED: { label: "پاسخ داده شد", tone: "ok" },
  ARCHIVED: { label: "بایگانی", tone: "neutral" },
  SPAM: { label: "اسپم", tone: "danger" },
};

/* -------------------------------- کاربران --------------------------------- */

export const USER_ROLE: LabelMap<UserRole> = {
  OWNER: { label: "مدیر ارشد", tone: "brand", description: "دسترسی کامل شامل کاربران و تنظیمات" },
  ADMIN: { label: "مدیر", tone: "info", description: "همه بخش‌ها به جز مدیریت کاربران" },
  SALES: { label: "کارشناس فروش", tone: "ok", description: "سفارش‌ها، استعلام‌ها و مشتریان" },
  EDITOR: { label: "تولید محتوا", tone: "warn", description: "محصولات، اخبار و پروژه‌ها" },
  VIEWER: { label: "فقط مشاهده", tone: "neutral", description: "بدون امکان ویرایش" },
};

/** ماتریس دسترسی — کلید بخش پنل به نقش‌های مجاز */
export const PERMISSIONS = {
  dashboard: ["OWNER", "ADMIN", "SALES", "EDITOR", "VIEWER"],
  orders: ["OWNER", "ADMIN", "SALES", "VIEWER"],
  customers: ["OWNER", "ADMIN", "SALES", "VIEWER"],
  products: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  categories: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  brands: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  posts: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  projects: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
  messages: ["OWNER", "ADMIN", "SALES", "VIEWER"],
  media: ["OWNER", "ADMIN", "EDITOR"],
  logs: ["OWNER", "ADMIN"],
  settings: ["OWNER", "ADMIN"],
  users: ["OWNER"],
} as const satisfies Record<string, readonly UserRole[]>;

export type PermissionKey = keyof typeof PERMISSIONS;

export function can(role: UserRole | undefined, key: PermissionKey): boolean {
  if (!role) return false;
  return (PERMISSIONS[key] as readonly UserRole[]).includes(role);
}

/** نقش‌هایی که فقط خواندن دارند */
export function isReadOnly(role: UserRole | undefined): boolean {
  return role === "VIEWER";
}

/* ------------------------------- استان‌ها --------------------------------- */

export const PROVINCES = [
  "آذربایجان شرقی", "آذربایجان غربی", "اردبیل", "اصفهان", "البرز", "ایلام",
  "بوشهر", "تهران", "چهارمحال و بختیاری", "خراسان جنوبی", "خراسان رضوی",
  "خراسان شمالی", "خوزستان", "زنجان", "سمنان", "سیستان و بلوچستان", "فارس",
  "قزوین", "قم", "کردستان", "کرمان", "کرمانشاه", "کهگیلویه و بویراحمد",
  "گلستان", "گیلان", "لرستان", "مازندران", "مرکزی", "هرمزگان", "همدان", "یزد",
] as const;

/* ------------------------------ صفحه‌بندی --------------------------------- */

export const PAGE_SIZE = {
  products: 12,
  admin: 20,
  news: 9,
} as const;

export const SORT_OPTIONS = [
  { value: "newest", label: "جدیدترین" },
  { value: "popular", label: "پربازدیدترین" },
  { value: "price-asc", label: "ارزان‌ترین" },
  { value: "price-desc", label: "گران‌ترین" },
  { value: "name", label: "بر اساس نام" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

/**
 * =============================================================================
 *  کاتالوگ اولیه واحدها و تعریف مشخصات فنی
 * =============================================================================
 *  ⚠️ این فایل فقط **داده اولیه (seed)** است، نه منبع حقیقت در زمان اجرا.
 *  منبع حقیقت، جدول‌های `units` / `spec_definitions` / `category_specs` در
 *  پایگاه داده است. پنل مدیریت آینده همان جدول‌ها را ویرایش می‌کند و
 *  فرانت‌اند بدون تغییر کد، تغییرات را نشان می‌دهد.
 *
 *  همه تعریف‌های زیر از **داده واقعی موجود در کاتالوگ** استخراج شده‌اند، نه
 *  از یک فهرست فرضی. برچسب‌های میراثی هر تعریف در `legacyLabels` آمده تا
 *  backfill بتواند ردیف‌های قدیمی را به آن نگاشت کند.
 * =============================================================================
 */

import type { SpecDataType, SpecFilterUi, UnitDimension } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  واحدها                                                                      */
/* -------------------------------------------------------------------------- */

export type UnitSeed = {
  code: string;
  label: string;
  symbol?: string;
  dimension: UnitDimension;
  toBaseFactor: string;
  isBase?: boolean;
  /** نوشته‌هایی که در ستون قدیمی `unit` دیده شده و به این واحد اشاره دارند */
  legacyUnits?: string[];
};

export const unitSeeds: UnitSeed[] = [
  // توان — پایه: کیلووات
  { code: "kw", label: "کیلووات", symbol: "kW", dimension: "POWER", toBaseFactor: "1", isBase: true, legacyUnits: ["کیلووات"] },
  { code: "hp", label: "اسب بخار", symbol: "HP", dimension: "POWER", toBaseFactor: "0.7457", legacyUnits: ["اسب بخار", "اسب"] },
  { code: "w", label: "وات", symbol: "W", dimension: "POWER", toBaseFactor: "0.001", legacyUnits: ["وات"] },

  // طول — پایه: متر
  { code: "m", label: "متر", symbol: "m", dimension: "LENGTH", toBaseFactor: "1", isBase: true, legacyUnits: ["متر"] },
  { code: "mm", label: "میلی‌متر", symbol: "mm", dimension: "LENGTH", toBaseFactor: "0.001", legacyUnits: ["میلی‌متر"] },
  { code: "inch", label: "اینچ", symbol: "in", dimension: "LENGTH", toBaseFactor: "0.0254", legacyUnits: ["اینچ", "اینچ (DN100)"] },

  // دبی — پایه: متر مکعب بر ساعت
  { code: "m3h", label: "متر مکعب بر ساعت", symbol: "m³/h", dimension: "FLOW", toBaseFactor: "1", isBase: true, legacyUnits: ["متر مکعب بر ساعت"] },
  { code: "lpm", label: "لیتر بر دقیقه", symbol: "L/min", dimension: "FLOW", toBaseFactor: "0.06", legacyUnits: ["لیتر بر دقیقه"] },

  // فشار — پایه: بار
  { code: "bar", label: "بار", symbol: "bar", dimension: "PRESSURE", toBaseFactor: "1", isBase: true, legacyUnits: ["بار"] },

  // حجم — پایه: لیتر
  { code: "l", label: "لیتر", symbol: "L", dimension: "VOLUME", toBaseFactor: "1", isBase: true, legacyUnits: ["لیتر"] },

  // دما — پایه: درجه سانتی‌گراد
  { code: "c", label: "درجه سانتی‌گراد", symbol: "°C", dimension: "TEMPERATURE", toBaseFactor: "1", isBase: true, legacyUnits: ["درجه سانتی‌گراد"] },

  // ولتاژ — پایه: ولت
  { code: "v", label: "ولت", symbol: "V", dimension: "VOLTAGE", toBaseFactor: "1", isBase: true, legacyUnits: ["ولت", "ولت تک‌فاز", "ولت سه‌فاز"] },

  // جرم — پایه: کیلوگرم
  { code: "kg", label: "کیلوگرم", symbol: "kg", dimension: "MASS", toBaseFactor: "1", isBase: true, legacyUnits: ["کیلوگرم"] },

  // دوران — پایه: دور بر دقیقه
  { code: "rpm", label: "دور بر دقیقه", symbol: "rpm", dimension: "ROTATION", toBaseFactor: "1", isBase: true, legacyUnits: ["دور بر دقیقه"] },

  // شمارش — پایه: عدد
  { code: "count", label: "عدد", dimension: "COUNT", toBaseFactor: "1", isBase: true, legacyUnits: ["عدد", "طبقه", "حالت"] },
];

/* -------------------------------------------------------------------------- */
/*  تعریف مشخصات                                                                */
/* -------------------------------------------------------------------------- */

export type SpecDefinitionSeed = {
  key: string;
  label: string;
  description?: string;
  dataType: SpecDataType;
  dimension?: UnitDimension;
  defaultUnitCode?: string;
  groupName: string;
  isFilterable: boolean;
  filterUi: SpecFilterUi;
  position: number;
  /**
   * برچسب‌های قدیمی که به این تعریف نگاشت می‌شوند.
   *
   * نگاشت عمداً محافظه‌کارانه است. مثلاً «توان موتور» و «توان مصرفی» با هم
   * ادغام **نشده‌اند**: اولی توان محور و دومی توان ورودی است و یکی‌کردنشان
   * یعنی ساختن یک ادعای فنی نادرست.
   */
  legacyLabels: string[];
};

export const specDefinitionSeeds: SpecDefinitionSeed[] = [
  {
    key: "head",
    label: "هد",
    description: "حداکثر ارتفاعی که پمپ می‌تواند آب را بالا ببرد.",
    dataType: "NUMBER",
    dimension: "LENGTH",
    defaultUnitCode: "m",
    groupName: "عملکرد",
    isFilterable: true,
    filterUi: "RANGE",
    position: 1,
    legacyLabels: ["هد", "هد کل", "هد نامی", "حداکثر هد", "حداکثر ارتفاع"],
  },
  {
    key: "flow",
    label: "دبی",
    description: "حجم آب جابه‌جاشده در واحد زمان.",
    dataType: "NUMBER",
    dimension: "FLOW",
    defaultUnitCode: "m3h",
    groupName: "عملکرد",
    isFilterable: true,
    filterUi: "RANGE",
    position: 2,
    legacyLabels: ["آبدهی نامی", "حداکثر آبدهی", "حداکثر دبی", "دبی فیلتراسیون"],
  },
  {
    key: "power",
    label: "توان موتور",
    description: "توان نامی محور موتور.",
    dataType: "NUMBER",
    dimension: "POWER",
    defaultUnitCode: "kw",
    groupName: "موتور",
    isFilterable: true,
    filterUi: "RANGE",
    position: 3,
    legacyLabels: ["توان", "توان موتور", "توان هر پمپ"],
  },
  {
    key: "power_input",
    label: "توان مصرفی",
    description: "توان الکتریکی ورودی — با توان محور یکی نیست.",
    dataType: "NUMBER",
    dimension: "POWER",
    defaultUnitCode: "w",
    groupName: "موتور",
    isFilterable: true,
    filterUi: "RANGE",
    position: 4,
    legacyLabels: ["توان مصرفی"],
  },
  {
    key: "max_pressure",
    label: "حداکثر فشار کاری",
    dataType: "NUMBER",
    dimension: "PRESSURE",
    defaultUnitCode: "bar",
    groupName: "عملکرد",
    isFilterable: true,
    filterUi: "RANGE",
    position: 5,
    legacyLabels: ["فشار کاری", "حداکثر فشار", "حداکثر فشار کاری"],
  },
  {
    key: "precharge_pressure",
    label: "فشار پیش‌شارژ",
    description: "فشار اولیه هوای مخزن پیش از آبگیری — با فشار کاری متفاوت است.",
    dataType: "NUMBER",
    dimension: "PRESSURE",
    defaultUnitCode: "bar",
    groupName: "عملکرد",
    isFilterable: false,
    filterUi: "NONE",
    position: 6,
    legacyLabels: ["فشار پیش‌شارژ"],
  },
  {
    key: "volume",
    label: "حجم",
    dataType: "NUMBER",
    dimension: "VOLUME",
    defaultUnitCode: "l",
    groupName: "ظرفیت",
    isFilterable: true,
    filterUi: "RANGE",
    position: 7,
    legacyLabels: ["حجم"],
  },
  {
    key: "size",
    label: "سایز اتصال",
    dataType: "NUMBER",
    dimension: "LENGTH",
    defaultUnitCode: "inch",
    groupName: "ابعاد",
    isFilterable: true,
    filterUi: "RANGE",
    position: 8,
    legacyLabels: ["سایز", "قطر پمپ", "قطر مخزن"],
  },
  {
    key: "voltage",
    label: "ولتاژ",
    dataType: "NUMBER",
    dimension: "VOLTAGE",
    defaultUnitCode: "v",
    groupName: "موتور",
    isFilterable: true,
    filterUi: "CHECKBOX",
    position: 9,
    legacyLabels: ["ولتاژ"],
  },
  {
    key: "max_temp",
    label: "حداکثر دمای سیال",
    dataType: "NUMBER",
    dimension: "TEMPERATURE",
    defaultUnitCode: "c",
    groupName: "عملکرد",
    isFilterable: true,
    filterUi: "RANGE",
    position: 10,
    legacyLabels: ["حداکثر دما", "حداکثر دمای کاری"],
  },
  {
    key: "fluid_temp_range",
    label: "بازه دمای مجاز سیال",
    dataType: "RANGE",
    dimension: "TEMPERATURE",
    defaultUnitCode: "c",
    groupName: "عملکرد",
    isFilterable: false,
    filterUi: "NONE",
    position: 11,
    legacyLabels: ["دمای مجاز سیال"],
  },
  {
    key: "stages",
    label: "تعداد طبقات",
    dataType: "NUMBER",
    dimension: "COUNT",
    defaultUnitCode: "count",
    groupName: "ساختار",
    isFilterable: false,
    filterUi: "NONE",
    position: 12,
    legacyLabels: ["تعداد طبقات"],
  },
  {
    key: "pump_count",
    label: "تعداد پمپ",
    dataType: "NUMBER",
    dimension: "COUNT",
    defaultUnitCode: "count",
    groupName: "ساختار",
    isFilterable: false,
    filterUi: "NONE",
    position: 13,
    legacyLabels: ["تعداد پمپ"],
  },
  {
    key: "rpm",
    label: "دور موتور",
    dataType: "NUMBER",
    dimension: "ROTATION",
    defaultUnitCode: "rpm",
    groupName: "موتور",
    isFilterable: false,
    filterUi: "NONE",
    position: 14,
    legacyLabels: ["دور موتور"],
  },
  {
    key: "suction_depth",
    label: "حداکثر عمق مکش",
    dataType: "NUMBER",
    dimension: "LENGTH",
    defaultUnitCode: "m",
    groupName: "عملکرد",
    isFilterable: false,
    filterUi: "NONE",
    position: 15,
    legacyLabels: ["حداکثر عمق مکش"],
  },
  {
    key: "weight",
    label: "وزن",
    dataType: "NUMBER",
    dimension: "MASS",
    defaultUnitCode: "kg",
    groupName: "ابعاد",
    isFilterable: false,
    filterUi: "NONE",
    position: 16,
    legacyLabels: ["وزن"],
  },

  /* ------------------------------ مشخصات متنی ----------------------------- */
  {
    key: "body_material",
    label: "جنس بدنه",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: true,
    filterUi: "CHECKBOX",
    position: 20,
    legacyLabels: ["جنس بدنه", "جنس", "جنس پمپ"],
  },
  {
    key: "connection_type",
    label: "نوع اتصال",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: true,
    filterUi: "CHECKBOX",
    position: 21,
    legacyLabels: ["نوع اتصال"],
  },
  {
    key: "installation_type",
    label: "نوع نصب",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: true,
    filterUi: "CHECKBOX",
    position: 22,
    legacyLabels: ["نوع نصب"],
  },
  {
    key: "pressure_class",
    label: "کلاس فشار",
    description: "رده فشار استاندارد (مثل PN16 یا ANSI 150) — عدد فیزیکی نیست.",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: true,
    filterUi: "CHECKBOX",
    position: 23,
    legacyLabels: ["کلاس فشار"],
  },
  {
    key: "impeller_material",
    label: "جنس پروانه",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: false,
    filterUi: "NONE",
    position: 24,
    legacyLabels: ["جنس پروانه"],
  },
  {
    key: "shaft_material",
    label: "جنس شفت",
    dataType: "TEXT",
    groupName: "ساختار",
    isFilterable: false,
    filterUi: "NONE",
    position: 25,
    legacyLabels: ["جنس شفت"],
  },
  {
    key: "protection_class",
    label: "کلاس حفاظت",
    dataType: "TEXT",
    groupName: "موتور",
    isFilterable: false,
    filterUi: "NONE",
    position: 26,
    legacyLabels: ["کلاس حفاظت"],
  },
  {
    key: "control_type",
    label: "نوع کنترل",
    dataType: "TEXT",
    groupName: "کنترل",
    isFilterable: false,
    filterUi: "NONE",
    position: 27,
    legacyLabels: ["نوع کنترل"],
  },
];

/**
 * کدام مشخصه به کدام دسته‌بندی وصل است.
 *
 * کلید بیرونی = اسلاگ دسته‌بندی، مقدار = کلید تعریف‌ها به ترتیب نمایش.
 * `key: true` یعنی در کارت محصول همان دسته هم دیده شود.
 *
 * این نگاشت از روی داده واقعی ساخته شده: فقط دسته‌هایی که واقعاً چنین
 * مشخصه‌ای دارند به آن وصل شده‌اند.
 */
export const categorySpecSeeds: Record<string, { key: string; isKey?: boolean }[]> = {
  // --- پمپ‌ها ---
  pumps: [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
    { key: "max_pressure" },
    { key: "body_material" },
  ],
  "centrifugal-pumps": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
    { key: "max_pressure" },
    { key: "body_material" },
    { key: "impeller_material" },
    { key: "rpm" },
    { key: "weight" },
    { key: "protection_class" },
  ],
  "self-priming-pumps": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
    { key: "suction_depth" },
    { key: "body_material" },
  ],
  "submersible-pumps": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
    { key: "stages" },
    { key: "size" },
    { key: "shaft_material" },
  ],
  "vertical-multistage": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "max_pressure" },
    { key: "body_material" },
  ],

  // --- الکتروپمپ و بوستر ---
  "electro-pumps": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
  ],
  "booster-sets": [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power" },
    { key: "voltage" },
    { key: "pump_count" },
    { key: "body_material" },
    { key: "control_type" },
  ],
  circulators: [
    { key: "head", isKey: true },
    { key: "flow", isKey: true },
    { key: "power_input" },
    { key: "fluid_temp_range" },
  ],

  // --- مخازن ---
  tanks: [
    { key: "volume", isKey: true },
    { key: "max_pressure", isKey: true },
    { key: "installation_type" },
  ],
  "pressure-vessels": [
    { key: "volume", isKey: true },
    { key: "max_pressure", isKey: true },
    { key: "precharge_pressure" },
    { key: "max_temp" },
    { key: "installation_type" },
  ],
  "expansion-vessels": [
    { key: "volume", isKey: true },
    { key: "max_pressure", isKey: true },
    { key: "max_temp" },
    { key: "installation_type" },
  ],

  // --- شیرآلات ---
  valves: [
    { key: "size", isKey: true },
    { key: "pressure_class", isKey: true },
    { key: "connection_type" },
    { key: "body_material" },
  ],
  "gate-valves": [
    { key: "size", isKey: true },
    { key: "pressure_class", isKey: true },
    { key: "connection_type" },
    { key: "body_material" },
    { key: "shaft_material" },
  ],
  "check-valves": [
    { key: "size", isKey: true },
    { key: "max_pressure", isKey: true },
    { key: "connection_type" },
    { key: "body_material" },
  ],

  // --- اتصالات ---
  fittings: [
    { key: "size", isKey: true },
    { key: "pressure_class", isKey: true },
    { key: "body_material" },
  ],

  // --- تصفیه ---
  filtration: [
    { key: "flow", isKey: true },
    { key: "size", isKey: true },
    { key: "max_pressure" },
    { key: "body_material" },
  ],
};

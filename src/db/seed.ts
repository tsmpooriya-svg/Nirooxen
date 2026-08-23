/**
 * =============================================================================
 *  داده اولیه پایگاه داده
 * =============================================================================
 *  اجرا:  npm run db:seed
 *
 *  این اسکریپت idempotent است: اگر داده‌ای وجود داشته باشد پاک و بازسازی
 *  می‌شود، پس در محیط توسعه می‌توانید بارها اجرایش کنید.
 *
 *  ⚠️ روی پایگاه داده production اجرا نکنید.
 *
 *  ⚠️ پس از هر اجرا، حتماً `npm run db:specs` را اجرا کنید.
 *     این اسکریپت مشخصات را فقط با ستون‌های متنی قدیمی درج می‌کند؛ مقادیر
 *     نوع‌دار (value_num / value_base / definition_id) توسط backfill ساخته
 *     می‌شوند و بدون آن‌ها هیچ فیلتر فنی‌ای کار نمی‌کند.
 * =============================================================================
 */
import "dotenv/config";

import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const {
  brands,
  categories,
  contactMessages,
  counters,
  customers,
  orderEvents,
  orderItems,
  orders,
  posts,
  productImages,
  productSpecs,
  products,
  settings,
  users,
} = schema;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema, casing: "snake_case" });

const img = (name: string) => `/images/products/${name}.svg`;

async function main() {
  console.log("→ پاکسازی جداول…");
  await db.execute(sql`
    TRUNCATE TABLE
      order_events, order_items, payments, orders, customer_notes, customers,
      product_relations, product_documents, product_specs, product_images, products,
      brands, categories, posts, projects, contact_messages, subscribers,
      activity_logs, media, sessions, users, settings, counters
    RESTART IDENTITY CASCADE
  `);

  /* ------------------------------ کاربران ------------------------------- */
  console.log("→ کاربران…");
  const passwordHash = await bcrypt.hash("Admin@12345", 12);

  const [owner, sales, editor] = await db
    .insert(users)
    .values([
      {
        name: "مدیر سیستم",
        email: "admin@example.com",
        phone: "09121234567",
        passwordHash,
        role: "OWNER",
      },
      {
        name: "سمیرا رضایی",
        email: "sales@example.com",
        phone: "09121112233",
        passwordHash,
        role: "SALES",
      },
      {
        name: "کاوه مرادی",
        email: "editor@example.com",
        phone: "09124445566",
        passwordHash,
        role: "EDITOR",
      },
    ])
    .returning();

  /* ---------------------------- دسته‌بندی‌ها ---------------------------- */
  console.log("→ دسته‌بندی‌ها…");
  const parents = await db
    .insert(categories)
    .values([
      {
        name: "پمپ‌های آب",
        slug: "pumps",
        icon: "pump",
        position: 1,
        isFeatured: true,
        description:
          "انواع پمپ آب خانگی، صنعتی و کشاورزی از برندهای معتبر داخلی و اروپایی؛ شامل پمپ گریز از مرکز، محیطی، خودمکش و طبقاتی.",
        metaTitle: "خرید پمپ آب صنعتی و خانگی",
        metaDescription:
          "لیست قیمت و مشخصات فنی انواع پمپ آب صنعتی، خانگی و کشاورزی با گارانتی معتبر و امکان استعلام قیمت آنلاین.",
      },
      {
        name: "الکتروپمپ و بوستر",
        slug: "electro-pumps",
        icon: "motor-pump",
        position: 2,
        isFeatured: true,
        description:
          "الکتروپمپ‌های تک‌فاز و سه‌فاز، بوستر پمپ‌های دور متغیر و ست‌های فشار برای ساختمان، صنعت و آبیاری.",
      },
      {
        name: "مخازن و منابع",
        slug: "tanks",
        icon: "tank",
        position: 3,
        isFeatured: true,
        description:
          "مخازن تحت فشار دیافراگمی، منابع انبساط بسته و مخازن ذخیره پلی‌اتیلن در ظرفیت‌های مختلف.",
      },
      {
        name: "شیرآلات صنعتی",
        slug: "valves",
        icon: "valve",
        position: 4,
        isFeatured: true,
        description:
          "شیر فلکه کشویی، شیر یک‌طرفه، شیر پروانه‌ای، شیر اطمینان و شیرهای کنترلی در سایزهای صنعتی.",
      },
      {
        name: "اتصالات و لوله",
        slug: "fittings",
        icon: "pipe",
        position: 5,
        isFeatured: true,
        description:
          "اتصالات جوشی، دنده‌ای و فلنجی، لوله‌های فولادی و پلی‌اتیلن، بست و واشرهای صنعتی.",
      },
      {
        name: "تجهیزات تصفیه",
        slug: "filtration",
        icon: "filter",
        position: 6,
        isFeatured: true,
        description: "فیلترهای شنی، کارتریجی، سختی‌گیر رزینی و سیستم‌های تصفیه صنعتی آب.",
      },
      {
        name: "ابزار دقیق و کنترل",
        slug: "instruments",
        icon: "gauge",
        position: 7,
        description: "مانومتر، پرشر سوئیچ، فلوسوئیچ، تابلو کنترل و تجهیزات اندازه‌گیری.",
      },
    ])
    .returning();

  const byslug = Object.fromEntries(parents.map((c) => [c.slug, c]));

  const children = await db
    .insert(categories)
    .values([
      { name: "پمپ گریز از مرکز", slug: "centrifugal-pumps", parentId: byslug.pumps!.id, position: 1, icon: "pump" },
      { name: "پمپ خودمکش (جتی)", slug: "self-priming-pumps", parentId: byslug.pumps!.id, position: 2, icon: "pump" },
      { name: "پمپ شناور و کف‌کش", slug: "submersible-pumps", parentId: byslug.pumps!.id, position: 3, icon: "well" },
      { name: "پمپ طبقاتی عمودی", slug: "vertical-multistage", parentId: byslug.pumps!.id, position: 4, icon: "pump" },
      { name: "بوستر پمپ دور متغیر", slug: "booster-sets", parentId: byslug["electro-pumps"]!.id, position: 1, icon: "motor-pump" },
      { name: "الکتروپمپ سیرکولاتور", slug: "circulators", parentId: byslug["electro-pumps"]!.id, position: 2, icon: "motor-pump" },
      { name: "منبع تحت فشار", slug: "pressure-vessels", parentId: byslug.tanks!.id, position: 1, icon: "tank" },
      { name: "منبع انبساط بسته", slug: "expansion-vessels", parentId: byslug.tanks!.id, position: 2, icon: "tank" },
      { name: "شیر فلکه کشویی", slug: "gate-valves", parentId: byslug.valves!.id, position: 1, icon: "valve" },
      { name: "شیر یک‌طرفه", slug: "check-valves", parentId: byslug.valves!.id, position: 2, icon: "valve" },
    ])
    .returning();

  const cat = Object.fromEntries([...parents, ...children].map((c) => [c.slug, c.id]));

  /* -------------------------------- برندها ------------------------------ */
  console.log("→ برندها…");
  const brandRows = await db
    .insert(brands)
    .values([
      { name: "گراندفوس", latinName: "Grundfos", slug: "grundfos", country: "دانمارک", isFeatured: true, position: 1, description: "پیشروی جهانی در فناوری پمپ‌های هوشمند و کم‌مصرف." },
      { name: "پنتاکس", latinName: "Pentax", slug: "pentax", country: "ایتالیا", isFeatured: true, position: 2, description: "الکتروپمپ‌های خانگی و صنعتی با کیفیت اروپایی." },
      { name: "ابارا", latinName: "Ebara", slug: "ebara", country: "ژاپن", isFeatured: true, position: 3, description: "پمپ‌های صنعتی با دوام بالا برای شرایط کاری سنگین." },
      { name: "لوارا", latinName: "Lowara", slug: "lowara", country: "ایتالیا", isFeatured: true, position: 4, description: "پمپ‌های استیل ضدزنگ و سیستم‌های فشار." },
      { name: "پمپیران", latinName: "Pumpiran", slug: "pumpiran", country: "ایران", isFeatured: true, position: 5, description: "بزرگ‌ترین تولیدکننده پمپ در ایران با شبکه خدمات پس از فروش گسترده." },
      { name: "سمنان انرژی", latinName: "Semnan Energy", slug: "semnan-energy", country: "ایران", isFeatured: true, position: 6, description: "تولیدکننده منابع تحت فشار و مخازن دیافراگمی." },
      { name: "ویلو", latinName: "Wilo", slug: "wilo", country: "آلمان", isFeatured: true, position: 7, description: "سیرکولاتور و پمپ‌های ساختمانی با راندمان بالا." },
      { name: "داب", latinName: "DAB", slug: "dab", country: "ایتالیا", position: 8, description: "پمپ‌های خانگی و نیمه‌صنعتی." },
    ])
    .returning();

  const brand = Object.fromEntries(brandRows.map((b) => [b.slug, b.id]));

  /* ------------------------------- محصولات ------------------------------ */
  console.log("→ محصولات…");

  type SpecSeed = { group?: string; label: string; value: string; unit?: string; key?: boolean };
  type ProductSeed = {
    name: string;
    slug: string;
    sku: string;
    model: string;
    category: string;
    brand: string;
    short: string;
    body: string;
    priceMode: "PUBLIC" | "ON_REQUEST" | "CALL";
    price?: number;
    comparePrice?: number;
    stock: "IN_STOCK" | "LOW_STOCK" | "ORDER_ONLY" | "OUT_OF_STOCK";
    image: string;
    featured?: boolean;
    isNew?: boolean;
    warranty?: number;
    lead?: number;
    tags: string[];
    specs: SpecSeed[];
  };

  const seedProducts: ProductSeed[] = [
    {
      name: "الکتروپمپ گریز از مرکز پنتاکس مدل CM 50",
      slug: "pentax-cm-50-centrifugal-pump",
      sku: "PTX-CM50",
      model: "CM 50",
      category: "centrifugal-pumps",
      brand: "pentax",
      short: "پمپ گریز از مرکز تک‌فاز با بدنه چدنی و پروانه برنجی، مناسب آبرسانی ساختمان و آبیاری فضای سبز.",
      body: "الکتروپمپ CM 50 پنتاکس یکی از پرکاربردترین پمپ‌های گریز از مرکز در بازار ایران است. بدنه چدنی با پوشش رنگ الکترواستاتیک و پروانه برنجی، دوام بالایی در برابر خوردگی فراهم می‌کند. موتور آسنکرون با محافظ حرارتی داخلی از سوختن سیم‌پیچ در شرایط اضافه‌بار جلوگیری می‌کند.\n\nاین پمپ برای آبرسانی ساختمان‌های مسکونی تا ۶ طبقه، آبیاری فضای سبز، انتقال آب بین مخازن و کاربردهای صنعتی سبک مناسب است. نصب آن به دلیل وزن پایین و ابعاد جمع‌وجور ساده است.",
      priceMode: "PUBLIC",
      price: 14_800_000,
      comparePrice: 16_200_000,
      stock: "IN_STOCK",
      image: "centrifugal-pump",
      featured: true,
      warranty: 18,
      tags: ["پمپ گریز از مرکز", "تک فاز", "خانگی", "آبیاری"],
      specs: [
        { group: "عملکرد", label: "حداکثر آبدهی", value: "۶۰", unit: "لیتر بر دقیقه", key: true },
        { group: "عملکرد", label: "حداکثر ارتفاع", value: "۴۲", unit: "متر", key: true },
        { group: "عملکرد", label: "حداکثر فشار کاری", value: "۶", unit: "بار" },
        { group: "موتور", label: "توان موتور", value: "۰٫۵", unit: "اسب بخار", key: true },
        { group: "موتور", label: "ولتاژ", value: "۲۲۰", unit: "ولت تک‌فاز" },
        { group: "موتور", label: "دور موتور", value: "۲۸۵۰", unit: "دور بر دقیقه" },
        { group: "موتور", label: "کلاس حفاظت", value: "IP44" },
        { group: "ساختار", label: "جنس بدنه", value: "چدن" },
        { group: "ساختار", label: "جنس پروانه", value: "برنج" },
        { group: "ساختار", label: "سایز ورودی / خروجی", value: '۱ / ۱ اینچ' },
        { group: "ساختار", label: "وزن", value: "۹٫۵", unit: "کیلوگرم" },
      ],
    },
    {
      name: "بوستر پمپ دور متغیر گراندفوس CM 5-4",
      slug: "grundfos-cm-5-4-booster-set",
      sku: "GRF-CM54",
      model: "CM 5-4 / Hydro Multi-E",
      category: "booster-sets",
      brand: "grundfos",
      short: "ست فشار دو پمپه با درایو دور متغیر، تثبیت فشار شبکه و کاهش مصرف انرژی تا ۴۰٪.",
      body: "بوستر پمپ دور متغیر گراندفوس با کنترلر هوشمند داخلی، فشار خروجی را مستقل از میزان مصرف ثابت نگه می‌دارد. استفاده از اینورتر باعث حذف ضربه قوچ، کاهش استهلاک شبکه لوله‌کشی و صرفه‌جویی قابل توجه در مصرف برق می‌شود.\n\nمناسب برای مجتمع‌های مسکونی، هتل‌ها، بیمارستان‌ها و واحدهای صنعتی که نیاز به فشار پایدار دارند. قابلیت کارکرد چرخشی پمپ‌ها عمر مفید مجموعه را افزایش می‌دهد.",
      priceMode: "ON_REQUEST",
      stock: "ORDER_ONLY",
      image: "booster-set",
      featured: true,
      isNew: true,
      warranty: 24,
      lead: 21,
      tags: ["بوستر پمپ", "دور متغیر", "اینورتر", "ساختمان"],
      specs: [
        { group: "عملکرد", label: "آبدهی نامی", value: "۵", unit: "متر مکعب بر ساعت", key: true },
        { group: "عملکرد", label: "هد نامی", value: "۵۵", unit: "متر", key: true },
        { group: "عملکرد", label: "تعداد پمپ", value: "۲", unit: "عدد", key: true },
        { group: "کنترل", label: "نوع کنترل", value: "درایو دور متغیر (VFD)" },
        { group: "کنترل", label: "نمایشگر", value: "LCD گرافیکی با منوی فارسی" },
        { group: "کنترل", label: "پروتکل ارتباطی", value: "Modbus RTU" },
        { group: "موتور", label: "توان هر پمپ", value: "۱٫۵", unit: "کیلووات" },
        { group: "موتور", label: "ولتاژ", value: "۳۸۰", unit: "ولت سه‌فاز" },
        { group: "ساختار", label: "جنس پمپ", value: "استیل ۳۰۴" },
        { group: "ساختار", label: "شاسی", value: "گالوانیزه رنگ‌شده" },
      ],
    },
    {
      name: "پمپ شناور ۶ اینچ پمپیران مدل UQH 205/9",
      slug: "pumpiran-uqh-205-9-submersible",
      sku: "PMP-UQH2059",
      model: "UQH 205/9",
      category: "submersible-pumps",
      brand: "pumpiran",
      short: "پمپ شناور چاه عمیق با پروانه نوریل و بدنه استیل، مخصوص چاه‌های کشاورزی و صنعتی.",
      body: "پمپ شناور UQH پمپیران برای چاه‌های عمیق کشاورزی، آبرسانی روستایی و مصارف صنعتی طراحی شده است. طبقات از جنس نوریل مقاوم در برابر سایش شن و ماسه بوده و شفت استیل ضدزنگ، عمر طولانی در شرایط سخت را تضمین می‌کند.\n\nراه‌اندازی این پمپ نیازمند تابلو کنترل مناسب و رعایت عمق نصب توصیه‌شده است. تیم فنی ما محاسبه هد و انتخاب موتور را رایگان انجام می‌دهد.",
      priceMode: "ON_REQUEST",
      stock: "ORDER_ONLY",
      image: "submersible-pump",
      featured: true,
      warranty: 12,
      lead: 14,
      tags: ["پمپ شناور", "چاه عمیق", "کشاورزی", "سه فاز"],
      specs: [
        { group: "عملکرد", label: "آبدهی نامی", value: "۲۰۵", unit: "متر مکعب بر ساعت", key: true },
        { group: "عملکرد", label: "هد کل", value: "۹۰", unit: "متر", key: true },
        { group: "عملکرد", label: "تعداد طبقات", value: "۹", unit: "طبقه" },
        { group: "موتور", label: "توان موتور", value: "۷۵", unit: "کیلووات", key: true },
        { group: "موتور", label: "ولتاژ", value: "۳۸۰", unit: "ولت سه‌فاز" },
        { group: "ساختار", label: "قطر پمپ", value: "۶", unit: "اینچ" },
        { group: "ساختار", label: "جنس طبقات", value: "نوریل" },
        { group: "ساختار", label: "جنس شفت", value: "استیل ۴۲۰" },
        { group: "ساختار", label: "حداکثر شن مجاز", value: "۵۰", unit: "گرم بر متر مکعب" },
      ],
    },
    {
      name: "منبع تحت فشار ۱۰۰ لیتری سمنان انرژی",
      slug: "semnan-energy-100l-pressure-tank",
      sku: "SME-PT100",
      model: "SE-100V",
      category: "pressure-vessels",
      brand: "semnan-energy",
      short: "مخزن دیافراگمی عمودی ۱۰۰ لیتری با دیافراگم EPDM بهداشتی و فشار کاری ۱۰ بار.",
      body: "منبع تحت فشار ۱۰۰ لیتری سمنان انرژی با دیافراگم قابل تعویض از جنس EPDM ساخته شده که با آب آشامیدنی سازگار است. بدنه از ورق فولادی با پوشش رنگ پودری الکترواستاتیک و آزمون فشار کارخانه‌ای عرضه می‌شود.\n\nاستفاده از منبع تحت فشار، تعداد استارت پمپ را کاهش داده و عمر موتور را به شکل محسوسی افزایش می‌دهد.",
      priceMode: "PUBLIC",
      price: 9_450_000,
      stock: "IN_STOCK",
      image: "pressure-tank",
      featured: true,
      warranty: 24,
      tags: ["منبع تحت فشار", "دیافراگمی", "۱۰۰ لیتری"],
      specs: [
        { group: "ظرفیت", label: "حجم", value: "۱۰۰", unit: "لیتر", key: true },
        { group: "ظرفیت", label: "فشار کاری", value: "۱۰", unit: "بار", key: true },
        { group: "ظرفیت", label: "فشار پیش‌شارژ", value: "۱٫۵", unit: "بار" },
        { group: "ساختار", label: "جنس دیافراگم", value: "EPDM بهداشتی" },
        { group: "ساختار", label: "نوع نصب", value: "عمودی با پایه" },
        { group: "ساختار", label: "سایز اتصال", value: "۱ اینچ" },
        { group: "ساختار", label: "حداکثر دمای کاری", value: "۹۹", unit: "درجه سانتی‌گراد" },
        { group: "ابعاد", label: "قطر", value: "۴۵۰", unit: "میلی‌متر" },
        { group: "ابعاد", label: "ارتفاع", value: "۸۹۰", unit: "میلی‌متر" },
      ],
    },
    {
      name: "شیر فلکه کشویی چدنی PN16 سایز ۴ اینچ",
      slug: "gate-valve-cast-iron-pn16-4inch",
      sku: "VLV-GT4-PN16",
      model: "F4-DN100",
      category: "gate-valves",
      brand: "ebara",
      short: "شیر کشویی زبانه لاستیکی با بدنه چدن داکتیل، فلنجی استاندارد DIN، مناسب خطوط آب صنعتی.",
      body: "شیر فلکه کشویی زبانه لاستیکی با بدنه چدن داکتیل و پوشش اپوکسی داخل و خارج، برای خطوط انتقال آب سرد صنعتی و شهری طراحی شده است. زبانه با لاستیک EPDM ولکانیزه، آب‌بندی کامل بدون نیاز به نشیمن‌گاه فلزی را فراهم می‌کند.",
      priceMode: "PUBLIC",
      price: 6_200_000,
      stock: "LOW_STOCK",
      image: "gate-valve",
      warranty: 12,
      tags: ["شیر فلکه", "کشویی", "فلنجی", "PN16"],
      specs: [
        { group: "مشخصات", label: "سایز", value: "۴", unit: "اینچ (DN100)", key: true },
        { group: "مشخصات", label: "کلاس فشار", value: "PN16", key: true },
        { group: "مشخصات", label: "نوع اتصال", value: "فلنجی DIN 2533" },
        { group: "ساختار", label: "جنس بدنه", value: "چدن داکتیل GGG40" },
        { group: "ساختار", label: "جنس زبانه", value: "چدن با روکش EPDM" },
        { group: "ساختار", label: "جنس شفت", value: "استیل ضدزنگ AISI 420" },
        { group: "ساختار", label: "پوشش", value: "اپوکسی پودری ۲۵۰ میکرون" },
      ],
    },
    {
      name: "الکتروپمپ سیرکولاتور خطی ویلو TOP-S 40/7",
      slug: "wilo-top-s-40-7-circulator",
      sku: "WLO-TOPS407",
      model: "TOP-S 40/7",
      category: "circulators",
      brand: "wilo",
      short: "پمپ سیرکولاتور سه‌دور برای سیستم‌های گرمایشی و چیلر، با روتور تر و کارکرد بی‌صدا.",
      body: "سیرکولاتور TOP-S ویلو با روتور تر و بدنه چدنی، برای گردش آب گرم در سیستم‌های گرمایشی مرکزی، چیلر و فن‌کویل استفاده می‌شود. سه دور قابل انتخاب امکان تنظیم دبی متناسب با بار حرارتی ساختمان را می‌دهد.",
      priceMode: "PUBLIC",
      price: 32_900_000,
      stock: "IN_STOCK",
      image: "electro-pump",
      isNew: true,
      warranty: 24,
      tags: ["سیرکولاتور", "موتورخانه", "گرمایشی"],
      specs: [
        { group: "عملکرد", label: "حداکثر دبی", value: "۱۸", unit: "متر مکعب بر ساعت", key: true },
        { group: "عملکرد", label: "حداکثر هد", value: "۷", unit: "متر", key: true },
        { group: "عملکرد", label: "دمای مجاز سیال", value: "-۲۰ تا +۱۳۰", unit: "درجه سانتی‌گراد" },
        { group: "موتور", label: "توان مصرفی", value: "۵۵۰", unit: "وات", key: true },
        { group: "موتور", label: "تعداد دور", value: "۳", unit: "حالت" },
        { group: "ساختار", label: "سایز فلنج", value: "DN40" },
        { group: "ساختار", label: "جنس بدنه", value: "چدن خاکستری" },
      ],
    },
    {
      name: "شیر یک‌طرفه دریچه‌ای برنجی ۲ اینچ",
      slug: "brass-swing-check-valve-2inch",
      sku: "VLV-CK2-BR",
      model: "CV-50",
      category: "check-valves",
      brand: "dab",
      short: "شیر یک‌طرفه دنده‌ای برنجی با فنر استیل، جلوگیری از برگشت آب و ضربه قوچ.",
      body: "شیر یک‌طرفه دریچه‌ای با بدنه برنجی فورج و درپوش قابل بازکردن برای سرویس، در خطوط مکش و رانش پمپ استفاده می‌شود. فنر استیل ضدزنگ بسته‌شدن سریع دریچه و کاهش ضربه قوچ را تضمین می‌کند.",
      priceMode: "PUBLIC",
      price: 1_780_000,
      stock: "IN_STOCK",
      image: "gate-valve",
      tags: ["شیر یک طرفه", "برنجی", "دنده‌ای"],
      specs: [
        { group: "مشخصات", label: "سایز", value: "۲", unit: "اینچ", key: true },
        { group: "مشخصات", label: "فشار کاری", value: "۱۶", unit: "بار", key: true },
        { group: "مشخصات", label: "نوع اتصال", value: "دنده‌ای BSP" },
        { group: "ساختار", label: "جنس بدنه", value: "برنج فورج CW617N" },
        { group: "ساختار", label: "جنس فنر", value: "استیل ۳۰۴" },
      ],
    },
    {
      name: "فیلتر شنی استخری و صنعتی ۳۰ اینچ",
      slug: "sand-filter-30-inch",
      sku: "FLT-SND30",
      model: "SF-750",
      category: "filtration",
      brand: "lowara",
      short: "فیلتر شنی بدنه پلی‌اتیلن تقویت‌شده با شیر شش‌حالته، مناسب تصفیه فیزیکی آب.",
      body: "فیلتر شنی با بدنه پلی‌اتیلن تقویت‌شده الیاف شیشه، در برابر خوردگی و مواد شیمیایی مقاوم است. شیر شش‌حالته امکان بک‌واش، رینس، تخلیه و گردش را بدون تغییر لوله‌کشی فراهم می‌کند.",
      priceMode: "ON_REQUEST",
      stock: "ORDER_ONLY",
      image: "water-filter",
      lead: 10,
      warranty: 12,
      tags: ["فیلتر شنی", "تصفیه آب", "استخر"],
      specs: [
        { group: "مشخصات", label: "قطر مخزن", value: "۳۰", unit: "اینچ", key: true },
        { group: "مشخصات", label: "دبی فیلتراسیون", value: "۱۴", unit: "متر مکعب بر ساعت", key: true },
        { group: "مشخصات", label: "فشار کاری", value: "۲٫۵", unit: "بار" },
        { group: "مشخصات", label: "حجم سیلیس مورد نیاز", value: "۱۵۰", unit: "کیلوگرم" },
        { group: "ساختار", label: "جنس بدنه", value: "پلی‌اتیلن تقویت‌شده" },
        { group: "ساختار", label: "نوع شیر", value: "شش‌حالته Top-Mount" },
      ],
    },
    {
      name: "اتصال فلنجی فولادی ۶ اینچ کلاس ۱۵۰",
      slug: "steel-flange-6inch-class150",
      sku: "FIT-FL6-150",
      model: "ANSI B16.5",
      category: "fittings",
      brand: "ebara",
      short: "فلنج گلودار فولادی استاندارد ANSI کلاس ۱۵۰، مناسب خطوط انتقال آب و خدمات صنعتی.",
      body: "فلنج گلودار (Weld Neck) فولاد کربنی A105 مطابق استاندارد ANSI B16.5 کلاس ۱۵۰، برای اتصال لوله‌های فولادی در خطوط انتقال آب، هوای فشرده و سیالات صنعتی استفاده می‌شود.",
      priceMode: "CALL",
      stock: "IN_STOCK",
      image: "pipe-fitting",
      tags: ["فلنج", "اتصالات فولادی", "ANSI"],
      specs: [
        { group: "مشخصات", label: "سایز", value: "۶", unit: "اینچ", key: true },
        { group: "مشخصات", label: "کلاس فشار", value: "۱۵۰", unit: "پوند", key: true },
        { group: "مشخصات", label: "استاندارد", value: "ANSI B16.5" },
        { group: "ساختار", label: "جنس", value: "فولاد کربنی A105" },
        { group: "ساختار", label: "نوع", value: "گلودار (Weld Neck)" },
      ],
    },
    {
      name: "پمپ طبقاتی عمودی استیل لوارا ۵SV",
      slug: "lowara-5sv-vertical-multistage",
      sku: "LWR-5SV",
      model: "e-SV 5SV",
      category: "vertical-multistage",
      brand: "lowara",
      short: "پمپ طبقاتی عمودی تمام‌استیل، راندمان بالا، مناسب بوستر و فرآیندهای صنعتی.",
      body: "پمپ طبقاتی عمودی سری e-SV لوارا با تمام قطعات آبی از جنس استیل ضدزنگ ۳۰۴، برای سیستم‌های فشار، صنایع غذایی، تصفیه آب و کاربردهای فرآیندی طراحی شده است. طراحی هیدرولیک بهینه، راندمانی بالاتر از میانگین بازار ارائه می‌دهد.",
      priceMode: "ON_REQUEST",
      stock: "ORDER_ONLY",
      image: "centrifugal-pump",
      featured: true,
      lead: 25,
      warranty: 24,
      tags: ["پمپ طبقاتی", "استیل", "صنعتی", "بوستر"],
      specs: [
        { group: "عملکرد", label: "آبدهی نامی", value: "۵", unit: "متر مکعب بر ساعت", key: true },
        { group: "عملکرد", label: "هد", value: "تا ۱۶۰", unit: "متر", key: true },
        { group: "عملکرد", label: "حداکثر فشار", value: "۲۵", unit: "بار" },
        { group: "موتور", label: "توان", value: "۲٫۲", unit: "کیلووات", key: true },
        { group: "ساختار", label: "جنس قطعات آبی", value: "استیل ۳۰۴" },
        { group: "ساختار", label: "نوع مکانیکال سیل", value: "کارتریجی قابل تعویض" },
      ],
    },
    {
      name: "پمپ خودمکش جتی پنتاکس PM 45",
      slug: "pentax-pm-45-self-priming",
      sku: "PTX-PM45",
      model: "PM 45",
      category: "self-priming-pumps",
      brand: "pentax",
      short: "پمپ جتی خودمکش با قابلیت مکش تا ۸ متر، مناسب چاه‌های کم‌عمق و منابع زیرزمینی.",
      body: "پمپ خودمکش PM 45 پنتاکس با اجکتور داخلی، قابلیت مکش از عمق تا ۸ متر را دارد و برای چاه‌های کم‌عمق، منابع زیرزمینی و مخازن پایین‌تر از تراز پمپ ایده‌آل است.",
      priceMode: "PUBLIC",
      price: 11_300_000,
      comparePrice: 12_500_000,
      stock: "IN_STOCK",
      image: "electro-pump",
      warranty: 18,
      tags: ["پمپ جتی", "خودمکش", "خانگی"],
      specs: [
        { group: "عملکرد", label: "حداکثر آبدهی", value: "۴۵", unit: "لیتر بر دقیقه", key: true },
        { group: "عملکرد", label: "حداکثر ارتفاع", value: "۴۰", unit: "متر", key: true },
        { group: "عملکرد", label: "حداکثر عمق مکش", value: "۸", unit: "متر", key: true },
        { group: "موتور", label: "توان", value: "۰٫۶", unit: "اسب بخار" },
        { group: "موتور", label: "ولتاژ", value: "۲۲۰", unit: "ولت تک‌فاز" },
        { group: "ساختار", label: "جنس بدنه", value: "چدن" },
      ],
    },
    {
      name: "منبع انبساط بسته ۲۴ لیتری",
      slug: "expansion-vessel-24l",
      sku: "SME-EV24",
      model: "SE-24H",
      category: "expansion-vessels",
      brand: "semnan-energy",
      short: "منبع انبساط بسته افقی ۲۴ لیتری برای موتورخانه و سیستم گرمایشی.",
      body: "منبع انبساط بسته با دیافراگم مقاوم به حرارت، حجم اضافی ناشی از انبساط آب گرم را جذب کرده و از افزایش فشار خطرناک در مدار گرمایشی جلوگیری می‌کند.",
      priceMode: "PUBLIC",
      price: 3_150_000,
      stock: "IN_STOCK",
      image: "pressure-tank",
      warranty: 18,
      tags: ["منبع انبساط", "موتورخانه", "۲۴ لیتری"],
      specs: [
        { group: "ظرفیت", label: "حجم", value: "۲۴", unit: "لیتر", key: true },
        { group: "ظرفیت", label: "فشار کاری", value: "۸", unit: "بار", key: true },
        { group: "ساختار", label: "نوع نصب", value: "افقی دیواری" },
        { group: "ساختار", label: "حداکثر دما", value: "۱۰۰", unit: "درجه سانتی‌گراد" },
      ],
    },
  ];

  const now = new Date();
  for (const [index, item] of seedProducts.entries()) {
    const [row] = await db
      .insert(products)
      .values({
        name: item.name,
        slug: item.slug,
        sku: item.sku,
        model: item.model,
        shortDescription: item.short,
        description: item.body,
        categoryId: cat[item.category]!,
        brandId: brand[item.brand]!,
        status: "PUBLISHED",
        priceMode: item.priceMode,
        price: item.price ?? null,
        comparePrice: item.comparePrice ?? null,
        stockStatus: item.stock,
        leadTimeDays: item.lead ?? null,
        warrantyMonths: item.warranty ?? null,
        isFeatured: item.featured ?? false,
        isNew: item.isNew ?? false,
        position: index,
        viewCount: 120 + Math.floor(Math.random() * 900),
        orderCount: Math.floor(Math.random() * 24),
        tags: item.tags,
        metaTitle: `${item.name} | خرید و استعلام قیمت`,
        metaDescription: item.short,
        publishedAt: new Date(now.getTime() - index * 36e5 * 24),
      })
      .returning();

    await db.insert(productImages).values([
      { productId: row!.id, url: img(item.image), alt: item.name, isPrimary: true, position: 0 },
      { productId: row!.id, url: img("generic"), alt: `${item.name} — نمای فنی`, position: 1 },
    ]);

    await db.insert(productSpecs).values(
      item.specs.map((spec, i) => ({
        productId: row!.id,
        groupName: spec.group ?? "مشخصات عمومی",
        label: spec.label,
        value: spec.value,
        unit: spec.unit ?? null,
        position: i,
        isKey: spec.key ?? false,
      })),
    );
  }

  /* -------------------------------- مشتریان ----------------------------- */
  console.log("→ مشتریان و سفارش‌ها…");
  const customerRows = await db
    .insert(customers)
    .values([
      { fullName: "مهندس رضا کاظمی", phone: "09121234501", email: "r.kazemi@example.com", type: "COMPANY", companyName: "شرکت ساختمانی پارس بنا", province: "تهران", city: "تهران", tags: ["پیمانکار", "مشتری ویژه"] },
      { fullName: "حسین نوروزی", phone: "09131234502", type: "INDIVIDUAL", province: "اصفهان", city: "کاشان", tags: ["کشاورزی"] },
      { fullName: "شرکت آب و فاضلاب استان قم", phone: "02536661234", type: "COMPANY", companyName: "آبفا قم", province: "قم", city: "قم", tags: ["دولتی"] },
      { fullName: "مریم شریفی", phone: "09351234504", type: "INDIVIDUAL", province: "خراسان رضوی", city: "مشهد" },
      { fullName: "کارخانه لبنیات دامون", phone: "01333221100", type: "COMPANY", companyName: "صنایع غذایی دامون", province: "گیلان", city: "رشت", tags: ["صنعتی"] },
    ])
    .returning();

  const allProducts = await db.select().from(products);
  const pick = (slug: string) => allProducts.find((p) => p.slug === slug)!;

  const orderSeeds: Array<{
    type: "QUOTE" | "ORDER";
    status: schema.OrderStatus;
    priority: schema.OrderPriority;
    customerIndex: number;
    items: Array<{ slug: string; qty: number }>;
    note?: string;
    daysAgo: number;
    assigned?: boolean;
  }> = [
    { type: "QUOTE", status: "NEW", priority: "HIGH", customerIndex: 0, items: [{ slug: "grundfos-cm-5-4-booster-set", qty: 1 }], note: "برای برج مسکونی ۱۲ طبقه در سعادت‌آباد. لطفاً هد و دبی را بررسی و پیشنهاد بدهید.", daysAgo: 0 },
    { type: "ORDER", status: "CONFIRMED", priority: "NORMAL", customerIndex: 1, items: [{ slug: "pentax-cm-50-centrifugal-pump", qty: 2 }, { slug: "semnan-energy-100l-pressure-tank", qty: 1 }], note: "تحویل در کاشان، هزینه ارسال را هم اعلام کنید.", daysAgo: 2, assigned: true },
    { type: "QUOTE", status: "QUOTED", priority: "URGENT", customerIndex: 2, items: [{ slug: "pumpiran-uqh-205-9-submersible", qty: 3 }], note: "پروژه آبرسانی روستایی — نیاز به پیش‌فاکتور رسمی با کد اقتصادی.", daysAgo: 4, assigned: true },
    { type: "QUOTE", status: "REVIEWING", priority: "NORMAL", customerIndex: 3, items: [{ slug: "wilo-top-s-40-7-circulator", qty: 1 }], daysAgo: 5, assigned: true },
    { type: "ORDER", status: "COMPLETED", priority: "NORMAL", customerIndex: 4, items: [{ slug: "lowara-5sv-vertical-multistage", qty: 2 }, { slug: "sand-filter-30-inch", qty: 1 }], note: "خط تصفیه آب کارخانه.", daysAgo: 18, assigned: true },
    { type: "QUOTE", status: "AWAITING_CUSTOMER", priority: "LOW", customerIndex: 0, items: [{ slug: "gate-valve-cast-iron-pn16-4inch", qty: 8 }], daysAgo: 9, assigned: true },
    { type: "ORDER", status: "IN_PROGRESS", priority: "HIGH", customerIndex: 2, items: [{ slug: "steel-flange-6inch-class150", qty: 24 }], daysAgo: 6, assigned: true },
    { type: "QUOTE", status: "REJECTED", priority: "LOW", customerIndex: 3, items: [{ slug: "brass-swing-check-valve-2inch", qty: 1 }], daysAgo: 22 },
  ];

  let counter = 0;
  for (const seed of orderSeeds) {
    counter += 1;
    const createdAt = new Date(now.getTime() - seed.daysAgo * 864e5);
    const customer = customerRows[seed.customerIndex]!;
    const lineItems = seed.items.map((line) => {
      const product = pick(line.slug);
      const unitPrice = product.priceMode === "PUBLIC" ? product.price : null;
      return {
        product,
        quantity: line.qty,
        unitPrice,
        lineTotal: unitPrice ? unitPrice * line.qty : null,
      };
    });
    const subtotal = lineItems.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0);

    const [order] = await db
      .insert(orders)
      .values({
        number: `AR${seed.type === "QUOTE" ? "Q" : "O"}-1404-${String(counter).padStart(4, "0")}`,
        type: seed.type,
        status: seed.status,
        priority: seed.priority,
        source: seed.items.length > 1 ? "CART" : "PRODUCT_PAGE",
        customerId: customer.id,
        contactName: customer.fullName,
        contactPhone: customer.phone,
        contactEmail: customer.email,
        contactCompany: customer.companyName,
        contactCity: customer.city,
        note: seed.note ?? null,
        subtotal,
        total: subtotal,
        assignedToId: seed.assigned ? sales!.id : null,
        quotedAt: seed.status === "QUOTED" ? new Date(createdAt.getTime() + 864e5) : null,
        completedAt: seed.status === "COMPLETED" ? new Date(createdAt.getTime() + 5 * 864e5) : null,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(orderItems).values(
      lineItems.map((line) => ({
        orderId: order!.id,
        productId: line.product.id,
        productName: line.product.name,
        productSku: line.product.sku,
        productSlug: line.product.slug,
        imageUrl: img("generic"),
        quantity: line.quantity,
        unit: line.product.unit,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    );

    await db.insert(orderEvents).values([
      {
        orderId: order!.id,
        type: "CREATED",
        message: `${seed.type === "QUOTE" ? "درخواست استعلام" : "سفارش"} از طریق سایت ثبت شد.`,
        createdAt,
      },
      ...(seed.assigned
        ? [
            {
              orderId: order!.id,
              userId: sales!.id,
              type: "ASSIGNED" as const,
              message: `پرونده به ${sales!.name} ارجاع شد.`,
              createdAt: new Date(createdAt.getTime() + 36e5),
            },
          ]
        : []),
      ...(seed.status !== "NEW"
        ? [
            {
              orderId: order!.id,
              userId: sales!.id,
              type: "STATUS_CHANGED" as const,
              message: `وضعیت به «${seed.status}» تغییر کرد.`,
              createdAt: new Date(createdAt.getTime() + 72e5),
            },
          ]
        : []),
    ]);
  }

  await db.insert(counters).values([
    { key: "order:QUOTE", value: orderSeeds.filter((o) => o.type === "QUOTE").length },
    { key: "order:ORDER", value: orderSeeds.filter((o) => o.type === "ORDER").length },
  ]);

  /* --------------------------------- اخبار ------------------------------ */
  console.log("→ اخبار و پروژه‌ها…");
  await db.insert(posts).values([
    {
      title: "چگونه پمپ آب مناسب ساختمان خود را انتخاب کنیم؟",
      slug: "how-to-choose-water-pump",
      excerpt: "انتخاب پمپ آب فقط به قدرت موتور بستگی ندارد؛ هد مورد نیاز، دبی مصرفی و افت فشار لوله‌کشی سه پارامتری هستند که باید با هم محاسبه شوند.",
      content:
        "انتخاب پمپ آب برای ساختمان، برخلاف تصور رایج، فقط به «چند اسب بودن» موتور خلاصه نمی‌شود. سه پارامتر کلیدی باید هم‌زمان محاسبه شوند:\n\n### ۱. هد مورد نیاز\nهد یعنی ارتفاعی که پمپ باید آب را بالا ببرد، به‌علاوه افت فشار ناشی از طول لوله، زانویی‌ها و شیرآلات. یک قاعده سرانگشتی: به ازای هر طبقه حدود ۳ متر و به ازای هر ۱۰ متر لوله افقی حدود ۰٫۵ متر افت در نظر بگیرید.\n\n### ۲. دبی مصرفی\nدبی یعنی مقدار آبی که در واحد زمان نیاز دارید. برای یک واحد مسکونی معمولی حدود ۱۵ تا ۲۰ لیتر بر دقیقه کافی است، اما این عدد با تعداد واحدها به‌صورت غیرخطی رشد می‌کند (ضریب هم‌زمانی).\n\n### ۳. نقطه کار روی منحنی پمپ\nپمپی درست انتخاب شده که نقطه کار آن نزدیک به بیشترین راندمان منحنی باشد. پمپ بزرگ‌تر از نیاز، هم برق بیشتری مصرف می‌کند و هم زودتر مستهلک می‌شود.\n\n> کارشناسان ما این محاسبه را برای پروژه شما رایگان انجام می‌دهند؛ کافی است نقشه یا مشخصات ساختمان را ارسال کنید.",
      category: "راهنمای خرید",
      tags: ["پمپ آب", "راهنمای انتخاب", "محاسبه هد"],
      status: "PUBLISHED",
      isFeatured: true,
      readingMinutes: 6,
      viewCount: 1840,
      authorId: editor!.id,
      publishedAt: new Date(now.getTime() - 3 * 864e5),
      coverUrl: img("centrifugal-pump"),
    },
    {
      title: "ضربه قوچ چیست و چگونه از آن جلوگیری کنیم؟",
      slug: "water-hammer-prevention",
      excerpt: "صدای کوبش در لوله‌ها فقط آزاردهنده نیست؛ ضربه قوچ می‌تواند اتصالات و شیرآلات را در بلندمدت تخریب کند.",
      content:
        "ضربه قوچ (Water Hammer) موج فشاری است که با بسته‌شدن ناگهانی شیر یا خاموش‌شدن پمپ در خط لوله ایجاد می‌شود. این موج می‌تواند فشاری چند برابر فشار کاری عادی تولید کند.\n\n### راهکارهای کنترل\n\n۱. **استفاده از شیرهای آهسته‌بند** به‌جای شیرهای ربع‌گرد سریع\n۲. **نصب منبع تحت فشار یا ضربه‌گیر** در نزدیکی پمپ\n۳. **راه‌اندازی نرم پمپ** با سافت‌استارتر یا درایو دور متغیر\n۴. **طراحی درست قطر لوله** — سرعت سیال بهتر است زیر ۲٫۵ متر بر ثانیه بماند\n\nدر پروژه‌های صنعتی، شبیه‌سازی گذرا (transient analysis) پیش از اجرا هزینه بسیار کمتری از تعمیرات بعدی دارد.",
      category: "مقالات فنی",
      tags: ["ضربه قوچ", "لوله‌کشی", "نگهداری"],
      status: "PUBLISHED",
      readingMinutes: 5,
      viewCount: 960,
      authorId: editor!.id,
      publishedAt: new Date(now.getTime() - 12 * 864e5),
      coverUrl: img("pipe-fitting"),
    },
    {
      title: "افتتاح انبار جدید در شهرک صنعتی و افزایش موجودی قطعات یدکی",
      slug: "new-warehouse-opening",
      excerpt: "با راه‌اندازی انبار جدید، زمان تحویل سفارش‌های شهرستان به‌طور میانگین دو روز کاهش پیدا کرد.",
      content:
        "انبار مرکزی جدید با زیربنای ۲۲۰۰ متر مربع در شهرک صنعتی به بهره‌برداری رسید. این انبار امکان نگهداری موجودی بیشتری از قطعات یدکی پرمصرف — شامل مکانیکال سیل، بلبرینگ، پروانه و کوپلینگ — را فراهم می‌کند.\n\nنتیجه مستقیم این توسعه برای مشتریان، کاهش میانگین زمان تحویل سفارش‌های شهرستان از ۵ روز به ۳ روز کاری است.",
      category: "اخبار شرکت",
      tags: ["اخبار", "انبار", "خدمات"],
      status: "PUBLISHED",
      readingMinutes: 3,
      viewCount: 420,
      authorId: owner!.id,
      publishedAt: new Date(now.getTime() - 25 * 864e5),
      coverUrl: img("booster-set"),
    },
    {
      title: "نگهداری دوره‌ای بوستر پمپ: چک‌لیست فصلی",
      slug: "booster-pump-maintenance-checklist",
      excerpt: "یک چک‌لیست عملی برای سرویس فصلی بوستر پمپ که عمر تجهیزات را چند سال افزایش می‌دهد.",
      content:
        "سرویس دوره‌ای بوستر پمپ کار پیچیده‌ای نیست، اما نادیده گرفتن آن هزینه‌ساز است. چک‌لیست زیر را هر سه ماه اجرا کنید:\n\n- بررسی فشار پیش‌شارژ منبع تحت فشار (باید حدود ۰٫۲ بار کمتر از فشار قطع پمپ باشد)\n- بازدید نشتی مکانیکال سیل\n- اندازه‌گیری جریان مصرفی موتور و مقایسه با پلاک\n- بررسی عملکرد پرشر سوئیچ در نقاط قطع و وصل\n- تمیزکاری صافی ورودی\n- بررسی لرزش و صدای غیرعادی بلبرینگ\n\nثبت نتایج در یک دفترچه، روند استهلاک را قابل پیش‌بینی می‌کند.",
      category: "مقالات فنی",
      tags: ["نگهداری", "بوستر پمپ", "چک‌لیست"],
      status: "PUBLISHED",
      readingMinutes: 4,
      viewCount: 730,
      authorId: editor!.id,
      publishedAt: new Date(now.getTime() - 40 * 864e5),
      coverUrl: img("electro-pump"),
    },
  ]);

  /*
   * پروژه‌ها — عمداً خالی.
   *
   * چهار پروژه نمونه قبلی (مجتمع ۳۲۰ واحدی تهران، ایستگاه پمپاژ اردبیل،
   * کارخانه لبنیات رشت، بیمارستان قم) داده واقعی نبودند و نام کارفرمایان
   * ساختگی بود. نمایش آن‌ها به‌عنوان «پروژه‌های اجراشده» ادعای نادرست درباره
   * سابقه شرکت است، بنابراین حذف شدند.
   *
   * صفحه /projects و بخش صفحه اصلی هر دو حالت خالی را به‌درستی مدیریت می‌کنند.
   * برای افزودن پروژه واقعی، از پنل مدیریت (/admin/projects) استفاده کنید
   * یا ساختار زیر را
   * با داده واقعی پر کنید:
   *
   *   await db.insert(projects).values([
   *     { title: "...", slug: "...", client: "...", location: "...",
   *       year: "...", capacity: "...", summary: "...",
   *       coverUrl: img("booster-set"), isFeatured: true, position: 1,
   *       tags: ["ساختمانی"] },
   *   ]);
   */

  await db.insert(contactMessages).values([
    { name: "علی محمدی", phone: "09121110000", subject: "درخواست نمایندگی", message: "سلام، برای اخذ نمایندگی در استان یزد نیاز به راهنمایی دارم. شرایط و حداقل سفارش را اعلام بفرمایید.", status: "NEW" },
    { name: "فاطمه احمدی", phone: "09122220000", email: "f.ahmadi@example.com", subject: "پشتیبانی فنی", message: "پمپ خریداری‌شده صدای غیرعادی می‌دهد. امکان اعزام کارشناس وجود دارد؟", status: "READ" },
  ]);

  /* -------------------------------- تنظیمات ----------------------------- */
  console.log("→ تنظیمات…");
  await db.insert(settings).values([
    { key: "site.name", value: "نیروژن", group: "general", label: "نام سایت" },
    { key: "site.tagline", value: "تأمین، فروش و نصب تجهیزات صنعتی و آبرسانی", group: "general", label: "شعار سایت" },
    { key: "contact.phone", value: "021-12345678", group: "contact", label: "تلفن اصلی" },
    { key: "contact.mobile", value: "0912-1234567", group: "contact", label: "موبایل پشتیبانی" },
    { key: "contact.email", value: "info@example.com", group: "contact", label: "ایمیل" },
    { key: "contact.address", value: "تهران، بزرگراه فتح، خیابان صنعت، پلاک ۱۲۸", group: "contact", label: "آدرس" },
    { key: "orders.notifyEmail", value: "sales@example.com", group: "orders", label: "ایمیل دریافت سفارش‌ها" },
    { key: "orders.autoAssign", value: false, group: "orders", label: "ارجاع خودکار سفارش‌ها" },
    { key: "features.cart", value: true, group: "features", label: "فعال‌سازی سبد استعلام" },
    { key: "features.onlinePayment", value: false, group: "features", label: "پرداخت آنلاین (فاز بعدی)" },
    { key: "seo.metaTitle", value: "نیروژن | تجهیزات صنعتی و آبرسانی", group: "seo", label: "عنوان پیش‌فرض" },
    { key: "seo.metaDescription", value: "تأمین‌کننده تخصصی پمپ آب، مخزن تحت فشار، شیرآلات و اتصالات صنعتی.", group: "seo", label: "توضیحات پیش‌فرض" },
  ]);

  console.log("\n✔ داده اولیه با موفقیت ساخته شد.");
  console.log("  ورود به پنل:  /admin/login");
  console.log("  ایمیل:        admin@example.com");
  console.log("  رمز عبور:     Admin@12345\n");
}

main()
  .catch((error) => {
    console.error("✖ خطا در ساخت داده اولیه:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

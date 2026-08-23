/**
 * =============================================================================
 *  ماژول مدیریت — لایه خواندن داده پنل
 * =============================================================================
 */
import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activityLogs,
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
  type OrderStatus,
  type OrderType,
  type ProductStatus,
} from "@/db/schema";
import { ORDER_ACTIONABLE_STATUSES, ORDER_CLOSED_STATUSES, PAGE_SIZE } from "@/lib/constants";

/* -------------------------------------------------------------------------- */
/*  نشانگرهای نوار کناری                                                       */
/* -------------------------------------------------------------------------- */

export async function getBadgeCounts() {
  const [openOrders, newMessages] = await Promise.all([
    db.select({ total: count() }).from(orders).where(inArray(orders.status, ORDER_ACTIONABLE_STATUSES)),
    db.select({ total: count() }).from(contactMessages).where(eq(contactMessages.status, "NEW")),
  ]);

  return {
    orders: openOrders[0]?.total ?? 0,
    messages: newMessages[0]?.total ?? 0,
  };
}

/* -------------------------------------------------------------------------- */
/*  داشبورد                                                                     */
/* -------------------------------------------------------------------------- */

export async function getDashboardData() {
  const now = new Date();
  const last30 = new Date(now.getTime() - 30 * 864e5);
  const last7 = new Date(now.getTime() - 7 * 864e5);

  const [
    totalOrders,
    openOrders,
    quotesLast30,
    completedLast30,
    totalCustomers,
    newCustomers7,
    publishedProducts,
    draftProducts,
    unreadMessages,
    recentOrders,
    statusBreakdown,
    dailyTrend,
    topProducts,
    recentActivity,
  ] = await Promise.all([
    db.select({ total: count() }).from(orders),
    db.select({ total: count() }).from(orders).where(inArray(orders.status, ORDER_ACTIONABLE_STATUSES)),
    db.select({ total: count() }).from(orders).where(gte(orders.createdAt, last30)),
    db
      .select({ total: count() })
      .from(orders)
      .where(and(eq(orders.status, "COMPLETED"), gte(orders.createdAt, last30))),
    db.select({ total: count() }).from(customers),
    db.select({ total: count() }).from(customers).where(gte(customers.createdAt, last7)),
    db.select({ total: count() }).from(products).where(eq(products.status, "PUBLISHED")),
    db.select({ total: count() }).from(products).where(eq(products.status, "DRAFT")),
    db.select({ total: count() }).from(contactMessages).where(eq(contactMessages.status, "NEW")),

    // آخرین درخواست‌ها
    db
      .select({
        id: orders.id,
        number: orders.number,
        type: orders.type,
        status: orders.status,
        priority: orders.priority,
        contactName: orders.contactName,
        contactPhone: orders.contactPhone,
        contactCompany: orders.contactCompany,
        total: orders.total,
        createdAt: orders.createdAt,
        assigneeName: users.name,
        itemCount: sql<number>`(select count(*)::int from order_items oi where oi.order_id = orders.id)`,
      })
      .from(orders)
      .leftJoin(users, eq(orders.assignedToId, users.id))
      .orderBy(desc(orders.createdAt))
      .limit(8),

    // توزیع وضعیت
    db.select({ status: orders.status, total: count() }).from(orders).groupBy(orders.status),

    // روند ۱۴ روز اخیر
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'YYYY-MM-DD')`,
        total: count(),
      })
      .from(orders)
      .where(gte(orders.createdAt, new Date(now.getTime() - 14 * 864e5)))
      .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
      .orderBy(sql`date_trunc('day', ${orders.createdAt})`),

    // پرتقاضاترین محصولات
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        orderCount: products.orderCount,
        viewCount: products.viewCount,
      })
      .from(products)
      .where(eq(products.status, "PUBLISHED"))
      .orderBy(desc(products.orderCount), desc(products.viewCount))
      .limit(5),

    // آخرین فعالیت‌ها
    db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entity: activityLogs.entity,
        summary: activityLogs.summary,
        createdAt: activityLogs.createdAt,
        userName: users.name,
      })
      .from(activityLogs)
      .leftJoin(users, eq(activityLogs.userId, users.id))
      .orderBy(desc(activityLogs.createdAt))
      .limit(8),
  ]);

  return {
    stats: {
      totalOrders: totalOrders[0]?.total ?? 0,
      openOrders: openOrders[0]?.total ?? 0,
      quotesLast30: quotesLast30[0]?.total ?? 0,
      completedLast30: completedLast30[0]?.total ?? 0,
      totalCustomers: totalCustomers[0]?.total ?? 0,
      newCustomers7: newCustomers7[0]?.total ?? 0,
      publishedProducts: publishedProducts[0]?.total ?? 0,
      draftProducts: draftProducts[0]?.total ?? 0,
      unreadMessages: unreadMessages[0]?.total ?? 0,
    },
    recentOrders,
    statusBreakdown,
    dailyTrend,
    topProducts,
    recentActivity,
  };
}

/* -------------------------------------------------------------------------- */
/*  سفارش‌ها                                                                    */
/* -------------------------------------------------------------------------- */

export type OrderListFilters = {
  q?: string;
  status?: OrderStatus;
  type?: OrderType;
  assignee?: string;
  open?: boolean;
  page?: number;
};

export async function listOrders(filters: OrderListFilters = {}) {
  const { q, status, type, assignee, open, page = 1 } = filters;
  const pageSize = PAGE_SIZE.admin;
  const conditions = [];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(
      or(
        ilike(orders.number, term),
        ilike(orders.contactName, term),
        ilike(orders.contactPhone, term),
        ilike(orders.contactCompany, term),
      )!,
    );
  }
  if (status) conditions.push(eq(orders.status, status));
  if (type) conditions.push(eq(orders.type, type));
  if (assignee === "none") conditions.push(isNull(orders.assignedToId));
  else if (assignee) conditions.push(eq(orders.assignedToId, assignee));
  if (open) conditions.push(inArray(orders.status, ORDER_ACTIONABLE_STATUSES));

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(orders).where(where);

  const items = await db
    .select({
      id: orders.id,
      number: orders.number,
      type: orders.type,
      status: orders.status,
      priority: orders.priority,
      source: orders.source,
      contactName: orders.contactName,
      contactPhone: orders.contactPhone,
      contactCompany: orders.contactCompany,
      contactCity: orders.contactCity,
      total: orders.total,
      createdAt: orders.createdAt,
      assigneeName: users.name,
      itemCount: sql<number>`(select count(*)::int from order_items oi where oi.order_id = orders.id)`,
    })
    .from(orders)
    .leftJoin(users, eq(orders.assignedToId, users.id))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getOrderById(id: string) {
  const [row] = await db
    .select({
      order: orders,
      assigneeName: users.name,
      customerId: customers.id,
      customerTags: customers.tags,
    })
    .from(orders)
    .leftJoin(users, eq(orders.assignedToId, users.id))
    .leftJoin(customers, eq(orders.customerId, customers.id))
    .where(eq(orders.id, id))
    .limit(1);

  if (!row) return null;

  const [items, events, customerHistory] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, id)),
    db
      .select({
        id: orderEvents.id,
        type: orderEvents.type,
        message: orderEvents.message,
        createdAt: orderEvents.createdAt,
        userName: users.name,
      })
      .from(orderEvents)
      .leftJoin(users, eq(orderEvents.userId, users.id))
      .where(eq(orderEvents.orderId, id))
      .orderBy(desc(orderEvents.createdAt)),
    row.order.customerId
      ? db
          .select({
            id: orders.id,
            number: orders.number,
            status: orders.status,
            type: orders.type,
            total: orders.total,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(and(eq(orders.customerId, row.order.customerId), sql`${orders.id} <> ${id}`))
          .orderBy(desc(orders.createdAt))
          .limit(5)
      : Promise.resolve([]),
  ]);

  return { ...row, items, events, customerHistory };
}

export async function getStaffList() {
  return db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(eq(users.isActive, true), inArray(users.role, ["OWNER", "ADMIN", "SALES"])))
    .orderBy(asc(users.name));
}

/* -------------------------------------------------------------------------- */
/*  محصولات                                                                     */
/* -------------------------------------------------------------------------- */

export async function listAdminProducts(filters: {
  q?: string;
  status?: ProductStatus;
  categoryId?: string;
  page?: number;
} = {}) {
  const { q, status, categoryId, page = 1 } = filters;
  const pageSize = PAGE_SIZE.admin;
  const conditions = [];

  if (q?.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.sku, term), ilike(products.model, term))!);
  }
  if (status) conditions.push(eq(products.status, status));
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  const where = conditions.length ? and(...conditions) : undefined;
  const [totalRow] = await db.select({ total: count() }).from(products).where(where);

  const items = await db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      status: products.status,
      priceMode: products.priceMode,
      price: products.price,
      stockStatus: products.stockStatus,
      isFeatured: products.isFeatured,
      viewCount: products.viewCount,
      orderCount: products.orderCount,
      updatedAt: products.updatedAt,
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
    .where(where)
    .orderBy(desc(products.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminProduct(id: string) {
  const [product] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!product) return null;

  const [images, specs] = await Promise.all([
    db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.position)),
    db.select().from(productSpecs).where(eq(productSpecs.productId, id)).orderBy(asc(productSpecs.position)),
  ]);

  return { product, images, specs };
}

/* -------------------------------------------------------------------------- */
/*  پروژه‌ها                                                                    */
/* -------------------------------------------------------------------------- */

/** همه پروژه‌ها برای جدول پنل — شامل غیرفعال‌ها، برخلاف کوئری عمومی */
export async function getAdminProjects() {
  return db
    .select()
    .from(projects)
    .orderBy(desc(projects.isFeatured), asc(projects.position), desc(projects.createdAt));
}

export async function getAdminProject(id: string) {
  const [row] = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return row ?? null;
}

export async function getCategoryOptions() {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      parentId: categories.parentId,
      slug: categories.slug,
      position: categories.position,
      isActive: categories.isActive,
      productCount: sql<number>`(
        select count(*)::int from products p where p.category_id = categories.id
      )`,
    })
    .from(categories)
    .orderBy(asc(categories.position), asc(categories.name));

  // فهرست تخت با تورفتگی — برای نمایش درختی داخل <select>
  const result: ((typeof rows)[number] & { depth: number })[] = [];
  for (const root of rows.filter((r) => !r.parentId)) {
    result.push({ ...root, depth: 0 });
    for (const child of rows.filter((r) => r.parentId === root.id)) {
      result.push({ ...child, depth: 1 });
    }
  }
  return result;
}

export async function getBrandOptions() {
  return db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      country: brands.country,
      isActive: brands.isActive,
      isFeatured: brands.isFeatured,
      position: brands.position,
      productCount: sql<number>`(
        select count(*)::int from products p where p.brand_id = brands.id
      )`,
    })
    .from(brands)
    .orderBy(asc(brands.position), asc(brands.name));
}

/* -------------------------------------------------------------------------- */
/*  مشتریان                                                                     */
/* -------------------------------------------------------------------------- */

export async function listCustomers(filters: { q?: string; page?: number } = {}) {
  const { q, page = 1 } = filters;
  const pageSize = PAGE_SIZE.admin;

  const where = q?.trim()
    ? or(
        ilike(customers.fullName, `%${q.trim()}%`),
        ilike(customers.phone, `%${q.trim()}%`),
        ilike(customers.companyName, `%${q.trim()}%`),
      )
    : undefined;

  const [totalRow] = await db.select({ total: count() }).from(customers).where(where);

  const items = await db
    .select({
      id: customers.id,
      fullName: customers.fullName,
      phone: customers.phone,
      email: customers.email,
      type: customers.type,
      companyName: customers.companyName,
      city: customers.city,
      tags: customers.tags,
      createdAt: customers.createdAt,
      orderCount: sql<number>`(select count(*)::int from orders o where o.customer_id = customers.id)`,
      lastOrderAt: sql<Date | null>`(select max(o.created_at) from orders o where o.customer_id = customers.id)`,
    })
    .from(customers)
    .where(where)
    .orderBy(desc(customers.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCustomerById(id: string) {
  const [customer] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  if (!customer) return null;

  const customerOrders = await db
    .select({
      id: orders.id,
      number: orders.number,
      type: orders.type,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.customerId, id))
    .orderBy(desc(orders.createdAt));

  return { customer, orders: customerOrders };
}

/* -------------------------------------------------------------------------- */
/*  محتوا و پیام‌ها                                                             */
/* -------------------------------------------------------------------------- */

export async function listAdminPosts(filters: { q?: string; page?: number } = {}) {
  const { q, page = 1 } = filters;
  const pageSize = PAGE_SIZE.admin;
  const where = q?.trim() ? ilike(posts.title, `%${q.trim()}%`) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(posts).where(where);

  const items = await db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      category: posts.category,
      status: posts.status,
      viewCount: posts.viewCount,
      isFeatured: posts.isFeatured,
      publishedAt: posts.publishedAt,
      updatedAt: posts.updatedAt,
      authorName: users.name,
    })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(where)
    .orderBy(desc(posts.updatedAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getAdminPost(id: string) {
  const [row] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return row ?? null;
}

export async function listMessages(filters: { status?: MessageStatus; page?: number } = {}) {
  const { status, page = 1 } = filters;
  const pageSize = PAGE_SIZE.admin;
  const where = status ? eq(contactMessages.status, status) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(contactMessages).where(where);

  const items = await db
    .select()
    .from(contactMessages)
    .where(where)
    .orderBy(desc(contactMessages.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

/* -------------------------------------------------------------------------- */
/*  کاربران، تنظیمات و لاگ                                                      */
/* -------------------------------------------------------------------------- */

export async function listUsers() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      isActive: users.isActive,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.name));
}

export async function getSettings() {
  return db.select().from(settings).orderBy(asc(settings.group), asc(settings.key));
}

export async function listActivityLogs(filters: { entity?: string; page?: number } = {}) {
  const { entity, page = 1 } = filters;
  const pageSize = 40;
  const where = entity ? eq(activityLogs.entity, entity) : undefined;

  const [totalRow] = await db.select({ total: count() }).from(activityLogs).where(where);

  const items = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entity: activityLogs.entity,
      entityId: activityLogs.entityId,
      summary: activityLogs.summary,
      ip: activityLogs.ip,
      createdAt: activityLogs.createdAt,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(where)
    .orderBy(desc(activityLogs.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = totalRow?.total ?? 0;
  return { items, total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export { ORDER_CLOSED_STATUSES };

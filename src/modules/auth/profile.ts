import "server-only";

import { and, desc, eq, gt, ne } from "drizzle-orm";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { getCurrentSessionId, requireUser } from "@/lib/auth";

/**
 * =============================================================================
 *  حساب کاربری خودِ کاربر
 * =============================================================================
 *  جدا از modules/admin/queries است و باید هم باشد: آن‌ها همه پشت مجوز
 *  «users» هستند که فقط مدیر ارشد دارد. این‌ها دربارهٔ حساب خودِ فرد است و هر
 *  کاربری باید بتواند ببیندشان — وگرنه کارشناس فروش برای عوض کردن رمز خودش
 *  باید از مدیر خواهش کند.
 * =============================================================================
 */

/**
 * دستگاه، از روی user-agent.
 *
 * تشخیص دقیق مرورگر کار کتابخانه است و اینجا لازم نیست؛ چیزی که کاربر برای
 * پاسخ به «این من بودم؟» نیاز دارد یک نشانهٔ آشناست، نه شمارهٔ نسخه.
 */
export function describeDevice(ua: string | null): string {
  if (!ua) return "دستگاه ناشناس";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\/|Opera/.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "مرورگر";
  const system = /Android/.test(ua)
    ? "اندروید"
    : /iPhone|iPad|iPod/.test(ua)
      ? "iOS"
      : /Mac OS X/.test(ua)
        ? "مک"
        : /Windows/.test(ua)
          ? "ویندوز"
          : /Linux/.test(ua)
            ? "لینوکس"
            : "سیستم ناشناس";
  return `${browser} · ${system}`;
}

/** پروفایل کاربر جاری، با جزئیاتی که getCurrentUser نمی‌آورد */
export async function getMyProfile() {
  const me = await requireUser();
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      role: users.role,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, me.id))
    .limit(1);
  return row ?? null;
}

/**
 * نشست‌های فعال.
 *
 * فقط نشست‌های منقضی‌نشده، و نشست جاری علامت می‌خورد. توکن و درهمش هیچ‌وقت
 * از این لایه بیرون نمی‌روند؛ چیزی که نمایش داده می‌شود برای تشخیص است، نه
 * برای استفادهٔ دوباره.
 */
export async function getMySessions() {
  const me = await requireUser();
  const currentId = await getCurrentSessionId();

  const rows = await db
    .select({
      id: sessions.id,
      userAgent: sessions.userAgent,
      ip: sessions.ip,
      createdAt: sessions.createdAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, me.id), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.createdAt));

  return rows.map((row) => ({
    ...row,
    device: describeDevice(row.userAgent),
    isCurrent: row.id === currentId,
  }));
}

/** شمار نشست‌های فعالِ غیر از همین دستگاه */
export async function countOtherSessions(): Promise<number> {
  const me = await requireUser();
  const currentId = await getCurrentSessionId();
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, me.id),
        gt(sessions.expiresAt, new Date()),
        currentId ? ne(sessions.id, currentId) : undefined,
      ),
    );
  return rows.length;
}

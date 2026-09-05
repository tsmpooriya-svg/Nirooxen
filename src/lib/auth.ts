/**
 * =============================================================================
 *  احراز هویت پنل مدیریت
 * =============================================================================
 *  الگو: توکن مبهم (opaque) + هش SHA-256 در پایگاه داده.
 *
 *  چرا JWT نه؟ توکن مبهم امکان «ابطال فوری نشست» را می‌دهد (خروج از همه
 *  دستگاه‌ها، غیرفعال کردن کاربر)، که برای پنل مدیریت یک الزام امنیتی است.
 *  کوکی httpOnly + sameSite=lax + secure در production تنظیم می‌شود.
 * =============================================================================
 */
import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cache } from "react";

import bcrypt from "bcryptjs";
import { and, eq, gt, lt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";
import { can, canWrite, type PermissionKey } from "@/lib/constants";

export const SESSION_COOKIE = "aria_session";
const SESSION_TTL_DAYS = 7;
const BCRYPT_ROUNDS = 12;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
};

/* ------------------------------ رمز عبور --------------------------------- */

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/* ------------------------------- توکن‌ها ---------------------------------- */

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** مقایسه ثابت‌زمان برای جلوگیری از timing attack */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/* ------------------------------- نشست‌ها ---------------------------------- */

export async function createSession(userId: string): Promise<void> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const headerList = await headers();

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: headerList.get("user-agent")?.slice(0, 400) ?? null,
    ip: getClientIp(headerList),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  // پاکسازی تنبل نشست‌های منقضی
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** ابطال تمام نشست‌های یک کاربر — مثلاً هنگام غیرفعال‌سازی حساب */
export async function destroyAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/**
 * کاربر جاری. با cache() در طول یک request فقط یک بار به دیتابیس می‌رود،
 * حتی اگر ده‌ها کامپوننت آن را صدا بزنند.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      avatarUrl: users.avatarUrl,
      isActive: users.isActive,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const user = rows[0];
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  };
});

/** در Server Action ها استفاده می‌شود؛ در صورت نبود نشست خطا پرتاب می‌کند */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("برای انجام این عملیات باید وارد شوید.");
  return user;
}

export async function requirePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, key)) {
    throw new AuthError("شما به این بخش دسترسی ندارید.");
  }
  return user;
}

export async function requireWritePermission(key: PermissionKey): Promise<SessionUser> {
  const user = await requireUser();
  if (!canWrite(user.role, key)) {
    throw new AuthError("حساب شما فقط اجازه مشاهده دارد و نمی‌تواند این تغییر را انجام دهد.");
  }
  return user;
}

export async function requirePageAccess(key: PermissionKey): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (!can(user.role, key)) redirect("/admin");
  return user;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/* --------------------------------- کمکی ---------------------------------- */

export function getClientIp(headerList: Headers): string | null {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim().slice(0, 60);
  return headerList.get("x-real-ip")?.slice(0, 60) ?? null;
}

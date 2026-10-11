"use server";

import { and, eq, gt, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import {
  AuthError,
  getClientIp,
  getCurrentSessionId,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { passwordChangeSchema, profileSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

/**
 * =============================================================================
 *  اکشن‌های حساب کاربری
 * =============================================================================
 *  هیچ‌کدام مجوز بخشی نمی‌خواهند — موضوعشان حساب خودِ کاربر است. اما همه
 *  requireUser دارند، و آنچه عوض می‌کنند همیشه از نشست خوانده می‌شود نه از
 *  فرم: شناسهٔ کاربر هرگز از ورودی گرفته نمی‌شود، وگرنه هر کاربری می‌توانست
 *  رمز دیگری را عوض کند.
 * =============================================================================
 */

export type ProfileState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
};

async function guard(fn: () => Promise<ProfileState>): Promise<ProfileState> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof AuthError) return { status: "error", message: error.message };
    console.error("[profile]", error);
    return { status: "error", message: "عملیات ناموفق بود." };
  }
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  return guard(async () => {
    const me = await requireUser();
    const parsed = profileSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
    });
    if (!parsed.success) return { status: "error", errors: toFieldErrors(parsed.error) };

    await db
      .update(users)
      .set({ name: parsed.data.name, phone: parsed.data.phone || null, updatedAt: new Date() })
      .where(eq(users.id, me.id));

    await logActivity({
      userId: me.id,
      action: "update",
      entity: "user",
      entityId: me.id,
      summary: "ویرایش پروفایل شخصی",
    });

    revalidatePath("/admin/profile");
    // نام در نوار کناری هم دیده می‌شود
    revalidatePath("/admin", "layout");
    return { status: "success", message: "پروفایل به‌روزرسانی شد." };
  });
}

export async function changePassword(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  return guard(async () => {
    const me = await requireUser();

    /*
      محدودسازی نرخ اینجا هم لازم است: فرم تغییر رمز، رمز فعلی را می‌سنجد، پس
      بدون سقف به یک اوراکلِ حدس‌زدن رمز تبدیل می‌شود — با این تفاوت که مهاجم
      از قبل یک نشست معتبر دارد و صفحهٔ ورود را اصلاً نمی‌بیند.
    */
    const headerList = await headers();
    const ip = getClientIp(headerList) ?? "unknown";
    const limit = rateLimit(`password:${me.id}:${ip}`, RATE_LIMITS.login);
    if (!limit.success) {
      return {
        status: "error",
        message: `تلاش‌های ناموفق زیاد بوده است. ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
      };
    }

    const parsed = passwordChangeSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return { status: "error", errors: toFieldErrors(parsed.error) };

    const [row] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, me.id))
      .limit(1);
    if (!row) return { status: "error", message: "حساب پیدا نشد." };

    const ok = await verifyPassword(parsed.data.currentPassword, row.passwordHash);
    if (!ok) {
      await logActivity({
        userId: me.id,
        action: "login_failed",
        entity: "user",
        entityId: me.id,
        summary: "رمز فعلی نادرست در تغییر رمز",
      });
      return { status: "error", errors: { currentPassword: "رمز فعلی نادرست است" } };
    }

    const currentSessionId = await getCurrentSessionId();

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: await hashPassword(parsed.data.newPassword),
          updatedAt: new Date(),
          // رمز تازه یعنی شروع تازه؛ قفل و شمارندهٔ قبلی دیگر معنا ندارند
          failedLoginCount: 0,
          failedLoginAt: null,
          lockedUntil: null,
        })
        .where(eq(users.id, me.id));

      /*
        بقیهٔ نشست‌ها باطل می‌شوند و همین‌جا، در همان تراکنش.

        اگر کسی رمزش را عوض می‌کند چون نگران است، نشستی که روی دستگاه دیگری
        باز مانده دقیقاً همان چیزی است که می‌خواهد ببندد. نشست خودش می‌ماند تا
        وسط کار بیرون انداخته نشود.
      */
      if (currentSessionId) {
        await tx
          .delete(sessions)
          .where(and(eq(sessions.userId, me.id), ne(sessions.id, currentSessionId)));
      }
    });

    await logActivity({
      userId: me.id,
      action: "update",
      entity: "user",
      entityId: me.id,
      summary: "تغییر رمز عبور و ابطال نشست‌های دیگر",
    });

    revalidatePath("/admin/profile");
    return { status: "success", message: "رمز عبور عوض شد و نشست‌های دیگر بسته شدند." };
  });
}

/** بستن یک نشست مشخص — نشست جاری پذیرفته نمی‌شود */
export async function revokeSession(sessionId: string): Promise<ProfileState> {
  return guard(async () => {
    const me = await requireUser();
    const currentId = await getCurrentSessionId();
    if (sessionId === currentId) {
      return { status: "error", message: "برای بستن همین دستگاه، از «خروج از حساب» استفاده کنید." };
    }

    /*
      شرط userId حیاتی است: بدون آن، فرستادن شناسهٔ نشستِ کاربر دیگر او را
      بیرون می‌انداخت. شناسه از فرم می‌آید و فرم قابل دست‌کاری است.
    */
    const removed = await db
      .delete(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, me.id)))
      .returning({ id: sessions.id });

    if (removed.length === 0) return { status: "error", message: "این نشست پیدا نشد." };

    await logActivity({
      userId: me.id,
      action: "logout",
      entity: "user",
      entityId: me.id,
      summary: "بستن یک نشست از صفحهٔ پروفایل",
    });

    revalidatePath("/admin/profile");
    return { status: "success", message: "نشست بسته شد." };
  });
}

/** بستن همهٔ نشست‌ها به‌جز همین دستگاه */
export async function revokeOtherSessions(): Promise<ProfileState> {
  return guard(async () => {
    const me = await requireUser();
    const currentId = await getCurrentSessionId();

    const removed = await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, me.id),
          gt(sessions.expiresAt, new Date()),
          currentId ? ne(sessions.id, currentId) : undefined,
        ),
      )
      .returning({ id: sessions.id });

    await logActivity({
      userId: me.id,
      action: "logout",
      entity: "user",
      entityId: me.id,
      summary: `خروج از ${removed.length} دستگاه دیگر`,
    });

    revalidatePath("/admin/profile");
    return {
      status: "success",
      message: removed.length > 0 ? `${removed.length} نشست بسته شد.` : "نشست دیگری باز نبود.",
    };
  });
}

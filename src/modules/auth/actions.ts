"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { users } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import {
  createSession,
  destroySession,
  getCurrentUser,
  getClientIp,
  verifyPassword,
} from "@/lib/auth";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { loginSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

export type LoginState = {
  status: "idle" | "error";
  message?: string;
  errors?: FieldErrors;
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  const limit = rateLimit(`login:${ip}`, RATE_LIMITS.login);
  if (!limit.success) {
    return {
      status: "error",
      message: `تلاش‌های ناموفق زیاد بوده است. ${Math.ceil(limit.retryAfterSeconds / 60)} دقیقه دیگر تلاش کنید.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", errors: toFieldErrors(parsed.error) };
  }

  const email = parsed.data.email.toLowerCase();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // پیام خطا عمداً یکسان است تا مهاجم نفهمد کدام ایمیل در سیستم وجود دارد
  const invalid: LoginState = { status: "error", message: "ایمیل یا رمز عبور نادرست است." };

  if (!user) {
    // برای یکسان‌سازی زمان پاسخ، یک مقایسه ساختگی انجام می‌شود
    await verifyPassword(parsed.data.password, "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
    await logActivity({ action: "login_failed", entity: "user", summary: `تلاش ناموفق ورود با ایمیل ${email}` });
    return invalid;
  }

  if (!user.isActive) {
    return { status: "error", message: "حساب کاربری شما غیرفعال شده است. با مدیر سیستم تماس بگیرید." };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      entity: "user",
      entityId: user.id,
      summary: `رمز عبور نادرست برای ${user.email}`,
    });
    return invalid;
  }

  await createSession(user.id);
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await logActivity({
    userId: user.id,
    action: "login",
    entity: "user",
    entityId: user.id,
    summary: `${user.name} وارد پنل شد.`,
  });

  redirect("/admin");
}

export async function logout() {
  const user = await getCurrentUser();
  if (user) {
    await logActivity({
      userId: user.id,
      action: "logout",
      entity: "user",
      entityId: user.id,
      summary: `${user.name} از پنل خارج شد.`,
    });
  }
  await destroySession();
  redirect("/admin/login");
}

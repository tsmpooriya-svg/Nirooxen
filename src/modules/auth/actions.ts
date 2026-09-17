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

/**
 * قفل در سطح حساب.
 *
 * ده شکست پشت‌سرهم در یک ربع ساعت، حساب را یک ربع می‌بندد.
 *
 * هر قفلی در سطح حساب این را هم می‌دهد که کسی می‌تواند عمداً حساب دیگری را
 * ببندد — ده حدس غلط کافی است. مبادله‌اش آگاهانه است: پانزده دقیقه دردسر است،
 * نه از کار افتادن، در برابر حمله‌ای که سقف IP اصلاً نمی‌بیندش. به همین دلیل
 * هم آستانه سخاوتمند است و هم مدت کوتاه.
 *
 * سقف IP پایین‌تر از این آستانه است، پس از یک آی‌پی هرگز به قفل نمی‌رسیم —
 * و لازم هم نیست: آنجا خودِ سقف IP جلو را گرفته. این شمارنده برای وقتی است
 * که تلاش‌ها از ده آی‌پی مختلف بیایند و هیچ‌کدام به سقف خودشان نرسند.
 */
const MAX_FAILURES = 10;
const LOCK_MINUTES = 15;
/** شکستی قدیمی‌تر از این، دیگر به شمارش امروز ربطی ندارد */
const WINDOW_MINUTES = 15;

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

  /*
    ترتیب اینجا امنیتی است: رمز عبور همیشه پیش از هر پیام اختصاصی بررسی می‌شود.
    اگر «حساب غیرفعال است» پیش از بررسی رمز برگردد، هر کسی با فرستادن یک رمز
    دلخواه می‌فهمد که آن ایمیل در سیستم وجود دارد — همان چیزی که پیام یکسانِ
    بالا برای پنهان کردنش هست.
  */
  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    /*
      شمارنده پیش از ثبت، بر اساس پنجره بازنشانی می‌شود: ده شکستِ پراکنده در
      چند ماه نباید همان وزن ده شکست در یک دقیقه را داشته باشد.
    */
    const fresh =
      user.failedLoginAt && Date.now() - user.failedLoginAt.getTime() < WINDOW_MINUTES * 60_000;
    const count = (fresh ? user.failedLoginCount : 0) + 1;
    const locked = count >= MAX_FAILURES;

    await db
      .update(users)
      .set({
        failedLoginCount: locked ? 0 : count,
        failedLoginAt: new Date(),
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000) : user.lockedUntil,
      })
      .where(eq(users.id, user.id));

    await logActivity({
      userId: user.id,
      action: "login_failed",
      entity: "user",
      entityId: user.id,
      summary: locked
        ? `حساب ${user.email} پس از ${MAX_FAILURES} تلاش ناموفق قفل شد`
        : `رمز عبور نادرست برای ${user.email}`,
    });
    return invalid;
  }

  /*
    از اینجا به بعد، رمز درست بوده.

    پیام‌های اختصاصی عمداً همین‌جا می‌آیند و نه زودتر: کسی که رمز را می‌داند
    صاحب حساب است، پس گفتن «قفل است» یا «غیرفعال است» به او چیزی لو نمی‌دهد.
    اگر همین بررسی‌ها پیش از تأیید رمز بودند، هر کسی با یک رمز دلخواه می‌فهمید
    که آن ایمیل در سیستم وجود دارد — همان چیزی که پیام یکسانِ بالا برای پنهان
    کردنش هست.

    قفل، ورودِ با رمزِ درست را هم می‌بندد. اگر نمی‌بست، حمله‌ای که سرانجام رمز
    را پیدا می‌کرد از قفل رد می‌شد و قفل بی‌معنا بود.
  */
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000));
    return {
      status: "error",
      message: `حساب شما به‌دلیل تلاش‌های ناموفق موقتاً قفل است. ${minutes} دقیقه دیگر تلاش کنید.`,
    };
  }

  if (!user.isActive) {
    await logActivity({
      userId: user.id,
      action: "login_failed",
      entity: "user",
      entityId: user.id,
      summary: `ورود حساب غیرفعال ${user.email}`,
    });
    return { status: "error", message: "حساب کاربری شما غیرفعال شده است. با مدیر سیستم تماس بگیرید." };
  }

  await createSession(user.id);
  // ورود موفق، صفحه را پاک می‌کند: شمارنده و قفل هر دو می‌روند
  await db
    .update(users)
    .set({ lastLoginAt: new Date(), failedLoginCount: 0, failedLoginAt: null, lockedUntil: null })
    .where(eq(users.id, user.id));
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

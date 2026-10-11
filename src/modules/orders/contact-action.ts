"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { newMessageMessage, notifyStaff } from "@/lib/notify";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { contactInputSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";
import { toFaDigits } from "@/lib/utils";

/**
 * مقادیری که کاربر فرستاده بود، تا فرم پس از خطا خالی برنگردد.
 *
 * React ۱۹ فرمِ کنترل‌نشده را بعد از اجرای action خودش ریست می‌کند. نتیجه‌اش
 * این بود که یک ایمیلِ غلط، کل فرم را پاک می‌کرد — نام، تلفن، موضوع و متنی که
 * کاربر وقت گذاشته و نوشته بود. کسی که پیام مفصل نوشته و دوباره از صفر
 * می‌بیندش، معمولاً دوباره نمی‌نویسد.
 *
 * فقط در حالت خطا برمی‌گردد؛ پس از موفقیت فرم باید واقعاً خالی شود.
 */
export type ContactValues = {
  name?: string;
  phone?: string;
  email?: string;
  subject?: string;
  message?: string;
};

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
  values?: ContactValues;
};

/** honeypot عمداً برنمی‌گردد — پرشدنش نشانهٔ ربات است، نه ورودی کاربر */
function echo(formData: FormData): ContactValues {
  const text = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : undefined;
  };
  return {
    name: text("name"),
    phone: text("phone"),
    email: text("email"),
    subject: text("subject"),
    message: text("message"),
  };
}

export async function sendContactMessage(
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  /*
    سقف تلاش، پیش از اعتبارسنجی: جلوی کوبیدن مداوم را می‌گیرد ولی آن‌قدر
    سخاوتمند است که خطای تایپی کسی را بیرون نیندازد.
  */
  const attempt = rateLimit(`contact:attempt:${ip}`, RATE_LIMITS.contactAttempt);
  if (!attempt.success) {
    return {
      status: "error",
      message: `تعداد درخواست‌های شما زیاد است. لطفاً ${toFaDigits(Math.ceil(attempt.retryAfterSeconds / 60))} دقیقه دیگر تلاش کنید.`,
      values: echo(formData),
    };
  }

  const parsed = contactInputSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email") ?? undefined,
    subject: formData.get("subject") ?? undefined,
    message: formData.get("message"),
    website: formData.get("website") ?? undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "لطفاً خطاهای فرم را برطرف کنید.",
      errors: toFieldErrors(parsed.error),
      values: echo(formData),
    };
  }

  // honeypot
  if (parsed.data.website) {
    return { status: "success", message: "پیام شما ثبت شد." };
  }

  /*
    سقف واقعیِ پیام، اینجا و نه بالاتر: فقط پیامی شمرده می‌شود که از
    اعتبارسنجی رد شده و قرار است ثبت شود.
  */
  const sent = rateLimit(`contact:sent:${ip}`, RATE_LIMITS.contact);
  if (!sent.success) {
    return {
      status: "error",
      message: `تعداد پیام‌های ارسالی زیاد است. لطفاً ${toFaDigits(Math.ceil(sent.retryAfterSeconds / 60))} دقیقه دیگر تلاش کنید.`,
      values: echo(formData),
    };
  }

  try {
    await db.insert(contactMessages).values({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email ?? null,
      subject: parsed.data.subject ?? null,
      message: parsed.data.message,
      ip,
    });

    // همان قاعدهٔ ثبت سفارش: پس از پاسخ، و بدون اینکه شکستش به کاربر برسد
    after(() =>
      notifyStaff(newMessageMessage({ name: parsed.data.name, phone: parsed.data.phone })),
    );

    return {
      status: "success",
      message: "پیام شما ثبت شد. همکاران ما در اولین فرصت کاری پاسخ می‌دهند.",
    };
  } catch (error) {
    console.error("[contact]", error);
    return {
      status: "error",
      message: "ارسال پیام ناموفق بود. لطفاً تلفنی تماس بگیرید.",
      values: echo(formData),
    };
  }
}

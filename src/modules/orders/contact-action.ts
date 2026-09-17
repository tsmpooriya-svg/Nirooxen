"use server";

import { headers } from "next/headers";
import { after } from "next/server";

import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { newMessageMessage, notifyStaff } from "@/lib/notify";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { contactInputSchema, toFieldErrors, type FieldErrors } from "@/lib/validation";

export type ContactActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: FieldErrors;
};

export async function sendContactMessage(
  _prev: ContactActionState,
  formData: FormData,
): Promise<ContactActionState> {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  if (!rateLimit(`contact:${ip}`, RATE_LIMITS.contact).success) {
    return { status: "error", message: "تعداد پیام‌های ارسالی زیاد است. کمی بعد تلاش کنید." };
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
    };
  }

  // honeypot
  if (parsed.data.website) {
    return { status: "success", message: "پیام شما ثبت شد." };
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
    return { status: "error", message: "ارسال پیام ناموفق بود. لطفاً تلفنی تماس بگیرید." };
  }
}

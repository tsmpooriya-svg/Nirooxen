import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
import { BODY_LIMITS, BodyTooLargeError, readTextWithLimit } from "@/lib/http/body-limit";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";
import { subscribeSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const headerList = await headers();
  const ip = getClientIp(headerList) ?? "unknown";

  if (!rateLimit(`subscribe:${ip}`, RATE_LIMITS.subscribe).success) {
    return NextResponse.json(
      { ok: false, message: "تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید." },
      { status: 429 },
    );
  }

  // بدنه با سقف خوانده می‌شود؛ `request.json()` هر حجمی را تا آخر در حافظه می‌ریزد
  let body: unknown = null;
  try {
    const text = await readTextWithLimit(request, BODY_LIMITS.subscribe);
    body = text ? JSON.parse(text) : null;
  } catch (error) {
    if (error instanceof BodyTooLargeError) {
      return NextResponse.json({ ok: false, message: "حجم درخواست بیش از حد مجاز است." }, { status: 413 });
    }
    body = null;
  }

  const parsed = subscribeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "ایمیل معتبر نیست." }, { status: 400 });
  }

  try {
    await db
      .insert(subscribers)
      .values({ email: parsed.data.email.toLowerCase() })
      .onConflictDoNothing({ target: subscribers.email });

    return NextResponse.json({ ok: true, message: "ایمیل شما در فهرست خبرنامه ثبت شد." });
  } catch (error) {
    console.error("[subscribe]", error);
    return NextResponse.json({ ok: false, message: "خطایی رخ داد." }, { status: 500 });
  }
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { getClientIp } from "@/lib/auth";
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

  const body = await request.json().catch(() => null);
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

import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getClientIp } from "@/lib/auth";
import { BODY_LIMITS, BodyTooLargeError, readTextWithLimit } from "@/lib/http/body-limit";
import { recordView } from "@/lib/page-views";
import { RATE_LIMITS, rateLimit } from "@/lib/rate-limit";

/**
 * ثبت بازدید یک صفحه.
 *
 * از سمت مرورگر صدا زده می‌شود، نه از میان‌افزار. دلیلش این است که بازدید را
 * باید کسی بشمارد که واقعاً صفحه را دیده: میان‌افزار هر درخواستی را می‌شمارد،
 * از جمله prefetch و خزنده‌ای که هرگز چیزی رندر نمی‌کند.
 *
 * پاسخ همیشه ۲۰۴ است، حتی وقتی چیزی ثبت نشده. این عمدی است — مرورگر کاری با
 * جواب ندارد، و پاسخِ متفاوت برای «ثبت شد» و «نشد» به یک اسکریپت می‌گفت کدام
 * مسیر شمرده می‌شود و کدام نه.
 */
export async function POST(request: Request) {
  const headerList = await headers();
  const ip = getClientIp(headerList);

  if (!rateLimit(`view:${ip ?? "unknown"}`, RATE_LIMITS.view).success) {
    return new NextResponse(null, { status: 204 });
  }

  let path: unknown = null;
  let referrer: unknown = null;
  try {
    const text = await readTextWithLimit(request, BODY_LIMITS.view);
    const body = text ? (JSON.parse(text) as { path?: unknown; referrer?: unknown }) : null;
    path = body?.path;
    referrer = body?.referrer;
  } catch (error) {
    if (error instanceof BodyTooLargeError) return new NextResponse(null, { status: 204 });
  }

  if (typeof path === "string") {
    await recordView({
      path,
      referrer: typeof referrer === "string" && referrer ? referrer : null,
      ip,
      userAgent: headerList.get("user-agent"),
      selfHost: headerList.get("host"),
    });
  }

  return new NextResponse(null, { status: 204 });
}

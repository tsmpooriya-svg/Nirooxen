import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";

/**
 * بررسی سلامت برای مانیتورینگ و health check سرویس‌دهنده.
 *
 * عمداً کمینه است: بدون احراز هویت، فقط خواندنی، و بدون هیچ داده‌ای دربارهٔ
 * پیکربندی یا کسب‌وکار. تنها دو چیز را از هم جدا می‌کند — «برنامه بالا است» و
 * «اتصال پایگاه داده سالم است» — چون در عمل همین دو حالت‌اند که رفتار متفاوتی
 * از load balancer می‌طلبند.
 *
 * پرس‌وجو `select 1` است تا هزینه‌اش ثابت بماند؛ شمارش رکورد یا خواندن جدول،
 * این مسیر را به یک نقطهٔ فشار تبدیل می‌کرد.
 */

// نباید در build پیش‌رندر یا کش شود؛ وگرنه همیشه وضعیت لحظهٔ build را می‌گوید
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function GET(): Promise<Response> {
  let database: "ok" | "error" = "ok";

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    // جزئیات فقط در لاگ سرور می‌ماند؛ پاسخ هیچ‌وقت آن را نشان نمی‌دهد
    console.error("[health] بررسی اتصال پایگاه داده ناموفق بود:", error);
    database = "error";
  }

  const healthy = database === "ok";

  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", database },
    { status: healthy ? 200 : 503, headers: NO_STORE },
  );
}

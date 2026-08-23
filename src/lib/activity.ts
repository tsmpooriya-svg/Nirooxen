/**
 * ثبت لاگ فعالیت. هر تغییر معنادار در پنل باید از اینجا عبور کند تا صفحه
 * «لاگ‌ها» تصویر کاملی از تاریخچه سیستم داشته باشد.
 */
import "server-only";

import { headers } from "next/headers";

import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { getClientIp } from "@/lib/auth";

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "status_change"
  | "login"
  | "login_failed"
  | "logout"
  | "export"
  | "assign";

export async function logActivity(input: {
  userId?: string | null;
  action: ActivityAction;
  entity: string;
  entityId?: string | null;
  summary: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const headerList = await headers();
    await db.insert(activityLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      summary: input.summary,
      meta: input.meta ?? null,
      ip: getClientIp(headerList),
    });
  } catch (error) {
    // ثبت لاگ هرگز نباید عملیات اصلی را بشکند
    console.error("[activity] ثبت لاگ ناموفق بود:", error);
  }
}

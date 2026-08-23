"use client";

import * as React from "react";

import type { SiteSettings } from "@/modules/settings/queries";

/**
 * تنظیمات سایت برای کامپوننت‌های کلاینت.
 *
 * سرور تنظیمات را یک‌بار می‌خواند و از طریق layout پایین می‌فرستد؛ این
 * provider همان مقدار را در اختیار هر کامپوننت کلاینتی می‌گذارد که به آن
 * نیاز دارد، بدون prop drilling در ده‌ها نقطه فراخوانی (مثل کارت محصول که
 * در صفحه اصلی، لیست محصولات، صفحه راهکار و صفحه محصول رندر می‌شود).
 */
const SettingsContext = React.createContext<SiteSettings | null>(null);

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: React.ReactNode;
}) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>;
}

/**
 * تنظیمات سایت.
 *
 * اگر کامپوننت خارج از provider رندر شود `null` برمی‌گردد؛ فراخوان باید
 * حالت پیش‌فرض امنی داشته باشد تا هیچ صفحه‌ای به‌خاطر نبود context نشکند.
 */
export function useSiteSettings(): SiteSettings | null {
  return React.useContext(SettingsContext);
}

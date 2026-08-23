import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "پنل مدیریت", template: "%s | پنل مدیریت" },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * لایه ریشه پنل — عمداً خالی از UI است.
 * محافظت و پوسته پنل در (panel)/layout.tsx انجام می‌شود تا صفحه ورود
 * خودش نیاز به احراز هویت نداشته باشد.
 */
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

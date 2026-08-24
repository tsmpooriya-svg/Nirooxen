import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logomark } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "ورود به پنل مدیریت",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/admin");

  return (
    <div className="blueprint grain relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-12">
      <div
        className="anim-drift pointer-events-none absolute -top-40 start-1/4 -z-10 size-[32rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, var(--glow-brand), transparent 70%)" }}
        aria-hidden
      />

      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logomark className="mb-5 size-14 text-[var(--brand)]" />
          <h1 className="font-display text-xl font-extrabold">پنل مدیریت {siteConfig.name}</h1>
          <p className="mt-2 font-mono text-micro tracking-[0.22em] text-[var(--fg-subtle)]">
            {siteConfig.latinName} · ADMIN CONSOLE
          </p>
        </div>

        <div className="edge-lit rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-7 shadow-[var(--shadow-xl)]">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-micro leading-6 text-[var(--fg-subtle)]">
          این بخش فقط برای کارکنان مجاز است. تمام ورودها ثبت و نگهداری می‌شود.
        </p>
      </div>
    </div>
  );
}

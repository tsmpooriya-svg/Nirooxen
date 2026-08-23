"use client";

import * as React from "react";

import { useToast } from "@/components/ui/toast";

export function NewsletterForm() {
  const { toast } = useToast();
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      toast({
        title: data.ok ? "ثبت شد" : "ثبت نشد",
        description: data.message,
        tone: data.ok ? "success" : "error",
      });
      if (data.ok) setEmail("");
    } catch {
      toast({ title: "خطای شبکه", description: "لطفاً دوباره تلاش کنید.", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full gap-2 sm:w-auto">
      <label htmlFor="newsletter-email" className="sr-only">
        نشانی ایمیل
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="h-12 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-inset)] px-4 text-sm outline-none transition-all duration-200 placeholder:text-[var(--fg-subtle)] focus:border-[var(--brand)] focus:shadow-[0_0_0_3px_var(--brand-soft)] sm:w-72"
      />
      <button
        type="submit"
        disabled={pending}
        className="h-12 shrink-0 rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)] disabled:opacity-50"
      >
        {pending ? "…" : "عضویت"}
      </button>
    </form>
  );
}

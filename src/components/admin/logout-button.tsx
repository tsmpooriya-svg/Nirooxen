"use client";

import { useTransition } from "react";

import { logout } from "@/modules/auth/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void logout())}
      className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-[0.8125rem] text-[var(--fg-muted)] transition-colors hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:opacity-50"
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
        <path d="M8 17H4.5A1.5 1.5 0 0 1 3 15.5v-11A1.5 1.5 0 0 1 4.5 3H8M13 13.5 16.5 10 13 6.5M16 10H7.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {pending ? "در حال خروج…" : "خروج از حساب"}
    </button>
  );
}

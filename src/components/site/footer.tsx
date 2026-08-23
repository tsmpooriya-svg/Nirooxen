import Link from "next/link";

import { Logomark } from "@/components/ui/icons";
import { footerNav, siteConfig } from "@/config/site";
import { currentJalaliYear, toFaDigits } from "@/lib/utils";
import type { SiteSettings } from "@/modules/settings/queries";

import { NewsletterForm } from "./newsletter-form";

const socialPaths: Record<string, string> = {
  instagram:
    "M12 2.2c3.2 0 3.6 0 4.9.07 1.2.05 1.8.25 2.2.42.6.22 1 .48 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 3.2a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6Zm6.9-11.2a1.55 1.55 0 1 1-3.1 0 1.55 1.55 0 0 1 3.1 0Z",
  telegram:
    "M21.9 4.3 18.6 20c-.25 1.1-.9 1.37-1.83.85l-5.05-3.72-2.44 2.35c-.27.27-.5.5-1.02.5l.36-5.15 9.37-8.47c.4-.36-.09-.56-.63-.2L6.14 13.4l-4.98-1.56c-1.08-.34-1.1-1.08.23-1.6l19.47-7.5c.9-.33 1.69.2 1.4 1.56Z",
  whatsapp:
    "M17.5 14.4c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35ZM12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.2 21.8l5.15-1.35A9.7 9.7 0 1 0 12 2.2Zm0 17.75a8.05 8.05 0 0 1-4.1-1.12l-.3-.18-3.05.8.81-2.98-.19-.31A8.05 8.05 0 1 1 12 19.95Z",
  linkedin:
    "M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4v11H3v-11Zm7 0h3.8v1.5h.06c.53-.95 1.83-1.95 3.76-1.95 4.02 0 4.76 2.5 4.76 5.76v5.69h-4v-5.05c0-1.2-.02-2.75-1.7-2.75-1.7 0-1.96 1.31-1.96 2.66v5.14h-4v-11Z",
};

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  const year = currentJalaliYear();

  return (
    <footer className="blueprint relative mt-24 border-t border-[var(--border-subtle)] bg-[var(--bg-elev-1)]">
      {/* نوار خبرنامه */}
      <div className="border-b border-[var(--border-hairline)]">
        <div className="shell grid gap-6 py-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-xl font-bold sm:text-2xl">
              از فهرست قیمت و محصولات جدید باخبر شوید
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--fg-muted)]">
              ماهی یک ایمیل، شامل به‌روزرسانی فهرست قیمت، محصولات تازه‌وارد و نکات فنی نگهداری تجهیزات.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </div>

      <div className="shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        {/* ستون معرفی */}
        <div>
          <Link href="/" className="flex items-center gap-2.5">
            <Logomark className="size-10 text-[var(--brand)]" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-lg font-extrabold">{settings.name}</span>
              <span className="mt-1 font-mono text-[0.5625rem] tracking-[0.22em] text-[var(--fg-subtle)]">
                {siteConfig.latinName}
              </span>
            </span>
          </Link>

          <p className="mt-5 max-w-sm text-sm leading-7 text-[var(--fg-muted)]">
            {settings.description}
          </p>

          <ul className="mt-6 space-y-3 text-sm">
            <li className="flex gap-3 text-[var(--fg-muted)]">
              <svg viewBox="0 0 20 20" className="mt-1 size-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2.5c3 3.3 5 6 5 8.2a5 5 0 0 1-10 0c0-2.2 2-4.9 5-8.2Z" />
              </svg>
              <span className="leading-7">{settings.contact.address}</span>
            </li>
            <li className="flex gap-3">
              <svg viewBox="0 0 20 20" className="mt-1 size-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3.5 3.5h3l1.2 3.6-2 1.2a10 10 0 0 0 4.5 4.5l1.2-2 3.6 1.2v3a1.2 1.2 0 0 1-1.3 1.2A13.7 13.7 0 0 1 2.3 4.8a1.2 1.2 0 0 1 1.2-1.3Z" />
              </svg>
              <span className="flex flex-col gap-1">
                {settings.contact.phones.map((phone, i) => (
                  <a
                    key={phone}
                    href={`tel:${settings.contact.phonesRaw[i]}`}
                    className="num text-[var(--fg-secondary)] transition-colors hover:text-[var(--brand)]"
                  >
                    {phone}
                  </a>
                ))}
              </span>
            </li>
            <li className="flex gap-3">
              <svg viewBox="0 0 20 20" className="mt-1 size-4 shrink-0 text-[var(--brand)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
                <path d="m3 6 7 4.5L17 6" />
              </svg>
              <a
                href={`mailto:${settings.contact.email}`}
                className="text-[var(--fg-secondary)] transition-colors hover:text-[var(--brand)]"
              >
                {settings.contact.email}
              </a>
            </li>
          </ul>

          <div className="mt-6 flex gap-2">
            {siteConfig.social.map((item) => (
              <a
                key={item.icon}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="grid size-10 place-items-center rounded-md border border-[var(--border-subtle)] text-[var(--fg-muted)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--border-brand)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand)]"
              >
                <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden>
                  <path d={socialPaths[item.icon] ?? ""} />
                </svg>
              </a>
            ))}
          </div>
        </div>

        {/* ستون‌های لینک */}
        {footerNav.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="mb-4 text-sm font-semibold text-[var(--fg-primary)]">{column.title}</h3>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex items-center gap-1.5 text-[0.8125rem] text-[var(--fg-muted)] transition-colors hover:text-[var(--brand)]"
                  >
                    <span className="h-px w-0 bg-[var(--brand)] transition-all duration-300 group-hover:w-3" aria-hidden />
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-[var(--border-hairline)]">
        <div className="shell flex flex-col items-center justify-between gap-3 py-5 text-xs text-[var(--fg-subtle)] sm:flex-row">
          <p>
            © {toFaDigits(year)} — تمام حقوق برای {siteConfig.legalName} محفوظ است.
          </p>
          <p className="font-mono text-[0.6875rem] tracking-wider">
            {siteConfig.latinName} · ENGINEERED WATER SYSTEMS
          </p>
        </div>
      </div>
    </footer>
  );
}

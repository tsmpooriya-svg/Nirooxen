import type { Metadata } from "next";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { ContactForm } from "@/components/site/contact-form";
import { siteConfig } from "@/config/site";
import { getSiteSettings } from "@/modules/settings/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "تماس با ما",
  description: `راه‌های ارتباط با ${siteConfig.legalName}: تلفن، ایمیل، آدرس دفتر مرکزی و فرم درخواست مشاوره فنی.`,
  path: "/contact",
});

export default async function ContactPage() {
  // اطلاعات تماس از تنظیمات مدیر می‌آید و روی پیش‌فرض config می‌نشیند
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        title="تماس با ما"
        description="برای مشاوره فنی، استعلام قیمت یا درخواست بازدید، از هر کدام از راه‌های زیر با ما در ارتباط باشید."
        crumbs={[{ name: "تماس با ما", href: "/contact" }]}
      />

      <div className="shell py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          {/* اطلاعات تماس */}
          <Reveal>
            <div className="space-y-4">
              <ContactCard
                title="تلفن دفتر مرکزی"
                icon={
                  <path d="M3.5 3.5h3l1.2 3.6-2 1.2a10 10 0 0 0 4.5 4.5l1.2-2 3.6 1.2v3a1.2 1.2 0 0 1-1.3 1.2A13.7 13.7 0 0 1 2.3 4.8a1.2 1.2 0 0 1 1.2-1.3Z" />
                }
              >
                <ul className="space-y-1.5">
                  {settings.contact.phones.map((phone, i) => (
                    <li key={phone}>
                      <a
                        href={`tel:${settings.contact.phonesRaw[i]}`}
                        className="num text-[0.9375rem] font-medium text-[var(--fg-primary)] transition-colors hover:text-[var(--brand)]"
                      >
                        {phone}
                      </a>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-6 text-[var(--fg-subtle)]">
                  {siteConfig.contact.workingHours}
                </p>
              </ContactCard>

              <ContactCard
                title="موبایل و واتس‌اپ"
                icon={<rect x="6" y="2.5" width="8" height="15" rx="2" />}
              >
                <a
                  href={`tel:${settings.contact.mobileRaw}`}
                  className="num text-[0.9375rem] font-medium text-[var(--fg-primary)] transition-colors hover:text-[var(--brand)]"
                >
                  {settings.contact.mobile}
                </a>
                <p className="mt-3 text-xs leading-6 text-[var(--fg-subtle)]">
                  خارج از ساعت اداری، پیام واتس‌اپ سریع‌تر پاسخ داده می‌شود.
                </p>
              </ContactCard>

              <ContactCard
                title="ایمیل"
                icon={
                  <>
                    <rect x="2.5" y="4.5" width="15" height="11" rx="2" />
                    <path d="m3 6 7 4.5L17 6" />
                  </>
                }
              >
                <ul className="space-y-1.5 text-[0.875rem]">
                  <li>
                    <a
                      href={`mailto:${settings.contact.email}`}
                      className="text-[var(--fg-primary)] transition-colors hover:text-[var(--brand)]"
                      dir="ltr"
                    >
                      {settings.contact.email}
                    </a>
                    <span className="ms-2 text-xs text-[var(--fg-subtle)]">— امور عمومی</span>
                  </li>
                  <li>
                    <a
                      href={`mailto:${siteConfig.contact.salesEmail}`}
                      className="text-[var(--fg-primary)] transition-colors hover:text-[var(--brand)]"
                      dir="ltr"
                    >
                      {siteConfig.contact.salesEmail}
                    </a>
                    <span className="ms-2 text-xs text-[var(--fg-subtle)]">— فروش و استعلام</span>
                  </li>
                </ul>
              </ContactCard>

              <ContactCard
                title="دفتر مرکزی"
                icon={<path d="M10 2.5c3 3.3 5 6 5 8.2a5 5 0 0 1-10 0c0-2.2 2-4.9 5-8.2Z" />}
              >
                <p className="text-[0.875rem] leading-8 text-[var(--fg-primary)]">
                  {settings.contact.address}
                </p>
                <p className="mt-2 text-xs text-[var(--fg-subtle)]">
                  کد پستی: <span className="num">{siteConfig.contact.postalCode}</span>
                </p>
              </ContactCard>

              {/* نقشه — جانشین سبک بلوپرینت تا نقشه واقعی جایگزین شود */}
              <div className="blueprint blueprint-dense relative flex h-48 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)]">
                <div className="text-center">
                  <p className="font-mono text-micro tracking-[0.2em] text-[var(--fg-subtle)]">
                    {siteConfig.contact.geo.lat.toFixed(4)}° N · {siteConfig.contact.geo.lng.toFixed(4)}° E
                  </p>
                  <a
                    href={siteConfig.contact.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-md border border-[var(--border-brand)] bg-[var(--brand-soft)] px-4 text-xs font-medium text-[var(--brand)] transition-colors hover:bg-[var(--brand-soft-hover)]"
                  >
                    مشاهده روی نقشه
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                      <path d="M6 3h7v7M13 3 6.5 9.5M11 10.5V13H3V5h2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </Reveal>

          {/* فرم */}
          <Reveal delay={120}>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 sm:p-8">
              <h2 className="font-display text-lg font-bold">ارسال پیام</h2>
              <p className="mt-2 text-meta leading-7 text-[var(--fg-muted)]">
                فرم زیر را پر کنید؛ درخواست شما مستقیماً در پنل کارشناسان ثبت می‌شود و پیگیری خواهد شد.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </>
  );
}

function ContactCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5 transition-colors duration-300 hover:border-[var(--border-brand)]">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
        <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          {icon}
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="mb-2 text-meta font-semibold text-[var(--fg-secondary)]">{title}</h2>
        {children}
      </div>
    </div>
  );
}

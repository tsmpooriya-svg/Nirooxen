import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { Section, SectionHeading } from "@/components/site/section";
import { DomainIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { toFaDigits } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "خدمات فنی و مهندسی",
  description:
    "مشاوره و انتخاب تجهیزات، طراحی سیستم آبرسانی، نصب و راه‌اندازی، سرویس و نگهداری دوره‌ای و تأمین قطعات یدکی.",
  path: "/services",
});

const services = [
  {
    id: "consulting",
    icon: "gauge",
    title: "مشاوره و انتخاب تجهیزات",
    lead: "پیش از خرید، بدانید دقیقاً چه چیزی لازم دارید.",
    body: "کارشناسان ما بر اساس نقشه، ارتفاع ساختمان، تعداد واحد یا شرایط مزرعه، هد و دبی موردنیاز را محاسبه می‌کنند و نقطه کار پمپ را روی منحنی کارخانه بررسی می‌کنند. نتیجه، تجهیزی است که نه کوچک‌تر از نیاز است و نه بزرگ‌تر.",
    points: ["محاسبه هد و دبی", "بررسی نقطه کار روی منحنی", "مقایسه گزینه‌های هم‌رده", "برآورد مصرف انرژی"],
  },
  {
    id: "design",
    icon: "pipe",
    title: "طراحی سیستم آبرسانی",
    lead: "از ایده تا نقشه اجرایی.",
    body: "طراحی شبکه توزیع، انتخاب قطر لوله بر اساس سرعت مجاز سیال، جانمایی مخازن و تجهیزات کنترلی، و تهیه نقشه‌های اجرایی و لیست مصالح (BOM).",
    points: ["نقشه ایزومتریک و پلان", "محاسبه افت فشار", "لیست مصالح دقیق", "طراحی تابلو کنترل"],
  },
  {
    id: "installation",
    icon: "install",
    title: "نصب و راه‌اندازی",
    lead: "تحویل کالا پایان کار نیست.",
    body: "تیم فنی ما نصب مکانیکال و الکتریکال، هم‌محوری کوپلینگ، تنظیم فشار پرشر سوئیچ و پیش‌شارژ منبع، و تست عملکرد در بار واقعی را انجام می‌دهد. در پایان، آموزش بهره‌برداری به کاربر داده می‌شود.",
    points: ["نصب مکانیکال و برقی", "تنظیم فشار و پیش‌شارژ", "تست عملکرد در بار واقعی", "آموزش بهره‌بردار"],
  },
  {
    id: "maintenance",
    icon: "support",
    title: "سرویس و نگهداری دوره‌ای",
    lead: "خرابی پیش‌بینی‌شده، خرابی ارزان است.",
    body: "قرارداد سرویس دوره‌ای شامل بازدید فصلی، تعویض مکانیکال سیل و بلبرینگ در زمان مناسب، اندازه‌گیری جریان موتور و ثبت روند استهلاک است. برای مجموعه‌های حساس، سرویس اضطراری خارج از ساعت اداری هم ارائه می‌شود.",
    points: ["بازدید فصلی برنامه‌ریزی‌شده", "گزارش وضعیت تجهیزات", "تعویض پیشگیرانه قطعات", "سرویس اضطراری"],
  },
  {
    id: "parts",
    icon: "valve",
    title: "تأمین قطعات یدکی",
    lead: "حتی برای تجهیزاتی که از جای دیگر خریده‌اید.",
    body: "مکانیکال سیل، بلبرینگ، پروانه، کوپلینگ، دیافراگم منبع و برد کنترل — با شماره فنی دقیق و امکان تطبیق نمونه. اگر شماره فنی ندارید، عکس و مشخصات پلاک را بفرستید.",
    points: ["تطبیق با نمونه فیزیکی", "قطعات اصلی نمایندگی", "ارسال سریع به شهرستان", "مشاوره تعویض"],
  },
  {
    id: "supply",
    icon: "certificate",
    title: "تأمین کالای خاص",
    lead: "کالای نایاب را برایتان پیدا می‌کنیم.",
    body: "اگر تجهیز موردنیاز شما در کاتالوگ ما نیست، درخواست تأمین ثبت کنید. با شبکه تأمین‌کنندگان داخلی و واردکنندگان، گزینه معادل یا اصل را با قیمت و زمان تحویل مشخص به شما اعلام می‌کنیم.",
    points: ["جستجو در شبکه تأمین", "پیشنهاد کالای معادل", "اعلام زمان و قیمت شفاف", "پیگیری تا تحویل"],
  },
] as const;

export default function ServicesPage() {
  return (
    <>
      <PageHeader
        title="خدمات فنی و مهندسی"
        description="فروش تجهیزات تنها بخشی از کار ماست. آنچه یک پروژه را موفق می‌کند، انتخاب درست، اجرای درست و نگهداری درست است."
        crumbs={[{ name: "خدمات", href: "/services" }]}
      />

      <Section>
        <div className="shell space-y-6">
          {services.map((service, index) => (
            <Reveal key={service.id} delay={index * 60}>
              <article
                id={service.id}
                className="edge-lit grid gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 sm:p-8 lg:grid-cols-[auto_1fr_16rem] lg:items-start lg:gap-10"
              >
                <span className="grid size-14 shrink-0 place-items-center rounded-lg border border-[var(--border-brand)] bg-[var(--brand-soft)] text-[var(--brand)]">
                  <DomainIcon name={service.icon} className="size-7" />
                </span>

                <div className="min-w-0">
                  <span className="font-mono text-[0.625rem] tracking-[0.2em] text-[var(--fg-subtle)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2 className="mt-2 font-display text-xl font-bold">{service.title}</h2>
                  <p className="mt-1.5 text-sm font-medium text-[var(--brand)]">{service.lead}</p>
                  <p className="mt-4 text-[0.875rem] leading-8 text-[var(--fg-muted)]">{service.body}</p>
                </div>

                <ul className="space-y-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elev-2)] p-4">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-xs leading-6 text-[var(--fg-secondary)]">
                      <svg
                        viewBox="0 0 16 16"
                        className="mt-1 size-3.5 shrink-0 text-[var(--brand)]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden
                      >
                        <path d="m3 8.5 3 3 7-7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <SectionHeading
            eyebrow="پوشش خدمات"
            title="در سراسر کشور در دسترسیم"
            description="ارسال کالا به همه استان‌ها انجام می‌شود. خدمات نصب و سرویس حضوری در استان‌های مرکزی و با هماهنگی قبلی در سایر استان‌ها ارائه می‌شود."
            align="center"
          />
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-3">
            <Link
              href="/contact"
              className="inline-flex h-12 items-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
            >
              درخواست بازدید و مشاوره
            </Link>
            <a
              href={`tel:${siteConfig.contact.phonesRaw[0]}`}
              className="inline-flex h-12 items-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand)]"
            >
              <span className="num">{siteConfig.contact.phones[0]}</span>
            </a>
          </div>
          <p className="mt-6 text-center text-xs text-[var(--fg-subtle)]">
            ساعات پاسخ‌گویی: {siteConfig.contact.workingHours}
          </p>
        </div>
      </Section>
    </>
  );
}

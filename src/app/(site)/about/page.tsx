import type { Metadata } from "next";
import Link from "next/link";

import { Counter } from "@/components/motion/counter";
import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { Section, SectionHeading } from "@/components/site/section";
import { DomainIcon } from "@/components/ui/icons";
import { siteConfig } from "@/config/site";
import { pageMetadata } from "@/lib/seo";
import { toFaDigits } from "@/lib/utils";

export const metadata: Metadata = pageMetadata({
  title: "درباره ما",
  description: `${siteConfig.legalName} — تأمین‌کننده تخصصی تجهیزات صنعتی و آبرسانی با سابقه اجرای پروژه در سراسر کشور.`,
  path: "/about",
});

const values = [
  {
    icon: "gauge",
    title: "دقت مهندسی",
    body: "هر پیشنهاد فنی ما پشتوانه محاسباتی دارد. عدد را حدس نمی‌زنیم.",
  },
  {
    icon: "certificate",
    title: "شفافیت",
    body: "اگر کالایی برای کاربرد شما مناسب نیست، همان را می‌گوییم — حتی اگر گران‌تر بفروشیم.",
  },
  {
    icon: "support",
    title: "تعهد بلندمدت",
    body: "رابطه ما با مشتری از لحظه تحویل شروع می‌شود، نه اینکه تمام شود.",
  },
] as const;

const faqs = [
  {
    q: "چرا امکان پرداخت آنلاین ندارید؟",
    a: "چون خرید تجهیزات صنعتی با خرید یک کالای مصرفی فرق دارد. انتخاب اشتباه پمپ یا شیر، هزینه‌ای بسیار بیشتر از قیمت خود کالا به پروژه تحمیل می‌کند. ترجیح می‌دهیم پیش از هر فروش، یک گفت‌وگوی فنی کوتاه انجام شود. زیرساخت پرداخت آنلاین آماده است و در فازهای بعدی برای کالاهای استاندارد فعال خواهد شد.",
  },
  {
    q: "چرا قیمت بعضی محصولات نمایش داده نمی‌شود؟",
    a: "قیمت برخی تجهیزات به مشخصات دقیق (توان موتور، جنس قطعات آبی، نوع اتصال)، تعداد سفارش و نرخ روز ارز بستگی دارد. نمایش یک عدد ثابت برای این اقلام گمراه‌کننده است. با ثبت استعلام، قیمت دقیق و به‌روز را دریافت می‌کنید.",
  },
  {
    q: "پس از ثبت استعلام چقدر طول می‌کشد تماس بگیرید؟",
    a: "درخواست‌های ثبت‌شده در ساعات کاری معمولاً همان روز و حداکثر تا یک روز کاری بعد پاسخ داده می‌شوند. برای درخواست‌های فوری، تماس تلفنی سریع‌ترین راه است.",
  },
  {
    q: "آیا کالاها گارانتی دارند؟",
    a: "بله. همه کالاها با گارانتی رسمی نمایندگی عرضه می‌شوند و مدت گارانتی هر محصول در صفحه آن ذکر شده است. شماره سریال دستگاه در فاکتور ثبت می‌شود.",
  },
  {
    q: "برای شهرستان هم ارسال دارید؟",
    a: "بله، ارسال به تمام استان‌ها انجام می‌شود. هزینه و زمان ارسال بسته به وزن، حجم و مقصد در پیش‌فاکتور اعلام می‌شود.",
  },
  {
    q: "خدمات نصب را هم انجام می‌دهید؟",
    a: "بله. در استان‌های مرکزی به‌صورت مستقیم و در سایر استان‌ها با هماهنگی قبلی. جزئیات در صفحه خدمات آمده است.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title={`درباره ${siteConfig.name}`}
        description={
          siteConfig.foundedYear
            ? `${siteConfig.legalName} از سال ${toFaDigits(siteConfig.foundedYear)} در حوزه تأمین، فروش و نصب تجهیزات صنعتی و آبرسانی فعالیت می‌کند.`
            : `${siteConfig.legalName} در حوزه تأمین، فروش و نصب تجهیزات صنعتی و آبرسانی فعالیت می‌کند.`
        }
        crumbs={[{ name: "درباره ما", href: "/about" }]}
      />

      {/* روایت */}
      <Section>
        <div className="shell grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <Reveal>
            <div className="max-w-2xl space-y-5 text-sm leading-9 text-[var(--fg-secondary)]">
              <p>
                کار ما با یک انبار کوچک قطعات یدکی پمپ شروع شد. آن روزها بیشتر مشتری‌هایمان سراغ ما
                می‌آمدند چون جایی دیگر مکانیکال سیل مناسب پیدا نکرده بودند. همان تجربه، جهت‌گیری بعدی
                شرکت را مشخص کرد: <strong className="text-[var(--fg-primary)]">حل مسئله فنی، نه صرفاً فروش کالا.</strong>
              </p>
              <p>
                امروز کاتالوگ ما از پمپ‌های خانگی تا ایستگاه‌های پمپاژ صنعتی را پوشش می‌دهد، اما اصل
                کار تغییری نکرده است: پیش از هر پیشنهاد، شرایط پروژه را می‌فهمیم. ارتفاع، دبی، جنس
                سیال، شرایط برق و بودجه — این‌ها را می‌پرسیم چون بدون آن‌ها هر پیشنهادی حدس است.
              </p>
              <p>
                همکاران فنی ما پیش‌تر در ایستگاه‌های پمپاژ، موتورخانه‌ها و مزارع کار کرده‌اند. یعنی
                وقتی می‌گویند یک تجهیز در شرایط شما دوام نمی‌آورد، از روی کاتالوگ نمی‌گویند.
              </p>
            </div>

            {siteConfig.stats.length > 0 && (
              <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-[var(--border-hairline)] pt-8 sm:grid-cols-4">
                {siteConfig.stats.map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-2 text-meta leading-6 text-[var(--fg-muted)]">{stat.label}</dt>
                    <dd className="font-display text-[1.75rem] font-extrabold text-[var(--brand)]">
                      <Counter value={stat.value} suffix={stat.suffix} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </Reveal>

          <Reveal variant="scale" delay={140}>
            <div className="space-y-4">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="edge-lit flex gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-5"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[var(--brand-soft)] text-[var(--brand)]">
                    <DomainIcon name={value.icon} className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold">{value.title}</h3>
                    <p className="mt-1.5 text-meta leading-7 text-[var(--fg-muted)]">{value.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* پرسش‌های متداول */}
      <Section id="faq" blueprint className="border-t border-[var(--border-hairline)] bg-[var(--bg-elev-1)]">
        <div className="shell">
          <SectionHeading
            eyebrow="پرسش‌های متداول"
            title="سؤال‌هایی که زیاد می‌پرسند"
            align="center"
          />

          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((faq, index) => (
              <Reveal key={faq.q} delay={index * 50}>
                <details className="group rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] transition-colors duration-300 hover:border-[var(--border-brand)] open:border-[var(--border-brand)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-sm font-medium marker:content-none">
                    {faq.q}
                    <span className="grid size-7 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--brand)] transition-transform duration-400 [transition-timing-function:var(--ease-out-expo)] group-open:rotate-45">
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                        <path d="M8 3.5v9M3.5 8h9" strokeLinecap="round" />
                      </svg>
                    </span>
                  </summary>
                  <div className="border-t border-[var(--border-hairline)] px-5 py-4 text-sm leading-8 text-[var(--fg-muted)]">
                    {faq.a}
                  </div>
                </details>
              </Reveal>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-[var(--fg-muted)]">پاسخ سؤالتان را پیدا نکردید؟</p>
            <Link
              href="/contact"
              className="mt-4 inline-flex h-11 items-center rounded-md bg-[var(--brand)] px-6 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
            >
              با ما تماس بگیرید
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}

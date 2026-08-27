import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageHeader } from "@/components/site/breadcrumb";
import { Section } from "@/components/site/section";
import { pageMetadata } from "@/lib/seo";
import { getSiteSettings } from "@/modules/settings/queries";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "شرایط و قوانین",
  description:
    "شرایط استفاده از وب‌سایت، فرآیند استعلام و سفارش، قیمت‌گذاری، ارسال، گارانتی و حریم خصوصی.",
  path: "/terms",
});

/**
 * صفحه «شرایط و قوانین».
 *
 * ⚠️ این متن عمداً فقط چیزهایی را توضیح می‌دهد که همین حالا در سایت قابل
 * مشاهده و درست است: فرآیند استعلام‌محور، نبود پرداخت آنلاین، اینکه گارانتی
 * هر کالا در صفحه خودش نوشته می‌شود و هزینه ارسال در پیش‌فاکتور اعلام می‌گردد.
 *
 * هیچ ادعای حقوقی یا شرکتی ساختگی اینجا نوشته نشده — شماره ثبت، مرجع رسیدگی
 * به اختلاف، مهلت انصراف و نشانی حقوقی همگی به داده واقعی نیاز دارند و تا
 * زمان تأمین آن‌ها، در کادر هشدار بالای صفحه به‌صورت آشکار علامت خورده‌اند.
 * فهرست کامل در LAUNCH-CHECKLIST.md آمده است.
 */

type Clause = { title: string; body: string[] };

const clauses: Clause[] = [
  {
    title: "۱. دامنه این شرایط",
    body: [
      "این شرایط، استفاده شما از وب‌سایت نیروژن و ثبت درخواست استعلام یا سفارش از طریق آن را پوشش می‌دهد. با استفاده از سایت، این شرایط را می‌پذیرید.",
      "قرارداد فروش هر سفارش، سندی جداگانه است: پیش‌فاکتوری که پس از بررسی درخواست شما صادر و برایتان ارسال می‌شود. در صورت مغایرت، مفاد پیش‌فاکتور بر این صفحه مقدم است.",
    ],
  },
  {
    title: "۲. اطلاعات محصولات",
    body: [
      "مشخصات فنی درج‌شده برای هر کالا از کاتالوگ سازنده گرفته می‌شود. سازندگان ممکن است مشخصات را بدون اطلاع قبلی تغییر دهند؛ بنابراین پیش از سفارش، مشخصات نهایی در پیش‌فاکتور تأیید می‌شود.",
      "تصاویر محصولات جنبه معرفی دارند و ممکن است با نسخه دقیق سفارش‌شده تفاوت جزئی داشته باشند.",
      "مدت و شرایط گارانتی هر کالا، در صورت وجود، در همان صفحه محصول نوشته شده است.",
    ],
  },
  {
    title: "۳. قیمت و استعلام",
    body: [
      "بخشی از کالاها قیمت نمایشی دارند و بخشی دیگر «استعلامی» هستند. قیمت کالاهای استعلامی به مشخصات دقیق، تعداد سفارش و شرایط تأمین بستگی دارد و پس از بررسی کارشناس اعلام می‌شود.",
      "قیمت‌های نمایش‌داده‌شده در سایت جنبه اطلاع‌رسانی دارند و تعهد فروش ایجاد نمی‌کنند. قیمت قطعی، همان عددی است که در پیش‌فاکتور می‌آید و تا مهلت درج‌شده در همان پیش‌فاکتور معتبر است.",
      "در این سایت پرداخت آنلاین انجام نمی‌شود. هر سفارش پیش از نهایی‌شدن، از یک بررسی فنی عبور می‌کند.",
    ],
  },
  {
    title: "۴. ثبت سفارش",
    body: [
      "پس از ثبت درخواست، کارشناس فروش برای بررسی مشخصات و تأیید موجودی با شما تماس می‌گیرد. ثبت درخواست در سایت به‌تنهایی به معنای قطعی‌شدن سفارش نیست.",
      "در صورتی که کالای درخواستی برای کاربرد شما مناسب نباشد، گزینه جایگزین پیشنهاد می‌شود.",
    ],
  },
  {
    title: "۵. ارسال و تحویل",
    body: [
      "هزینه و زمان تقریبی ارسال، بسته به وزن، حجم و مقصد، در پیش‌فاکتور اعلام می‌شود.",
      "زمان‌های تأمین اعلام‌شده تخمینی هستند و به موجودی سازنده یا واردکننده بستگی دارند. هر تغییری در زمان تحویل، اطلاع داده می‌شود.",
      "مسئولیت بررسی سلامت ظاهری کالا هنگام تحویل بر عهده گیرنده است. آسیب حمل باید در همان زمان تحویل اعلام شود.",
    ],
  },
  {
    title: "۶. حریم خصوصی",
    body: [
      "اطلاعاتی که در فرم‌های استعلام، سفارش یا تماس وارد می‌کنید — نام، شماره تماس، ایمیل و مشخصات پروژه — فقط برای پاسخ‌گویی به همان درخواست و پیگیری سفارش استفاده می‌شود.",
      "این اطلاعات در اختیار اشخاص ثالث قرار نمی‌گیرد، مگر در حدی که برای انجام سفارش لازم باشد (برای نمونه، شرکت حمل برای تحویل مرسوله).",
      "برای حذف اطلاعات خود یا لغو اشتراک خبرنامه، از راه‌های تماس پایین همین صفحه اقدام کنید.",
    ],
  },
  {
    title: "۷. مالکیت محتوا",
    body: [
      "متن‌ها، عکس‌ها، نقشه‌ها و مقالات این سایت متعلق به نیروژن هستند، مگر آنکه منبع دیگری ذکر شده باشد. بازنشر آن‌ها با ذکر منبع بلامانع است.",
      "نام و نشان برندهای موجود در کاتالوگ، متعلق به صاحبان همان برندهاست و صرفاً برای معرفی کالا استفاده می‌شود.",
    ],
  },
  {
    title: "۸. تغییر این شرایط",
    body: [
      "این شرایط ممکن است به‌مرور به‌روزرسانی شود. نسخه معتبر، همان چیزی است که در زمان ثبت درخواست شما روی این صفحه منتشر بوده است.",
    ],
  },
];

export default async function TermsPage() {
  const settings = await getSiteSettings();

  return (
    <>
      <PageHeader
        title="شرایط و قوانین"
        description="خلاصه‌ای از نحوه کار سایت: از ثبت استعلام تا تحویل کالا، و اینکه با اطلاعات شما چه می‌کنیم."
        crumbs={[{ name: "شرایط و قوانین", href: "/terms" }]}
      />

      <Section>
        <div className="shell">
          <div className="mx-auto max-w-3xl">
            {/*
              کادر هشدار — عمداً دیده می‌شود.
              تا وقتی متن حقوقی واقعی و اطلاعات ثبتی شرکت تأمین نشده، انتشار
              این صفحه به‌عنوان سند حقوقی کامل درست نیست. این کادر جلوی
              انتشار ناخواسته را می‌گیرد و باید پس از تکمیل حذف شود.
            */}
            <Reveal>
              <div
                role="note"
                className="mb-10 rounded-lg border border-[color-mix(in_oklab,var(--warn)_40%,transparent)] bg-[var(--warn-chip)] p-5"
              >
                <p className="text-meta font-semibold text-[var(--warn-text)]">
                  این متن هنوز بازبینی حقوقی نشده است
                </p>
                <p className="mt-2 text-meta leading-8 text-[var(--fg-secondary)]">
                  آنچه در ادامه می‌خوانید، توضیح روشن روال فعلی کار ماست، نه سند حقوقی کامل.
                  اطلاعات ثبتی شرکت، مرجع رسیدگی به اختلاف و شرایط دقیق انصراف از خرید هنوز به
                  این صفحه اضافه نشده‌اند. برای هر پرسش حقوقی یا قراردادی، لطفاً مستقیم با ما
                  تماس بگیرید.
                </p>
              </div>
            </Reveal>

            <div className="stack-divider">
              {clauses.map((clause, index) => (
                <Reveal key={clause.title} delay={index * 40}>
                  <section className="py-7 first:pt-0">
                    <h2 className="font-display text-lg font-bold">{clause.title}</h2>
                    <div className="mt-3 space-y-3">
                      {clause.body.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-9 text-[var(--fg-muted)]">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </section>
                </Reveal>
              ))}
            </div>

            {/* راه‌های تماس — از تنظیمات مدیر می‌آید، نه hard-code */}
            <Reveal delay={120}>
              <div className="mt-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 sm:p-8">
                <h2 className="font-display text-lg font-bold">پرسشی درباره این شرایط دارید؟</h2>
                <p className="mt-3 text-meta leading-8 text-[var(--fg-muted)]">
                  اگر نکته‌ای از این صفحه برایتان روشن نیست یا می‌خواهید درباره شرایط یک سفارش
                  مشخص صحبت کنید، در ساعات کاری در دسترسیم.
                </p>
                <div className="mt-6 flex flex-col gap-3 xs:flex-row xs:flex-wrap xs:items-center">
                  <Link
                    href="/contact"
                    className="inline-flex h-12 items-center justify-center rounded-md bg-[var(--brand)] px-7 text-sm font-medium text-[var(--fg-on-brand)] transition-all duration-300 hover:bg-[var(--brand-hover)] hover:shadow-[var(--shadow-brand)]"
                  >
                    تماس با ما
                  </Link>
                  <a
                    href={`tel:${settings.contact.phonesRaw[0]}`}
                    className="inline-flex h-12 items-center justify-center rounded-md border border-[var(--border-default)] px-6 text-sm font-medium transition-all duration-300 hover:border-[var(--border-brand)] hover:text-[var(--brand-text)]"
                  >
                    <span className="num">{settings.contact.phones[0]}</span>
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>
    </>
  );
}

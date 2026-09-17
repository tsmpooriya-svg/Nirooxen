import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { absoluteUrl, stripHtml, truncate } from "@/lib/utils";

/**
 * متادیتای پایه.
 *
 * `settings` اختیاری است: اگر داده شود (از layout ریشه، خوانده‌شده از
 * پایگاه داده) نام سایت، شعار و توضیحات از تنظیمات مدیر می‌آید؛ اگر نه،
 * پیش‌فرض‌های config استفاده می‌شود. همان الگوی «پایگاه داده روی پیش‌فرض».
 */
export function buildBaseMetadata(settings?: {
  name: string;
  tagline: string;
  seo: { metaTitle: string; metaDescription: string };
}): Metadata {
  const name = settings?.name ?? siteConfig.name;
  const title = settings?.seo.metaTitle ?? `${siteConfig.name} | ${siteConfig.tagline}`;
  const description = settings?.seo.metaDescription ?? siteConfig.description;

  return {
    ...baseMetadata,
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    openGraph: { ...baseMetadata.openGraph, siteName: name, title, description },
    twitter: { ...baseMetadata.twitter, title, description },
  };
}

/** متادیتای پایه — مقادیر پیش‌فرض؛ `buildBaseMetadata` آن را با تنظیمات ترکیب می‌کند */
export const baseMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "پمپ آب",
    "الکتروپمپ صنعتی",
    "واتر پمپ",
    "مخزن تحت فشار",
    "اتصالات صنعتی",
    "شیرآلات صنعتی",
    "تجهیزات آبرسانی",
    "پمپ کشاورزی",
    "بوستر پمپ",
    "نصب و راه‌اندازی پمپ",
  ],
  authors: [{ name: siteConfig.legalName }],
  creator: siteConfig.legalName,
  publisher: siteConfig.legalName,
  formatDetection: { telephone: true, address: true, email: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

/** ساخت متادیتای صفحه با canonical و Open Graph درست */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
  type = "website",
  publishedTime,
}: {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article";
  publishedTime?: string;
}): Metadata {
  const desc = truncate(stripHtml(description ?? siteConfig.description), 300);
  const url = absoluteUrl(path, siteConfig.url);

  return {
    title,
    description: desc,
    alternates: { canonical: path },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type,
      url,
      title,
      description: desc,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: image ? [{ url: image, alt: title }] : undefined,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: image ? [image] : undefined,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*  داده ساختاریافته (JSON-LD)                                                 */
/* -------------------------------------------------------------------------- */

/** داده ساختاریافته سازمان — با تنظیمات مدیر، وگرنه پیش‌فرض config */
export function organizationJsonLd(settings?: {
  name: string;
  description: string;
  contact: { address: string; phonesRaw: readonly string[] };
}) {
  const address = settings?.contact.address ?? siteConfig.contact.address;
  const phonesRaw = settings?.contact.phonesRaw ?? siteConfig.contact.phonesRaw;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.legalName,
    alternateName: settings?.name ?? siteConfig.name,
    url: siteConfig.url,
    description: settings?.description ?? siteConfig.description,
    // فقط وقتی سال تأسیس واقعی ثبت شده باشد در داده ساختاریافته منتشر می‌شود
    ...(siteConfig.foundedYear ? { foundingDate: String(siteConfig.foundedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: address,
      addressCountry: "IR",
    },
    contactPoint: phonesRaw.map((phone) => ({
      "@type": "ContactPoint",
      telephone: phone,
      contactType: "sales",
      areaServed: "IR",
      availableLanguage: ["fa"],
    })),
    sameAs: siteConfig.social.map((s) => s.href),
  };
}

export function websiteJsonLd(settings?: { name: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: settings?.name ?? siteConfig.name,
    inLanguage: "fa-IR",
    publisher: { "@id": `${siteConfig.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.href, siteConfig.url),
    })),
  };
}

export function productJsonLd(product: {
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  brandName?: string | null;
  image?: string | null;
  price?: number | null;
  priceMode: string;
  stockStatus: string;
}) {
  const availability =
    product.stockStatus === "IN_STOCK" || product.stockStatus === "LOW_STOCK"
      ? "https://schema.org/InStock"
      : product.stockStatus === "ORDER_ONLY"
        ? "https://schema.org/PreOrder"
        : "https://schema.org/OutOfStock";

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: truncate(stripHtml(product.description ?? ""), 400) || undefined,
    sku: product.sku ?? undefined,
    brand: product.brandName ? { "@type": "Brand", name: product.brandName } : undefined,
    image: product.image ? absoluteUrl(product.image, siteConfig.url) : undefined,
    url: absoluteUrl(`/products/${product.slug}`, siteConfig.url),
    /*
      Offer فقط وقتی می‌آید که قیمتی برای گفتن باشد.

      گوگل Offer بدون price یا priceSpecification را نامعتبر می‌داند و کل
      داده‌ی ساختاریافتهٔ محصول را کنار می‌گذارد — یعنی برای اکثر کاتالوگ، که
      قیمتش استعلامی است، کارت محصولی در نتایج ساخته نمی‌شد. نبودنِ offers
      خطا نیست؛ Product بدون آن معتبر است و موجودی هنوز گفته می‌شود.
    */
    ...(product.priceMode === "PUBLIC" && product.price
      ? {
          offers: {
            "@type": "Offer",
            url: absoluteUrl(`/products/${product.slug}`, siteConfig.url),
            priceCurrency: "IRR",
            // قیمت به ریال گزارش می‌شود (۱ تومان = ۱۰ ریال)
            price: product.price * 10,
            availability,
            seller: { "@id": `${siteConfig.url}/#organization` },
          },
        }
      : {}),
    /*
      برای محصول استعلامی، موجودی روی خود Product می‌نشیند. قبلاً availability
      دو بار در Offer ست می‌شد و مقدار داخل spread بی‌اثر بود.
    */
    ...(product.priceMode === "PUBLIC" && product.price ? {} : { availability }),
  };
}

export function articleJsonLd(post: {
  title: string;
  slug: string;
  excerpt?: string | null;
  coverUrl?: string | null;
  publishedAt?: Date | string | null;
  authorName?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.coverUrl ? absoluteUrl(post.coverUrl, siteConfig.url) : undefined,
    datePublished: post.publishedAt ? new Date(post.publishedAt).toISOString() : undefined,
    author: { "@type": "Organization", name: post.authorName ?? siteConfig.legalName },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntityOfPage: absoluteUrl(`/news/${post.slug}`, siteConfig.url),
    inLanguage: "fa-IR",
  };
}

/** کامپوننت درج JSON-LD */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
       
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

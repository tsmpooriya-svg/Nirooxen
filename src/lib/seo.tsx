import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { absoluteUrl, stripHtml, truncate } from "@/lib/utils";

/** متادیتای پایه که در layout ریشه اعمال می‌شود */
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

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.legalName,
    alternateName: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    // فقط وقتی سال تأسیس واقعی ثبت شده باشد در داده ساختاریافته منتشر می‌شود
    ...(siteConfig.foundedYear ? { foundingDate: String(siteConfig.foundedYear) } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.contact.address,
      addressCountry: "IR",
    },
    contactPoint: siteConfig.contact.phonesRaw.map((phone) => ({
      "@type": "ContactPoint",
      telephone: phone,
      contactType: "sales",
      areaServed: "IR",
      availableLanguage: ["fa"],
    })),
    sameAs: siteConfig.social.map((s) => s.href),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
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
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/products/${product.slug}`, siteConfig.url),
      priceCurrency: "IRR",
      // قیمت به ریال گزارش می‌شود (۱ تومان = ۱۰ ریال)
      ...(product.priceMode === "PUBLIC" && product.price
        ? { price: product.price * 10 }
        : { availability: "https://schema.org/PreOrder" }),
      availability,
      seller: { "@id": `${siteConfig.url}/#organization` },
    },
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

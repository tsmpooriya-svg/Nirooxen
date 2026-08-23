import type { Metadata } from "next";

import { PageHeader } from "@/components/site/breadcrumb";
import { pageMetadata } from "@/lib/seo";

import { QuoteClient } from "./quote-client";

export const metadata: Metadata = pageMetadata({
  title: "ثبت درخواست استعلام قیمت",
  description: "اقلام انتخاب‌شده خود را بررسی و درخواست استعلام قیمت را ثبت کنید.",
  path: "/quote",
  noIndex: true,
});

export default function QuotePage() {
  return (
    <>
      <PageHeader
        title="درخواست استعلام قیمت"
        description="اقلام سبد خود را بررسی کنید، اطلاعات تماس را وارد کنید و درخواست را ثبت کنید. پرداختی در این مرحله انجام نمی‌شود."
        crumbs={[{ name: "استعلام قیمت", href: "/quote" }]}
      />
      <div className="shell py-10">
        <QuoteClient />
      </div>
    </>
  );
}

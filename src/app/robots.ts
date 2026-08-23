import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // پنل مدیریت، API و صفحات تراکنشی نباید ایندکس شوند
        disallow: ["/admin", "/admin/*", "/api/*", "/quote"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

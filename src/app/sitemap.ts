import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { solutions } from "@/config/solutions";
import { getAllProductSlugs, getBrands, getCategoryTree } from "@/modules/catalog/queries";
import { getAllPostSlugs, getProjects } from "@/modules/content/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/solutions`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/brands`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/projects`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/news`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [products, posts, brands, categories, projects] = await Promise.all([
    getAllProductSlugs(),
    getAllPostSlugs(),
    getBrands(),
    getCategoryTree(),
    getProjects(),
  ]);

  return [
    ...staticRoutes,
    ...solutions.map((solution) => ({
      url: encodeURI(`${base}/solutions/${solution.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...categories.flatMap((category) => [
      { url: encodeURI(`${base}/products?category=${category.slug}`), changeFrequency: "weekly" as const, priority: 0.8 },
      ...category.children.map((child) => ({
        url: encodeURI(`${base}/products?category=${child.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ]),
    ...products.map((product) => ({
      url: encodeURI(`${base}/products/${product.slug}`),
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...brands.map((brand) => ({
      url: encodeURI(`${base}/brands/${brand.slug}`),
      lastModified: brand.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...posts.map((post) => ({
      url: encodeURI(`${base}/news/${post.slug}`),
      lastModified: post.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...projects.map((project) => ({
      url: encodeURI(`${base}/projects#${project.slug}`),
      lastModified: project.updatedAt,
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];
}

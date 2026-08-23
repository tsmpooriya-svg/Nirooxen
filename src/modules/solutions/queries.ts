/**
 * =============================================================================
 *  ماژول راهکارها — لایه ترکیب داده
 * =============================================================================
 *  محتوای تحریریه راهکار از `@/config/solutions` می‌آید و داده کاتالوگ از
 *  پایگاه داده. این ماژول آن دو را به هم می‌دوزد تا صفحه‌ها فقط یک شیء
 *  آماده دریافت کنند.
 *
 *  هیچ جدول تازه‌ای لازم نیست: اتصال از طریق `categories.slug` و
 *  `products.tags` انجام می‌شود که هر دو از قبل در اسکیما وجود دارند.
 * =============================================================================
 */
import "server-only";

import { cache } from "react";

import { getSolution, solutions, type Solution } from "@/config/solutions";
import {
  getCategoriesBySlugs,
  getProductsForSolution,
  type CategoryNode,
  type ProductCardData,
} from "@/modules/catalog/queries";

export type SolutionDetail = {
  solution: Solution;
  categories: CategoryNode[];
  products: ProductCardData[];
  /** مجموع کالاهای دسته‌بندی‌های مرتبط — برای نمایش «۱۲ کالا» */
  totalInCategories: number;
};

/** راهکار به‌همراه دسته‌بندی‌ها و محصولات واقعی آن */
export const getSolutionDetail = cache(async (slug: string): Promise<SolutionDetail | null> => {
  const solution = getSolution(slug);
  if (!solution) return null;

  const [categories, products] = await Promise.all([
    getCategoriesBySlugs(solution.categorySlugs),
    getProductsForSolution(solution.productTags, 8),
  ]);

  return {
    solution,
    categories,
    products,
    totalInCategories: categories.reduce((sum, c) => sum + c.productCount, 0),
  };
});

export type SolutionSummary = {
  solution: Solution;
  /** تعداد کالاهای در دسترس در دسته‌بندی‌های این راهکار */
  productCount: number;
};

/**
 * فهرست راهکارها با تعداد کالای هر کدام.
 *
 * تعداد از دسته‌بندی‌های واقعی خوانده می‌شود؛ اگر راهکاری هنوز کالایی نداشته
 * باشد عدد صفر برمی‌گردد و رابط کاربری آن را به‌جای عدد، با برچسب «به‌زودی»
 * نشان می‌دهد.
 */
export const listSolutionSummaries = cache(async (): Promise<SolutionSummary[]> => {
  return Promise.all(
    solutions.map(async (solution) => {
      const categories = await getCategoriesBySlugs(solution.categorySlugs);
      return {
        solution,
        productCount: categories.reduce((sum, c) => sum + c.productCount, 0),
      };
    }),
  );
});

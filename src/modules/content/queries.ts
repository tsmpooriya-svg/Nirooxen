/**
 * ماژول محتوا — اخبار، مقالات و پروژه‌ها.
 */
import "server-only";

import { and, count, desc, eq, ne, sql } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import { posts, projects, users } from "@/db/schema";
import { PAGE_SIZE } from "@/lib/constants";

export const getPublishedPosts = cache(
  async ({ page = 1, pageSize = PAGE_SIZE.news, category }: { page?: number; pageSize?: number; category?: string } = {}) => {
    const where = category
      ? and(eq(posts.status, "PUBLISHED"), eq(posts.category, category))
      : eq(posts.status, "PUBLISHED");

    const [totalRow] = await db.select({ total: count() }).from(posts).where(where);

    const items = await db
      .select({
        id: posts.id,
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        category: posts.category,
        coverUrl: posts.coverUrl,
        readingMinutes: posts.readingMinutes,
        viewCount: posts.viewCount,
        publishedAt: posts.publishedAt,
      })
      .from(posts)
      .where(where)
      .orderBy(desc(posts.isFeatured), desc(posts.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const total = totalRow?.total ?? 0;
    return { items, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  },
);

export const getPostBySlug = cache(async (slug: string) => {
  const [row] = await db
    .select({ post: posts, authorName: users.name })
    .from(posts)
    .leftJoin(users, eq(posts.authorId, users.id))
    .where(and(eq(posts.slug, slug), eq(posts.status, "PUBLISHED")))
    .limit(1);
  return row ?? null;
});

export const getRelatedPosts = cache(async (postId: string, category: string, limit = 3) => {
  return db
    .select({
      id: posts.id,
      title: posts.title,
      slug: posts.slug,
      excerpt: posts.excerpt,
      category: posts.category,
      coverUrl: posts.coverUrl,
      readingMinutes: posts.readingMinutes,
      publishedAt: posts.publishedAt,
    })
    .from(posts)
    .where(and(eq(posts.status, "PUBLISHED"), eq(posts.category, category), ne(posts.id, postId)))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);
});

export const getPostCategories = cache(async () => {
  return db
    .select({ category: posts.category, total: count() })
    .from(posts)
    .where(eq(posts.status, "PUBLISHED"))
    .groupBy(posts.category)
    .orderBy(desc(count()));
});

export async function incrementPostView(postId: string) {
  await db.update(posts).set({ viewCount: sql`${posts.viewCount} + 1` }).where(eq(posts.id, postId));
}

export const getProjects = cache(async (limit?: number) => {
  const query = db
    .select()
    .from(projects)
    .where(eq(projects.isActive, true))
    .orderBy(desc(projects.isFeatured), sql`${projects.position} asc`);

  return limit ? query.limit(limit) : query;
});

export const getProjectBySlug = cache(async (slug: string) => {
  const [row] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1);
  return row ?? null;
});

export async function getAllPostSlugs() {
  return db
    .select({ slug: posts.slug, updatedAt: posts.updatedAt })
    .from(posts)
    .where(eq(posts.status, "PUBLISHED"));
}

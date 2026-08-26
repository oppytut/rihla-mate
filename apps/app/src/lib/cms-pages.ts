import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { pages } from "@/lib/db/schema/pages";

const RESERVED_PUBLIC_SLUGS = new Set([
  "packages",
  "dashboard",
  "sign-in",
  "installer",
  "activate",
  "marketing",
  "guide",
  "privacy",
  "terms",
  "forgot-password",
  "reset-password",
  "api",
]);

export function isReservedPublicSlug(slug: string): boolean {
  return RESERVED_PUBLIC_SLUGS.has(slug.trim().toLowerCase());
}

export type PublishedCmsPage = {
  slug: string;
  title: string;
  content: unknown;
  seo: unknown;
  isHomepage: boolean;
};

export async function getPublishedPageBySlug(slug: string): Promise<PublishedCmsPage | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  try {
    const db = await getDb();
    const [row] = await db
      .select({
        slug: pages.slug,
        title: pages.title,
        content: pages.content,
        seo: pages.seo,
        isHomepage: pages.isHomepage,
      })
      .from(pages)
      .where(and(eq(pages.slug, trimmed), eq(pages.isPublished, true)))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

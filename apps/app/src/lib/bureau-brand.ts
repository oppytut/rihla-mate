import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { packages } from "@/lib/db/schema/packages";
import { settings } from "@/lib/db/schema/settings";

function settingText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "string" && inner.trim()) return inner.trim();
  }
  return null;
}

export async function getBureauDisplayName(): Promise<string | null> {
  try {
    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.key, "appName")).limit(1);
    return settingText(row?.value);
  } catch {
    return null;
  }
}

export async function getPublishedPackageTitleBySlug(slug: string): Promise<string | null> {
  const trimmed = slug.trim();
  if (!trimmed) return null;
  try {
    const db = await getDb();
    const [row] = await db
      .select({ title: packages.title })
      .from(packages)
      .where(and(eq(packages.slug, trimmed), eq(packages.status, "published")))
      .limit(1);
    const title = row?.title?.trim();
    return title || null;
  } catch {
    return null;
  }
}

export function bureauCatalogMetadata(opts: {
  bureauName: string;
  pageTitle: string;
  description?: string;
  ogImage?: string | null;
}): Metadata {
  const { bureauName, pageTitle, description, ogImage } = opts;
  const imageUrl = ogImage?.trim() || null;
  return {
    title: pageTitle,
    description,
    applicationName: bureauName,
    openGraph: {
      siteName: bureauName,
      title: pageTitle,
      description,
      ...(imageUrl ? { images: [{ url: imageUrl }] } : {}),
    },
    ...(imageUrl ? { twitter: { card: "summary_large_image" as const, images: [imageUrl] } } : {}),
  };
}

export function bureauAbbr(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1];
  if (second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
  const compact = name.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "UM";
}

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { MarketingLanding } from "./marketing/marketing-landing";
import { BureauLanding } from "./bureau-landing";
import { getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname } from "@/lib/site-mode";
import { getDb } from "@/lib/db/client";
import { packages } from "@/lib/db/schema/packages";
import { pages } from "@/lib/db/schema/pages";
import { and, desc, eq } from "drizzle-orm";

function cmsText(content: unknown, key: string): string | null {
  if (!content || typeof content !== "object") return null;
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function loadBureauHome() {
  try {
    const db = await getDb();
    const [pkgRows, homepageFlag, homepageSlug] = await Promise.all([
      db
        .select({
          id: packages.id,
          title: packages.title,
          slug: packages.slug,
          description: packages.description,
          durationDays: packages.durationDays,
          price: packages.price,
          currency: packages.currency,
          departureCity: packages.departureCity,
        })
        .from(packages)
        .where(eq(packages.status, "published"))
        .orderBy(desc(packages.createdAt)),
      db
        .select()
        .from(pages)
        .where(and(eq(pages.isHomepage, true), eq(pages.isPublished, true)))
        .limit(1),
      db
        .select()
        .from(pages)
        .where(and(eq(pages.slug, "home"), eq(pages.isPublished, true)))
        .limit(1),
    ]);
    const cms = homepageFlag[0] ?? homepageSlug[0];
    return {
      packages: pkgRows,
      cmsTitle: cms?.title ?? cmsText(cms?.content, "title"),
      cmsBody: cmsText(cms?.content, "body") ?? cmsText(cms?.content, "html"),
    };
  } catch {
    return { packages: [], cmsTitle: null, cmsBody: null };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    return {};
  }
  const t = await getTranslations("marketing.bureau");
  const name = (await getBureauDisplayName()) ?? t("title");
  return {
    title: name,
    description: t("description"),
    applicationName: name,
    openGraph: { siteName: name, title: name },
  };
}

export default async function HomePage() {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    return <MarketingLanding />;
  }
  const data = await loadBureauHome();
  return <BureauLanding packages={data.packages} cmsTitle={data.cmsTitle} cmsBody={data.cmsBody} />;
}

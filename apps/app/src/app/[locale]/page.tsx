import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { MarketingLanding } from "./marketing/marketing-landing";
import { BureauLanding } from "./bureau-landing";
import {
  bureauCatalogMetadata,
  getBureauDisplayName,
  getBureauHomeSections,
  getBureauPublicContact,
} from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname } from "@/lib/site-mode";
import { getDb } from "@/lib/db/client";
import { packages } from "@/lib/db/schema/packages";
import { pages } from "@/lib/db/schema/pages";
import {
  cmsAbsoluteHttpUrl,
  cmsPackageCopy,
  cmsPageBody,
  cmsPageTitle,
  cmsSeoField,
} from "@/lib/cms-content";
import { and, desc, eq } from "drizzle-orm";

async function loadBureauHome(locale: string) {
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
          category: packages.category,
          featuredImage: packages.featuredImage,
          i18n: packages.i18n,
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
      packages: pkgRows.map((row) => {
        const copy = cmsPackageCopy(row.title, row.description, row.i18n, locale);
        return {
          id: row.id,
          title: copy.title,
          slug: row.slug,
          description: copy.description,
          durationDays: row.durationDays,
          price: row.price,
          currency: row.currency,
          departureCity: row.departureCity,
          category: row.category,
          featuredImage: row.featuredImage,
        };
      }),
      cmsTitle: cmsPageTitle(cms?.title, cms?.content, locale),
      cmsBody: cmsPageBody(cms?.content, locale),
      cmsSeo: cms?.seo ?? null,
    };
  } catch {
    return { packages: [], cmsTitle: null, cmsBody: null, cmsSeo: null };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    return {};
  }
  const t = await getTranslations("marketing.bureau");
  const locale = await getLocale();
  const name = (await getBureauDisplayName()) ?? t("title");
  const home = await loadBureauHome(locale);
  const seoTitle = cmsSeoField(home.cmsSeo, "title", locale);
  const seoDescription = cmsSeoField(home.cmsSeo, "description", locale);
  return bureauCatalogMetadata({
    bureauName: name,
    pageTitle: seoTitle ?? name,
    description: seoDescription ?? t("description"),
    ogImage: cmsAbsoluteHttpUrl(cmsSeoField(home.cmsSeo, "ogImage")),
  });
}

export default async function HomePage() {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    return <MarketingLanding />;
  }
  const locale = await getLocale();
  const [data, contact, homeSections] = await Promise.all([
    loadBureauHome(locale),
    getBureauPublicContact(),
    getBureauHomeSections(),
  ]);
  return (
    <BureauLanding
      packages={data.packages}
      cmsTitle={data.cmsTitle}
      cmsBody={data.cmsBody}
      contact={contact}
      homeSections={homeSections}
      variant="home"
    />
  );
}

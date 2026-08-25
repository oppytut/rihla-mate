import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BureauLanding } from "../bureau-landing";
import { getBureauDisplayName, getBureauPublicContact } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname, PRODUCT_ORIGIN } from "@/lib/site-mode";
import { getDb } from "@/lib/db/client";
import { packages } from "@/lib/db/schema/packages";
import { desc, eq } from "drizzle-orm";
import { cmsPackageCopy } from "@/lib/cms-content";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.bureau");
  const name = (await getBureauDisplayName()) ?? t("title");
  return {
    title: name,
    description: t("description"),
    applicationName: name,
    openGraph: { siteName: name, title: name },
  };
}

export default async function PackagesIndexPage() {
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    redirect(`${PRODUCT_ORIGIN}/`);
  }

  const locale = await getLocale();
  let rows: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    durationDays: number;
    price: string;
    currency: string;
    departureCity: string | null;
    category: string | null;
  }> = [];
  try {
    const db = await getDb();
    const raw = await db
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
        i18n: packages.i18n,
      })
      .from(packages)
      .where(eq(packages.status, "published"))
      .orderBy(desc(packages.createdAt));
    rows = raw.map((row) => {
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
      };
    });
  } catch {
    rows = [];
  }

  const contact = await getBureauPublicContact();
  return <BureauLanding packages={rows} contact={contact} variant="catalog" />;
}

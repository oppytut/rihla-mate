import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BureauLanding } from "../bureau-landing";
import { getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname, PRODUCT_ORIGIN } from "@/lib/site-mode";
import { getDb } from "@/lib/db/client";
import { packages } from "@/lib/db/schema/packages";
import { desc, eq } from "drizzle-orm";

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
    rows = await db
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
      })
      .from(packages)
      .where(eq(packages.status, "published"))
      .orderBy(desc(packages.createdAt));
  } catch {
    rows = [];
  }

  return <BureauLanding packages={rows} />;
}

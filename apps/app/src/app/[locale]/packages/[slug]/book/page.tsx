import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import {
  bureauCatalogMetadata,
  getBureauDisplayName,
  getPublishedPackageTitleBySlug,
} from "@/lib/bureau-brand";
import { PublicBookingView } from "./book-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations("bookings");
  const bureauName = (await getBureauDisplayName()) ?? "Paket Umrah";
  const locale = await getLocale();
  const pkgTitle = await getPublishedPackageTitleBySlug(slug, locale);
  const pageTitle = pkgTitle ? `${t("createTitle")} · ${pkgTitle}` : t("createTitle");
  return bureauCatalogMetadata({
    bureauName,
    pageTitle,
  });
}

export default function PublicBookingPage() {
  return <PublicBookingView />;
}

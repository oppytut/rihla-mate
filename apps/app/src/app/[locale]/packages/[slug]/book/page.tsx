import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
  const pkgTitle = await getPublishedPackageTitleBySlug(slug);
  const pageTitle = pkgTitle ? `${t("createTitle")} · ${pkgTitle}` : t("createTitle");
  return bureauCatalogMetadata({
    bureauName,
    pageTitle,
  });
}

export default function PublicBookingPage() {
  return <PublicBookingView />;
}

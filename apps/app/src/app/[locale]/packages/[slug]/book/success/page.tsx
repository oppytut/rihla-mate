import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import {
  bureauCatalogMetadata,
  getBureauDisplayName,
  getPublishedPackageTitleBySlug,
} from "@/lib/bureau-brand";
import { BookingSuccessView } from "./success-view";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bureauName = (await getBureauDisplayName()) ?? "Paket Umrah";
  const locale = await getLocale();
  const pkgTitle = await getPublishedPackageTitleBySlug(slug, locale);
  return bureauCatalogMetadata({
    bureauName,
    pageTitle: pkgTitle ?? bureauName,
  });
}

export default function BookingSuccessPage() {
  return <BookingSuccessView />;
}

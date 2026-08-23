import type { Metadata } from "next";
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
  const pkgTitle = await getPublishedPackageTitleBySlug(slug);
  return bureauCatalogMetadata({
    bureauName,
    pageTitle: pkgTitle ?? bureauName,
  });
}

export default function BookingSuccessPage() {
  return <BookingSuccessView />;
}

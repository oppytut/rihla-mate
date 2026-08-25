import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { BureauCmsPage } from "../bureau-cms-page";
import { bureauCatalogMetadata, getBureauDisplayName } from "@/lib/bureau-brand";
import { cmsPageBody, cmsSeoField } from "@/lib/cms-content";
import { getPublishedPageBySlug, isReservedPublicSlug } from "@/lib/cms-pages";
import { hostnameFromHostHeader, isBureauHostname, PRODUCT_ORIGIN } from "@/lib/site-mode";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname) || isReservedPublicSlug(slug)) {
    return {};
  }
  const page = await getPublishedPageBySlug(slug);
  if (!page) return {};
  const bureauName = (await getBureauDisplayName()) ?? page.title;
  return bureauCatalogMetadata({
    bureauName,
    pageTitle: cmsSeoField(page.seo, "title") ?? page.title,
    description: cmsSeoField(page.seo, "description") ?? cmsPageBody(page.content) ?? undefined,
  });
}

export default async function PublicCmsPage({ params }: Props) {
  const { slug } = await params;
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  if (!isBureauHostname(hostname)) {
    redirect(`${PRODUCT_ORIGIN}/`);
  }
  if (isReservedPublicSlug(slug)) {
    notFound();
  }

  const page = await getPublishedPageBySlug(slug);
  if (!page) {
    notFound();
  }
  if (page.isHomepage || page.slug === "home") {
    redirect("/");
  }

  return <BureauCmsPage title={page.title} body={cmsPageBody(page.content)} />;
}

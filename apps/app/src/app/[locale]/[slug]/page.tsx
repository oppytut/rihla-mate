import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BureauCmsPage } from "../bureau-cms-page";
import {
  bureauCatalogMetadata,
  getBureauDisplayName,
  getBureauPublicContact,
} from "@/lib/bureau-brand";
import { cmsAbsoluteHttpUrl, cmsPageBody, cmsPageTitle, cmsSeoField } from "@/lib/cms-content";
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
  const locale = await getLocale();
  const bureauName = (await getBureauDisplayName()) ?? page.title;
  return bureauCatalogMetadata({
    bureauName,
    pageTitle:
      cmsSeoField(page.seo, "title", locale) ??
      cmsPageTitle(page.title, page.content, locale) ??
      page.title,
    description:
      cmsSeoField(page.seo, "description", locale) ??
      cmsPageBody(page.content, locale) ??
      undefined,
    ogImage: cmsAbsoluteHttpUrl(cmsSeoField(page.seo, "ogImage", locale)),
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

  const [page, contact] = await Promise.all([
    getPublishedPageBySlug(slug),
    getBureauPublicContact(),
  ]);
  if (!page) {
    notFound();
  }
  if (page.isHomepage || page.slug === "home") {
    redirect("/");
  }

  const locale = await getLocale();
  return (
    <BureauCmsPage
      title={cmsPageTitle(page.title, page.content, locale) ?? page.title}
      body={cmsPageBody(page.content, locale)}
      contact={contact}
    />
  );
}

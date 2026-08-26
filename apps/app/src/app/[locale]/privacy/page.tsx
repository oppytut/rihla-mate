import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalDocPage } from "../legal/legal-doc-page";

const SECTIONS = ["who", "collect", "cookies", "purpose", "share", "retention", "contact"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.privacy");
  return { title: t("title"), description: t("lead") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("legal.privacy");
  return <LegalDocPage t={t} sections={SECTIONS} />;
}

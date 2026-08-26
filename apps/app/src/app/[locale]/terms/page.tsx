import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LegalDocPage } from "../legal/legal-doc-page";

const SECTIONS = [
  "product",
  "license",
  "account",
  "acceptable",
  "ip",
  "liability",
  "changes",
  "contact",
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal.terms");
  return { title: t("title"), description: t("lead") };
}

export default async function TermsPage() {
  const t = await getTranslations("legal.terms");
  return <LegalDocPage t={t} sections={SECTIONS} />;
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PageFormContent } from "@/components/forms/page-form";

export default function NewPagePage() {
  const t = useTranslations();

  useEffect(() => {
    document.title = `${t("pages.createTitle")} - Rihla Mate`;
  }, [t]);

  return <PageFormContent initialData={null} isEditMode={false} pageId={null} />;
}

"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { PackageFormContent } from "@/components/forms/package-form";

export default function NewPackagePage() {
  const t = useTranslations();

  useEffect(() => {
    document.title = `${t("packages.createTitle")} - Rihla Mate`;
  }, [t]);

  return <PackageFormContent initialData={null} isEditMode={false} packageId="new" />;
}

"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/utils/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common");

  useEffect(() => {
    logger.error("Unhandled error in error boundary", {}, error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h2 className="text-2xl font-semibold">{t("somethingWentWrong")}</h2>
      <p className="mt-2 text-muted-foreground">{t("unexpectedError")}</p>
      <button
        onClick={() => reset()}
        className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("tryAgain")}
      </button>
    </div>
  );
}

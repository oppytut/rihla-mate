"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function CtaBand() {
  const t = useTranslations();

  return (
    <section className="border-t border-border/40">
      <div className="relative overflow-hidden py-20 lg:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.646_0.222_41.116_/_0.06),transparent)]" />
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("marketing.cta.headline")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("marketing.cta.subtitle")}</p>
            <div className="mt-8">
              <Link
                href="/activate"
                className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
              >
                {t("marketing.cta.button")}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("marketing.cta.contact")}{" "}
              <a href="mailto:hello@rihla-mate.com" className="text-primary hover:underline">
                hello@rihla-mate.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

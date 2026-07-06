"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function CtaFooterSection() {
  const t = useTranslations("marketing");
  const year = new Date().getFullYear();

  return (
    <>
      <section className="border-t border-border/40">
        <div className="relative overflow-hidden py-20 lg:py-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.646_0.222_41.116_/_0.06),transparent)]" />
          <div className="container mx-auto px-4 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {t("cta.headline")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">{t("cta.subtitle")}</p>
              <div className="mt-8">
                <Link
                  href="/sign-in"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
                >
                  {t("cta.button")}
                </Link>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                {t("cta.contact")}{" "}
                <a href="mailto:hello@rihla-mate.com" className="text-primary hover:underline">
                  hello@rihla-mate.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <span className="text-xs font-bold text-primary-foreground">RM</span>
                </div>
                <span className="font-semibold text-foreground">Rihla Mate</span>
              </div>
              <p className="text-xs text-muted-foreground">{t("footer.tagline")}</p>
            </div>
            <div className="flex items-center gap-6">
              <Link
                href="#features"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.features")}
              </Link>
              <Link
                href="#pricing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.pricing")}
              </Link>
              <Link
                href="#faq"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.faq")}
              </Link>
              <Link
                href="mailto:hello@rihla-mate.com"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("footer.contact")}
              </Link>
            </div>
          </div>
          <div className="mt-6 border-t border-border/40 pt-6 text-center">
            <p className="text-xs text-muted-foreground">{t("footer.copyright", { year })}</p>
          </div>
        </div>
      </footer>
    </>
  );
}

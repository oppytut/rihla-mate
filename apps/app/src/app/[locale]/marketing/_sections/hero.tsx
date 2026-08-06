"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProductMock } from "@/components/marketing/product-mock";

export function HeroSection() {
  const t = useTranslations("marketing");

  return (
    <section className="relative overflow-hidden py-16 lg:py-28">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_70%_at_50%_-15%,oklch(0.42_0.09_165_/_0.14),transparent)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />
      <div
        className="absolute -end-24 top-24 -z-10 h-64 w-64 rounded-full bg-accent/15 blur-3xl"
        aria-hidden
      />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-16">
          <div className="mx-auto max-w-xl text-center lg:mx-0 lg:max-w-none lg:text-start">
            <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-card/90 px-4 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur">
              <span className="me-2 h-2 w-2 rounded-full bg-primary" />
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              {t("hero.headline")}{" "}
              <span className="text-primary">{t("hero.headlineHighlight")}</span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {t("hero.subtitle")}
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                href="/activate"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg sm:w-auto"
              >
                {t("hero.ctaTrial")}
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-input bg-background/80 px-8 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:bg-secondary sm:w-auto"
              >
                {t("hero.ctaLearn")}
              </Link>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">{t("hero.trialNote")}</p>
          </div>

          <div className="relative lg:ps-2">
            <ProductMock />
          </div>
        </div>
      </div>
    </section>
  );
}

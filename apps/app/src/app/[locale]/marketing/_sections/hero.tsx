"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export function HeroSection() {
  const t = useTranslations("marketing");

  return (
    <section className="relative overflow-hidden py-24 lg:py-36">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,oklch(0.646_0.222_41.116_/_0.08),transparent)]" />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center rounded-full border border-border/60 bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground">
            <span className="mr-2 h-2 w-2 rounded-full bg-chart-1" />
            {t("hero.badge")}
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            {t("hero.headline")} <span className="text-chart-1">{t("hero.headlineHighlight")}</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            {t("hero.subtitle")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md"
            >
              {t("hero.ctaTrial")}
            </Link>
            <Link
              href="#features"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-input bg-background px-8 text-sm font-medium text-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
            >
              {t("hero.ctaLearn")}
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">{t("hero.trialNote")}</p>
        </div>
      </div>
    </section>
  );
}

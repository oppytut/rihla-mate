"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, ListOrdered, Palette, Rocket, ShoppingCart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const stepIcons = [Rocket, Palette, ShoppingCart, TrendingUp] as const;
const stepKeys = ["deploy", "brand", "sell", "grow"] as const;

export function HowItWorksSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="how-it-works" borderTop className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_50%_0%,oklch(0.42_0.09_165_/_0.08),transparent)]"
        aria-hidden
      />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <ListOrdered className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("howItWorks.badge")}
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("howItWorks.sectionTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("howItWorks.sectionDescription")}
          </p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-6xl list-none gap-4 p-0 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {stepKeys.map((key, i) => {
            const Icon = stepIcons[i];
            const isLast = i === stepKeys.length - 1;

            return (
              <li key={key} className="relative">
                {!isLast ? (
                  <div
                    className="pointer-events-none absolute start-[calc(50%+2rem)] top-10 z-0 hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-border via-primary/25 to-border lg:block rtl:bg-gradient-to-l"
                    aria-hidden
                  />
                ) : null}

                <div
                  className={cn(
                    "relative z-10 flex h-full flex-col rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/25 hover:shadow-md sm:p-6",
                    i === 0 && "bg-gradient-to-br from-card via-card to-primary/[0.04]",
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/10">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span className="flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold tabular-nums text-primary-foreground shadow-sm">
                      {t(`howItWorks.steps.${key}.step`)}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    {t(`howItWorks.steps.${key}.title`)}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {t(`howItWorks.steps.${key}.description`)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 text-center sm:mt-12 sm:flex-row sm:justify-center sm:gap-4">
          <p className="text-sm text-muted-foreground">{t("howItWorks.ctaHint")}</p>
          <Link
            href="/activate"
            className="group inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
          >
            {t("howItWorks.cta")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
          </Link>
        </div>
      </div>
    </SectionWrapper>
  );
}

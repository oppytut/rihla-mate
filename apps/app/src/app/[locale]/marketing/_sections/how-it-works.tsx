"use client";

import { useTranslations } from "next-intl";
import { Rocket, Palette, ShoppingCart, TrendingUp } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

const stepIcons = [Rocket, Palette, ShoppingCart, TrendingUp] as const;
const stepKeys = ["deploy", "brand", "sell", "grow"] as const;

export function HowItWorksSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="how-it-works" borderTop>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("howItWorks.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("howItWorks.sectionDescription")}</p>
        </div>

        <div className="mx-auto mt-16 max-w-5xl">
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="absolute left-0 right-0 top-9 hidden h-px bg-border/60 lg:block" />

            {stepKeys.map((key, i) => {
              const Icon = stepIcons[i];
              return (
                <div key={key} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-2 border-border/60 bg-card shadow-sm">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>

                  <span className="absolute -right-1 -top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-chart-1 text-xs font-bold text-white">
                    {t(`howItWorks.steps.${key}.step`)}
                  </span>

                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {t(`howItWorks.steps.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`howItWorks.steps.${key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

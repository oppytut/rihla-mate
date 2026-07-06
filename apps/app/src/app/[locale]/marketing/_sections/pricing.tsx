"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const planKeys = ["starter", "pro", "enterprise"] as const;

export function PricingSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="pricing" borderTop>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("pricing.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("pricing.sectionDescription")}</p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
          {planKeys.map((key) => {
            const isPopular = key === "pro";
            const featureCount = t.raw(`pricing.${key}.features`).length;
            const features = Array.from({ length: featureCount }, (_, fi) =>
              t(`pricing.${key}.features.${fi}` as Parameters<typeof t>[0]),
            );

            return (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col rounded-xl border p-6 transition-all",
                  isPopular
                    ? "border-primary/50 bg-card shadow-lg lg:scale-105"
                    : "border-border/50 bg-card hover:border-border hover:shadow-md",
                )}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">
                    {t("pricing.popular")}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground">
                    {t(`pricing.${key}.name`)}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(`pricing.${key}.description`)}
                  </p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold text-foreground">
                    {t(`pricing.${key}.price`)}
                  </span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    {t(`pricing.${key}.period`)}
                  </span>
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-chart-1" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-in"
                  className={cn(
                    "inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-all",
                    isPopular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border border-input bg-background text-foreground hover:bg-accent",
                  )}
                >
                  {t(`pricing.${key}.cta`)}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}

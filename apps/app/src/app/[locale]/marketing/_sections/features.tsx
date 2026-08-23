"use client";

import { useTranslations } from "next-intl";
import { Palette, Shield, CalendarCheck, CreditCard, Key, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const featureIcons = [
  { Icon: Palette, key: "whiteLabel", span: "sm:col-span-2 lg:col-span-2" },
  { Icon: Shield, key: "selfHosted", span: "" },
  { Icon: CalendarCheck, key: "bookingEngine", span: "" },
  { Icon: CreditCard, key: "payments", span: "" },
  { Icon: Key, key: "license", span: "sm:col-span-2 lg:col-span-1" },
  { Icon: BarChart3, key: "analytics", span: "sm:col-span-2 lg:col-span-3" },
] as const;

export function FeaturesSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="features" borderTop className="bg-muted/20">
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
            {t("features.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("features.sectionDescription")}</p>
        </div>

        <div className="mt-12 grid gap-4 sm:mt-16 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
          {featureIcons.map(({ Icon, key, span }, index) => {
            const featured = index === 0 || index === 5;
            return (
              <div
                key={key}
                className={cn(
                  "group relative rounded-xl border border-border/50 bg-card p-5 shadow-sm transition-all hover:border-primary/25 hover:shadow-md sm:p-6",
                  span,
                  featured && "bg-gradient-to-br from-card via-card to-primary/[0.04]",
                )}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-2 font-semibold text-foreground">{t(`features.${key}.title`)}</h3>
                <p
                  className={cn(
                    "text-sm leading-relaxed text-muted-foreground",
                    featured && "max-w-prose",
                  )}
                >
                  {t(`features.${key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}

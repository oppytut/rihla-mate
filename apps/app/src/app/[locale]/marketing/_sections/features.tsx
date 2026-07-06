"use client";

import { useTranslations } from "next-intl";
import { Palette, Shield, CalendarCheck, CreditCard, Key, BarChart3 } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

const featureIcons = [
  { Icon: Palette, key: "whiteLabel" },
  { Icon: Shield, key: "selfHosted" },
  { Icon: CalendarCheck, key: "bookingEngine" },
  { Icon: CreditCard, key: "payments" },
  { Icon: Key, key: "license" },
  { Icon: BarChart3, key: "analytics" },
] as const;

export function FeaturesSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="features" borderTop>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("features.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t("features.sectionDescription")}</p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featureIcons.map(({ Icon, key }) => (
            <div
              key={key}
              className="group relative rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 font-semibold text-foreground">{t(`features.${key}.title`)}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`features.${key}.description`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

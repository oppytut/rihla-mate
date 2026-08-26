"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Check, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const planKeys = ["starter", "pro", "enterprise"] as const;

export function PricingSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="pricing" borderTop className="relative overflow-hidden bg-muted/15">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_55%_45%_at_80%_0%,oklch(0.78_0.09_85_/_0.1),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_40%_35%_at_10%_100%,oklch(0.42_0.09_165_/_0.08),transparent)]"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
            <Tag className="h-3.5 w-3.5 text-primary" aria-hidden />
            {t("pricing.badge")}
          </div>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
            {t("pricing.sectionTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {t("pricing.sectionDescription")}
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-5 sm:mt-16 lg:grid-cols-3 lg:gap-8">
          {planKeys.map((key) => {
            const isPopular = key === "pro";
            const featureCount = (t.raw(`pricing.${key}.features`) as string[]).length;
            const features = Array.from({ length: featureCount }, (_, fi) =>
              t(`pricing.${key}.features.${fi}` as Parameters<typeof t>[0]),
            );

            return (
              <div
                key={key}
                className={cn(
                  "relative flex flex-col rounded-2xl border transition-all duration-200",
                  isPopular
                    ? "z-10 border-primary/30 bg-card p-6 shadow-xl shadow-primary/10 ring-1 ring-primary/15 sm:p-7 lg:-my-2 lg:scale-[1.03]"
                    : "border-border/50 bg-card/90 p-6 shadow-sm hover:border-border hover:shadow-md sm:p-6",
                )}
              >
                {isPopular && (
                  <div className="absolute start-1/2 top-0 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1 text-xs font-semibold text-primary-foreground shadow-md rtl:translate-x-1/2">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {t("pricing.popular")}
                  </div>
                )}

                <div className={cn("mb-5", isPopular && "pt-2")}>
                  <h3
                    className={cn(
                      "text-lg font-semibold tracking-tight",
                      isPopular ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t(`pricing.${key}.name`)}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {t(`pricing.${key}.description`)}
                  </p>
                </div>

                <div className="mb-6 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 border-b border-border/40 pb-6">
                  <span
                    className={cn(
                      "text-4xl font-bold tracking-tight tabular-nums sm:text-[2.5rem]",
                      isPopular ? "text-primary" : "text-foreground",
                    )}
                  >
                    {t(`pricing.${key}.price`)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {t(`pricing.${key}.period`)}
                  </span>
                </div>

                <ul className="mb-8 flex flex-1 flex-col gap-2.5">
                  {features.map((feat, fi) => (
                    <li key={fi} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          isPopular ? "bg-primary/15 text-primary" : "bg-success/15 text-success",
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      </span>
                      <span className="leading-snug text-foreground/85">{feat}</span>
                    </li>
                  ))}
                </ul>

                {key === "enterprise" ? (
                  <a
                    href="mailto:mail@rihla.my.id"
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl border-2 border-primary/40 bg-primary/10 text-sm font-semibold text-primary shadow-sm transition-all hover:border-primary hover:bg-primary/15"
                  >
                    {t(`pricing.${key}.cta`)}
                  </a>
                ) : (
                  <Link
                    href="/activate"
                    className={cn(
                      "group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                      isPopular
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:shadow-lg"
                        : "border-2 border-primary/40 bg-primary/10 text-primary shadow-sm hover:border-primary hover:bg-primary/15",
                    )}
                  >
                    {t(`pricing.${key}.cta`)}
                    {isPopular ? (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
                    ) : null}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-xl text-center text-sm text-muted-foreground sm:mt-12">
          {t("pricing.footnote")}
        </p>
      </div>
    </SectionWrapper>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Building2, Check, Sparkles } from "lucide-react";
import { ProductMock } from "@/components/marketing/product-mock";

export function HeroSection() {
  const t = useTranslations("marketing");
  const stats = t.raw("proof.stats") as Array<{ value: string; label: string }>;
  const chips = stats.slice(0, 3);

  return (
    <section className="relative overflow-hidden pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pb-20 lg:pt-24">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_15%_-10%,oklch(0.42_0.09_165_/_0.16),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_90%_20%,oklch(0.78_0.09_85_/_0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,oklch(0.5_0.02_165_/_0.06)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0.02_165_/_0.06)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-20 top-32 -z-10 h-72 w-72 rounded-full bg-accent/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -start-16 bottom-0 -z-10 h-56 w-56 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-32 bg-gradient-to-t from-background to-transparent"
        aria-hidden
      />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-10 sm:gap-12 lg:grid-cols-12 lg:gap-10 xl:gap-14">
          <div className="mx-auto max-w-xl text-center lg:col-span-5 lg:mx-0 lg:max-w-none lg:text-start xl:col-span-5">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/90 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur sm:mb-6 sm:text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t("hero.badge")}
              <span className="hidden h-1 w-1 rounded-full bg-border sm:inline" aria-hidden />
              <span className="hidden items-center gap-1 text-primary sm:inline-flex">
                <Sparkles className="h-3 w-3" aria-hidden />
                <span className="text-xs font-semibold">{t("hero.badgeAccent")}</span>
              </span>
            </div>

            <h1 className="text-balance text-[1.85rem] font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl sm:leading-[1.12] lg:text-[2.75rem] xl:text-[3.15rem] xl:leading-[1.08]">
              {t("hero.headline")}{" "}
              <span className="bg-gradient-to-br from-primary via-primary to-[oklch(0.45_0.1_145)] bg-clip-text text-transparent">
                {t("hero.headlineHighlight")}
              </span>
            </h1>

            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:mt-5 sm:text-lg">
              {t("hero.subtitle")}
            </p>

            <div className="mt-7 flex flex-col items-stretch gap-3 sm:mt-9 sm:flex-row sm:items-center sm:justify-center lg:justify-start">
              <Link
                href="/activate"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/30 sm:w-auto"
              >
                {t("hero.ctaTrial")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                href="#features"
                className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-input bg-background/80 px-7 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:bg-secondary sm:w-auto"
              >
                {t("hero.ctaLearn")}
              </Link>
            </div>

            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/70 px-3.5 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur sm:mt-5 sm:text-sm">
              <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
              {t("hero.trialNote")}
            </p>

            <ul className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:mt-10 lg:justify-start">
              {chips.map((chip) => (
                <li
                  key={chip.label}
                  className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card/80 py-2 pe-3.5 ps-2.5 text-start shadow-sm backdrop-blur"
                >
                  <span className="flex h-8 min-w-8 items-center justify-center rounded-lg bg-primary/10 px-1.5 text-xs font-bold tabular-nums text-primary">
                    {chip.value}
                  </span>
                  <span className="max-w-[7.5rem] text-[11px] font-medium leading-tight text-muted-foreground sm:max-w-[9rem] sm:text-xs">
                    {chip.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative lg:col-span-7 xl:col-span-7">
            <div
              className="pointer-events-none absolute -inset-3 rounded-[1.75rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/20 opacity-80 blur-2xl sm:-inset-5"
              aria-hidden
            />
            <div className="relative rounded-2xl border border-border/50 bg-card/40 p-2 shadow-xl shadow-primary/5 ring-1 ring-primary/10 backdrop-blur-sm sm:p-3">
              <div
                className="absolute -top-3 start-4 z-10 hidden items-center gap-1.5 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-md sm:inline-flex"
                aria-hidden
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                {t("hero.liveBadge")}
              </div>
              <div
                className="absolute -bottom-3 end-4 z-10 hidden max-w-[11rem] rounded-xl border border-border/60 bg-card px-3 py-2 shadow-lg sm:block"
                aria-hidden
              >
                <p className="text-[10px] font-medium text-muted-foreground">
                  {t("hero.floatCaption")}
                </p>
                <p className="mt-0.5 text-xs font-bold text-primary">{t("hero.floatValue")}</p>
              </div>
              <ProductMock className="max-w-none scale-100" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

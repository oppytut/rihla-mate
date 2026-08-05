"use client";

import { useTranslations } from "next-intl";

export function TrustBadgesSection() {
  const t = useTranslations("marketing");
  const stats = t.raw("proof.stats") as Array<{ value: string; label: string }>;
  const agencies = t.raw("proof.agencies") as string[];

  return (
    <section
      className="border-y border-border/40 bg-card/60 py-10 lg:py-12"
      aria-label={t("proof.sectionLabel")}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <p className="mb-8 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("proof.sectionLabel")}
        </p>

        <ul className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <li
              key={stat.label}
              className="flex flex-col items-center rounded-xl border border-border/50 bg-background/90 px-4 py-5 text-center shadow-sm"
            >
              <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                {stat.value}
              </span>
              <span className="mt-1.5 text-sm text-muted-foreground">{stat.label}</span>
              <span className="mt-3 h-0.5 w-8 rounded-full bg-accent" aria-hidden />
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-10 max-w-4xl">
          <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
            {t("proof.agenciesLabel")}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {agencies.map((name) => (
              <li
                key={name}
                className="rounded-full border border-border/60 bg-background px-3.5 py-1.5 text-xs font-semibold tracking-tight text-foreground/80 sm:text-sm"
              >
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("proof.midtransNote")}
          </p>
        </div>
      </div>
    </section>
  );
}

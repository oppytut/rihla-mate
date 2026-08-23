"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

function monogram(name: string): string {
  const parts = name.replace(/[.-]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function TrustBadgesSection() {
  const t = useTranslations("marketing");
  const stats = t.raw("proof.stats") as Array<{ value: string; label: string }>;
  const agencies = t.raw("proof.agencies") as string[];

  return (
    <section
      className="border-y border-border/40 bg-card/60 py-8 sm:py-10 lg:py-12"
      aria-label={t("proof.sectionLabel")}
    >
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground sm:mb-8">
          {t("proof.sectionLabel")}
        </p>

        <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/90 shadow-sm">
          <ul className="grid divide-y divide-border/40 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <li
                key={stat.label}
                className={cn(
                  "flex flex-col items-center px-4 py-5 text-center sm:py-6",
                  i % 2 === 0 && "sm:border-e sm:border-border/40",
                  i < 2 && "sm:border-b sm:border-border/40 lg:border-b-0",
                  i === 2 && "lg:border-e lg:border-border/40",
                )}
              >
                <span className="text-2xl font-bold tracking-tight text-primary sm:text-3xl">
                  {stat.value}
                </span>
                <span className="mt-1.5 text-sm text-muted-foreground">{stat.label}</span>
                <span className="mt-3 h-0.5 w-8 rounded-full bg-accent" aria-hidden />
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 sm:mt-10">
          <p className="mb-4 text-center text-xs font-medium text-muted-foreground">
            {t("proof.agenciesLabel")}
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {agencies.map((name) => (
              <li
                key={name}
                className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background py-1 pe-3.5 ps-1.5 text-xs font-semibold tracking-tight text-foreground/80 sm:text-sm"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary ring-1 ring-primary/15"
                  aria-hidden
                >
                  {monogram(name)}
                </span>
                {name}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center text-xs text-muted-foreground sm:mt-6">
            {t("proof.midtransNote")}
          </p>
        </div>
      </div>
    </section>
  );
}

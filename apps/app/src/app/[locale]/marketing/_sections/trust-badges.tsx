"use client";

import { useTranslations } from "next-intl";
import { Server, CreditCard, Clock, ShieldCheck } from "lucide-react";

const BADGES = [
  { key: "selfHosted" as const, Icon: Server },
  { key: "midtrans" as const, Icon: CreditCard },
  { key: "trial" as const, Icon: Clock },
  { key: "license" as const, Icon: ShieldCheck },
] as const;

export function TrustBadgesSection() {
  const t = useTranslations("marketing");

  return (
    <section
      className="border-y border-border/40 bg-card/60 py-10"
      aria-label={t("trust.sectionLabel")}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("trust.sectionLabel")}
        </p>
        <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map(({ key, Icon }) => (
            <li
              key={key}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-background/80 px-4 py-3 shadow-sm"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{t(`trust.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

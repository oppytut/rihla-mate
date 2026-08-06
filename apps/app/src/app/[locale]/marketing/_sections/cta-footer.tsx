"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";

export function CtaBand() {
  const t = useTranslations();
  const checklist = t.raw("marketing.cta.checklist") as string[];

  return (
    <section className="border-t border-border/40">
      <div className="relative overflow-hidden py-16 sm:py-20 lg:py-28">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,oklch(0.78_0.09_85_/_0.14),transparent)]" />
        <div className="container mx-auto px-4 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("marketing.cta.headline")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("marketing.cta.subtitle")}</p>

            <ul className="mx-auto mt-6 flex max-w-md flex-col gap-2 text-start sm:mt-8">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg border border-border/40 bg-card/60 px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm backdrop-blur"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/activate"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-all hover:bg-primary/90 hover:shadow-md sm:w-auto"
              >
                {t("marketing.cta.button")}
              </Link>
              <Link
                href="#pricing"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-input bg-background/80 px-8 text-sm font-medium text-foreground shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:bg-secondary sm:w-auto"
              >
                {t("marketing.cta.secondary")}
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              {t("marketing.cta.contact")}{" "}
              <a href="mailto:hello@rihla-mate.com" className="text-primary hover:underline">
                hello@rihla-mate.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

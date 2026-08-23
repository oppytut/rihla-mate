"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Check } from "lucide-react";

export function CtaBand() {
  const t = useTranslations();
  const checklist = t.raw("marketing.cta.checklist") as string[];

  return (
    <section className="border-t border-border/40 bg-primary text-primary-foreground">
      <div className="relative overflow-hidden py-16 sm:py-20 lg:py-24">
        <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              {t("marketing.cta.headline")}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("marketing.cta.subtitle")}</p>

            <ul className="mx-auto mt-6 flex max-w-lg flex-col gap-2 text-start sm:mt-8">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg border border-primary-foreground/15 bg-primary-foreground/10 px-3.5 py-2.5 text-sm text-primary-foreground/90"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Link
                href="/activate"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-background px-8 text-sm font-semibold text-foreground shadow transition-all hover:bg-background/90 sm:w-auto"
              >
                {t("marketing.cta.button")}
              </Link>
              <Link
                href="#pricing"
                className="inline-flex h-12 w-full items-center justify-center rounded-lg border border-primary-foreground/30 bg-transparent px-8 text-sm font-medium text-primary-foreground transition-all hover:bg-primary-foreground/10 sm:w-auto"
              >
                {t("marketing.cta.secondary")}
              </Link>
            </div>
            <p className="mt-4 text-sm text-primary-foreground/75">
              {t("marketing.cta.contact")}{" "}
              <a
                href="mailto:hello@rihla-mate.com"
                className="underline hover:text-primary-foreground"
              >
                hello@rihla-mate.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

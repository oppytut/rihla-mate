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
          <div className="mx-auto w-full text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl xl:text-5xl">
              {t("marketing.cta.headline")}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/90">{t("marketing.cta.subtitle")}</p>

            <ul className="mx-auto mt-6 grid w-full max-w-5xl gap-3 text-start sm:mt-8 sm:grid-cols-3">
              {checklist.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 rounded-lg border border-primary-foreground/25 bg-primary-foreground/15 px-3 py-3 text-sm font-medium leading-snug text-primary-foreground sm:px-4"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="min-w-0 text-pretty break-words">{item}</span>
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
            <p className="mt-5 text-base text-primary-foreground/90">
              {t("marketing.cta.contact")}{" "}
              <a
                href="mailto:hello@rihla-mate.com"
                className="inline-block whitespace-nowrap underline hover:text-primary-foreground"
                dir="ltr"
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

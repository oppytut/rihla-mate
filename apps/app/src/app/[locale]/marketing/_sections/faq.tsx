"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, CircleHelp, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const FAQ_COUNT = 8;

function FaqItem({
  index,
  question,
  answer,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: {
  index: number;
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  buttonId: string;
}) {
  const n = String(index + 1).padStart(2, "0");

  return (
    <div
      className={cn(
        "group rounded-xl border bg-card/80 shadow-sm transition-all duration-200",
        isOpen
          ? "border-primary/25 shadow-md ring-1 ring-primary/10"
          : "border-border/50 hover:border-border hover:shadow-md",
      )}
    >
      <h3 className="m-0">
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-4 text-start sm:gap-4 sm:px-5 sm:py-5"
        >
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums transition-colors",
              isOpen
                ? "bg-primary text-primary-foreground"
                : "bg-primary/10 text-primary group-hover:bg-primary/15",
            )}
            aria-hidden
          >
            {n}
          </span>
          <span className="min-w-0 flex-1 pt-1 text-sm font-semibold leading-snug text-foreground sm:text-[0.9375rem]">
            {question}
          </span>
          <span
            className={cn(
              "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
              isOpen
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-muted/40 text-muted-foreground group-hover:border-border",
            )}
            aria-hidden
          >
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200", isOpen && "rotate-180")}
            />
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={cn(
          "grid transition-all duration-200 ease-in-out",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="border-t border-border/40 px-4 pb-4 ps-[3.25rem] pt-3 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:pb-5 sm:ps-[4.25rem] sm:pt-3.5">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqSection() {
  const t = useTranslations("marketing");
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <SectionWrapper id="faq" borderTop className="relative overflow-hidden bg-muted/15">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_50%_40%_at_20%_0%,oklch(0.78_0.09_85_/_0.08),transparent)]"
        aria-hidden
      />
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <CircleHelp className="h-3.5 w-3.5 text-primary" aria-hidden />
              {t("faq.badge")}
            </div>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {t("faq.sectionTitle")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
              {t("faq.sectionDescription")}
            </p>

            <div className="mt-8 hidden rounded-xl border border-border/50 bg-card p-5 shadow-sm lg:block">
              <p className="text-sm font-semibold text-foreground">{t("faq.stillHaveQuestions")}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {t("faq.contactHint")}
              </p>
              <a
                href="mailto:hello@rihla-mate.com"
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-secondary"
              >
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                {t("faq.contactCta")}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:col-span-8">
            {Array.from({ length: FAQ_COUNT }, (_, i) => (
              <FaqItem
                key={i}
                index={i}
                question={t(`faq.items.${i}.question`)}
                answer={t(`faq.items.${i}.answer`)}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                panelId={`${baseId}-panel-${i}`}
                buttonId={`${baseId}-button-${i}`}
              />
            ))}

            <div className="mt-2 rounded-xl border border-dashed border-border/60 bg-card/50 p-4 sm:p-5 lg:hidden">
              <p className="text-sm font-semibold text-foreground">{t("faq.stillHaveQuestions")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("faq.contactHint")}</p>
              <a
                href="mailto:hello@rihla-mate.com"
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary"
              >
                <Mail className="h-4 w-4 text-primary" aria-hidden />
                {t("faq.contactCta")}
              </a>
            </div>
          </div>
        </div>
      </div>
    </SectionWrapper>
  );
}

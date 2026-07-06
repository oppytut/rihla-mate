"use client";

import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

export function TestimonialsSection() {
  const t = useTranslations("marketing");

  return (
    <SectionWrapper id="testimonials" borderTop>
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("testimonials.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("testimonials.sectionDescription")}
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="relative flex flex-col rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-md"
            >
              <Quote className="mb-4 h-6 w-6 text-primary/30" />
              <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{t(`testimonials.items.${i}.quote`)}&rdquo;
              </blockquote>
              <div className="mt-4 border-t border-border/40 pt-4">
                <p className="text-sm font-semibold text-foreground">
                  {t(`testimonials.items.${i}.author`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`testimonials.items.${i}.role`)} &middot; {t(`testimonials.items.${i}.city`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}

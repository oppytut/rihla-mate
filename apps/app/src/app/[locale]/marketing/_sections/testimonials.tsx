"use client";

import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import { SectionWrapper } from "./section-wrapper";

function initials(name: string): string {
  const parts = name.replace(/\./g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const second = parts[1] ?? "";
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

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
          {[0, 1, 2].map((i) => {
            const author = t(`testimonials.items.${i}.author`);
            const role = t(`testimonials.items.${i}.role`);
            const city = t(`testimonials.items.${i}.city`);

            return (
              <div
                key={i}
                className="relative flex flex-col rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-md"
              >
                <Quote className="mb-4 h-6 w-6 text-accent" aria-hidden />
                <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  &ldquo;{t(`testimonials.items.${i}.quote`)}&rdquo;
                </blockquote>
                <div className="mt-4 flex items-center gap-3 border-t border-border/40 pt-4">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-accent/40"
                    aria-hidden
                  >
                    {initials(author)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{author}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {role} &middot; {city}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}

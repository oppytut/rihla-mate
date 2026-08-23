"use client";

import { useTranslations } from "next-intl";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionWrapper } from "./section-wrapper";

const AVATAR_TONES = [
  "bg-primary text-primary-foreground ring-accent/50",
  "bg-primary/90 text-primary-foreground ring-primary/30",
  "bg-[oklch(0.38_0.08_165)] text-primary-foreground ring-accent/40",
] as const;

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
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
            {t("testimonials.sectionTitle")}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            {t("testimonials.sectionDescription")}
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-3 md:gap-8">
          {[0, 1, 2].map((i) => {
            const author = t(`testimonials.items.${i}.author`);
            const role = t(`testimonials.items.${i}.role`);
            const city = t(`testimonials.items.${i}.city`);
            const tone = AVATAR_TONES[i % AVATAR_TONES.length];

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
                    className={cn(
                      "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ring-2",
                      tone,
                    )}
                    aria-hidden
                  >
                    {initials(author)}
                    <span
                      className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-card bg-success"
                      aria-hidden
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{author}</p>
                    <p className="text-xs leading-snug text-muted-foreground">
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

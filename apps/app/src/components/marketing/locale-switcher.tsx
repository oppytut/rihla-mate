"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LOCALE_LABELS: Record<string, string> = {
  id: "ID",
  en: "EN",
  ar: "عر",
};

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border/60 p-0.5",
        className,
      )}
      role="navigation"
      aria-label="Language"
      data-testid="locale-switcher"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {routing.locales.map((l) => {
        const isActive = l === locale;
        return (
          <Link
            key={l}
            href={pathname}
            locale={l}
            hrefLang={l}
            className={cn(
              "inline-flex h-7 min-w-8 items-center justify-center rounded px-1.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {LOCALE_LABELS[l] ?? l.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}

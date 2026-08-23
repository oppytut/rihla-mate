"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { useAuthBrand } from "@/components/auth/auth-brand-context";
import { cn } from "@/lib/utils";

type AuthShellProps = {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg";
  showBackHome?: boolean;
  footer?: React.ReactNode;
  brandWordmark?: string;
  brandAbbr?: string;
};

const maxWidthClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

export function AuthShell({
  children,
  className,
  maxWidth = "sm",
  showBackHome = true,
  footer,
  brandWordmark,
  brandAbbr,
}: AuthShellProps) {
  const t = useTranslations();
  const fromLayout = useAuthBrand();
  const wordmark = brandWordmark?.trim() || fromLayout.wordmark?.trim() || t("common.appName");
  const abbr = brandAbbr?.trim() || fromLayout.abbr?.trim() || t("common.appNameAbbr");

  return (
    <div
      className={cn(
        "relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10 antialiased",
        className,
      )}
      data-testid="auth-shell"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.42_0.09_165_/_0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,oklch(0.78_0.09_85_/_0.06),transparent_50%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
      />

      <div className={cn("relative z-10 w-full", maxWidthClass[maxWidth])}>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="auth-brand-home"
          >
            <BrandMark
              size="md"
              showWordmark
              abbr={abbr}
              wordmark={wordmark}
              wordmarkClassName="text-base sm:text-lg"
            />
          </Link>
          <LocaleSwitcher />
        </div>

        <div className="rounded-xl border border-border/80 bg-card/95 p-6 shadow-sm ring-1 ring-black/5 backdrop-blur-sm sm:p-7 dark:ring-white/5">
          {children}
        </div>

        {(showBackHome || footer) && (
          <div className="mt-5 flex flex-col items-center gap-2 text-center">
            {footer}
            {showBackHome ? (
              <Link
                href="/"
                className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                data-testid="auth-back-home"
              >
                {t("auth.backToHome")}
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useId, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { cn } from "@/lib/utils";

type MarketingMobileNavProps = {
  featuresHref: string;
  pricingHref: string;
  faqHref: string;
  extraLinks?: Array<{ href: string; label: string }>;
  hideProductAnchors?: boolean;
  labels: {
    menu: string;
    close: string;
    features: string;
    pricing: string;
    faq: string;
    guide: string;
    signIn: string;
    signInHref?: string;
    getStarted?: string;
  };
};

export function MarketingMobileNav({
  featuresHref,
  pricingHref,
  faqHref,
  extraLinks,
  hideProductAnchors = false,
  labels,
}: MarketingMobileNavProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border/60",
          "bg-background text-foreground shadow-sm transition-colors hover:bg-muted",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? labels.close : labels.menu}
        data-testid="mobile-nav-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px]"
            aria-label={labels.close}
            onClick={close}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label={labels.menu}
            data-testid="mobile-nav-panel"
            className={cn(
              "absolute inset-x-0 top-full z-50 border-b border-border/50",
              "bg-background/98 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/95",
            )}
          >
            <div className="container mx-auto flex flex-col gap-1 px-4 py-4">
              <nav className="flex flex-col gap-0.5" aria-label="Primary mobile">
                {extraLinks?.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={close}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {item.label}
                  </Link>
                ))}
                {hideProductAnchors ? null : (
                  <>
                    <Link
                      href={featuresHref}
                      onClick={close}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {labels.features}
                    </Link>
                    <Link
                      href={pricingHref}
                      onClick={close}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {labels.pricing}
                    </Link>
                    <Link
                      href={faqHref}
                      onClick={close}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {labels.faq}
                    </Link>
                    <Link
                      href="/guide"
                      onClick={close}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                    >
                      {labels.guide}
                    </Link>
                  </>
                )}
              </nav>

              <div className="my-2 h-px bg-border/50" aria-hidden />

              <div className="flex flex-col gap-3 px-1 py-1">
                <LocaleSwitcher className="w-fit" />
                {labels.signInHref?.startsWith("http") ? (
                  <a
                    href={labels.signInHref}
                    onClick={close}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                  >
                    {labels.signIn}
                  </a>
                ) : (
                  <Link
                    href="/sign-in"
                    onClick={close}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                  >
                    {labels.signIn}
                  </Link>
                )}
                {labels.getStarted ? (
                  <Link
                    href="/activate"
                    onClick={close}
                    className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow sm:hidden"
                  >
                    {labels.getStarted}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

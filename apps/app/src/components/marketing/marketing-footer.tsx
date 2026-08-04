import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";

type MarketingFooterProps = {
  crossPageAnchors?: boolean;
  variant?: "full" | "simple";
};

export async function MarketingFooter({
  crossPageAnchors = false,
  variant = "full",
}: MarketingFooterProps = {}) {
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const year = new Date().getFullYear();

  const featuresHref = crossPageAnchors ? "/marketing#features" : "#features";
  const pricingHref = crossPageAnchors ? "/marketing#pricing" : "#pricing";
  const faqHref = crossPageAnchors ? "/marketing#faq" : "#faq";

  if (variant === "simple") {
    return (
      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">
                  {tCommon("appNameAbbr")}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {t("footer.copyright", { year })}
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <LocaleSwitcher />
              <Link
                href="/marketing"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.features")}
              </Link>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.signIn")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/40 py-8">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <span className="text-xs font-bold text-primary-foreground">
                  {tCommon("appNameAbbr")}
                </span>
              </div>
              <span className="font-semibold text-foreground">{tCommon("appName")}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t("footer.tagline")}</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <LocaleSwitcher />
            <Link
              href={featuresHref}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("footer.features")}
            </Link>
            <Link
              href={pricingHref}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("footer.pricing")}
            </Link>
            <Link
              href={faqHref}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("footer.faq")}
            </Link>
            <a
              href="mailto:hello@rihla-mate.com"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("footer.contact")}
            </a>
          </div>
        </div>
        <div className="mt-6 border-t border-border/40 pt-6 text-center">
          <p className="text-xs text-muted-foreground">{t("footer.copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}

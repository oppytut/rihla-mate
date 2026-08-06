import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MarketingMobileNav } from "./marketing-mobile-nav";
import { BrandMark } from "@/components/brand/brand-mark";

type MarketingHeaderProps = {
  crossPageAnchors?: boolean;
};

export async function MarketingHeader({ crossPageAnchors = false }: MarketingHeaderProps = {}) {
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");

  const featuresHref = crossPageAnchors ? "/marketing#features" : "#features";
  const pricingHref = crossPageAnchors ? "/marketing#pricing" : "#pricing";
  const faqHref = crossPageAnchors ? "/marketing#faq" : "#faq";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative container mx-auto flex h-14 items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center">
          <BrandMark
            size="md"
            showWordmark
            abbr={tCommon("appNameAbbr")}
            wordmark={tCommon("appName")}
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
          <Link
            href={featuresHref}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.features")}
          </Link>
          <Link
            href={pricingHref}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.pricing")}
          </Link>
          <Link
            href={faqHref}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("nav.faq")}
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <LocaleSwitcher className="hidden sm:flex" />
          <Link
            href="/sign-in"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            href="/activate"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-2.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:px-4"
          >
            {t("nav.getStarted")}
          </Link>
          <MarketingMobileNav
            featuresHref={featuresHref}
            pricingHref={pricingHref}
            faqHref={faqHref}
            labels={{
              menu: t("nav.menu"),
              close: t("nav.close"),
              features: t("nav.features"),
              pricing: t("nav.pricing"),
              faq: t("nav.faq"),
              signIn: t("nav.signIn"),
            }}
          />
        </div>
      </div>
    </header>
  );
}

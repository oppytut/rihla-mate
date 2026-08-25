import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { BrandMark } from "@/components/brand/brand-mark";
import { bureauAbbr, getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname, staffSignInHrefForHost } from "@/lib/site-mode";

type MarketingFooterProps = {
  crossPageAnchors?: boolean;
  variant?: "full" | "simple" | "bureau";
};

export async function MarketingFooter({
  crossPageAnchors = false,
  variant = "full",
}: MarketingFooterProps = {}) {
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const year = new Intl.NumberFormat(locale === "ar" ? "ar-SA" : "en-US", {
    useGrouping: false,
  }).format(new Date().getFullYear());
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  const bureau = variant === "bureau" || (variant !== "simple" && isBureauHostname(hostname));
  const bureauName = bureau
    ? ((await getBureauDisplayName()) ?? t("bureau.title"))
    : tCommon("appName");
  const signInHref = staffSignInHrefForHost(hostname);
  const signInExternal = signInHref.startsWith("http");

  const featuresHref = crossPageAnchors ? "/marketing#features" : "#features";
  const pricingHref = crossPageAnchors ? "/marketing#pricing" : "#pricing";
  const faqHref = crossPageAnchors ? "/marketing#faq" : "#faq";

  if (variant === "simple") {
    return (
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <BrandMark
                size="sm"
                abbr={bureau ? bureauAbbr(bureauName) : tCommon("appNameAbbr")}
              />
              <span className="text-sm text-muted-foreground">
                {bureau
                  ? t("bureau.copyright", { year, name: bureauName })
                  : t("footer.copyright", { year })}
              </span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <LocaleSwitcher />
              <Link
                href={bureau ? "/packages" : "/marketing"}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {bureau ? t("nav.packages") : t("nav.features")}
              </Link>
              {signInExternal ? (
                <a
                  href={signInHref}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("nav.tryDemo")}
                </a>
              ) : (
                <Link
                  href="/sign-in"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {t("nav.signIn")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </footer>
    );
  }

  if (bureau) {
    return (
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto w-full max-w-[1920px] px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <BrandMark
                size="sm"
                showWordmark
                abbr={bureauAbbr(bureauName)}
                wordmark={bureauName}
                wordmarkClassName="text-base"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
              <LocaleSwitcher />
              <Link
                href="/packages"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.packages")}
              </Link>
              <Link
                href="/about"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.about")}
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.contact")}
              </Link>
              <Link
                href="/sign-in"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.staffSignIn")}
              </Link>
            </div>
          </div>
          <div className="mt-6 border-t border-border/40 pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              {t("bureau.copyright", { year, name: bureauName })}
            </p>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-border/40 py-8">
      <div className="mx-auto w-full max-w-[1680px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <BrandMark
              size="sm"
              showWordmark
              abbr={tCommon("appNameAbbr")}
              wordmark={tCommon("appName")}
              wordmarkClassName="text-base"
            />
            <p className="text-xs text-muted-foreground">{t("footer.tagline")}</p>
          </div>
          <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end sm:gap-6">
            <LocaleSwitcher />
            <nav
              className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
              aria-label="Footer"
            >
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
              <Link
                href="/guide"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("nav.guide")}
              </Link>
              <a
                href="mailto:hello@rihla-mate.com"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("footer.contact")}
              </a>
            </nav>
          </div>
        </div>
        <div className="mt-6 border-t border-border/40 pt-6 text-center">
          <p className="text-sm text-foreground/70">{t("footer.copyright", { year })}</p>
        </div>
      </div>
    </footer>
  );
}

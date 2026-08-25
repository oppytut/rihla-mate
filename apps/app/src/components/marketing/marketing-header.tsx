import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "./locale-switcher";
import { MarketingMobileNav } from "./marketing-mobile-nav";
import { BrandMark } from "@/components/brand/brand-mark";
import { bureauAbbr, getBureauDisplayName } from "@/lib/bureau-brand";
import { hostnameFromHostHeader, isBureauHostname, staffSignInHrefForHost } from "@/lib/site-mode";

type MarketingHeaderProps = {
  crossPageAnchors?: boolean;
  variant?: "product" | "bureau";
  whatsappHref?: string | null;
};

export async function MarketingHeader({
  crossPageAnchors = false,
  variant,
  whatsappHref,
}: MarketingHeaderProps = {}) {
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const hostname = hostnameFromHostHeader((await headers()).get("host"));
  const bureau = variant === "bureau" || (variant !== "product" && isBureauHostname(hostname));
  const bureauName = bureau
    ? ((await getBureauDisplayName()) ?? t("bureau.title"))
    : tCommon("appName");
  const signInHref = staffSignInHrefForHost(hostname);
  const signInExternal = signInHref.startsWith("http");

  const featuresHref = crossPageAnchors ? "/marketing#features" : "#features";
  const pricingHref = crossPageAnchors ? "/marketing#pricing" : "#pricing";
  const faqHref = crossPageAnchors ? "/marketing#faq" : "#faq";

  const bureauLinks = [
    { href: "/packages", label: t("nav.packages") },
    { href: "/about", label: t("nav.about") },
    { href: "/#how", label: t("nav.howToBook") },
    { href: "/#contact", label: t("nav.contact") },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div
        className={
          bureau
            ? "relative mx-auto flex h-14 w-full max-w-[1920px] items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-10 xl:px-16"
            : "relative mx-auto flex h-14 w-full max-w-[1680px] items-center justify-between gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6 lg:px-8 xl:px-10"
        }
      >
        <Link href="/" className="flex shrink-0 items-center">
          <BrandMark
            size="md"
            showWordmark
            abbr={bureau ? bureauAbbr(bureauName) : tCommon("appNameAbbr")}
            wordmark={bureauName}
          />
        </Link>

        {bureau ? (
          <nav className="hidden items-center gap-6 md:flex" aria-label="Primary">
            {bureauLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : (
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
            <Link
              href="/guide"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.guide")}
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-1.5 sm:gap-3">
          <LocaleSwitcher className="hidden sm:flex" />
          {bureau ? (
            <Link
              href="/sign-in"
              className="hidden text-xs font-medium text-muted-foreground/80 transition-colors hover:text-muted-foreground sm:inline"
            >
              {t("nav.staffSignIn")}
            </Link>
          ) : signInExternal ? (
            <a
              href={signInHref}
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {t("nav.tryDemo")}
            </a>
          ) : (
            <Link
              href="/sign-in"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {t("nav.signIn")}
            </Link>
          )}
          {bureau ? (
            whatsappHref ? (
              <a
                href={whatsappHref}
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:px-5"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("bureau.whatsappCta")}
              </a>
            ) : (
              <Link
                href="/packages"
                className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:px-5"
              >
                {t("nav.packages")}
              </Link>
            )
          ) : (
            <Link
              href="/activate"
              className="hidden h-10 items-center justify-center rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 sm:inline-flex sm:px-5"
            >
              {t("nav.getStarted")}
            </Link>
          )}
          <MarketingMobileNav
            featuresHref={featuresHref}
            pricingHref={pricingHref}
            faqHref={faqHref}
            extraLinks={bureau ? bureauLinks : undefined}
            hideProductAnchors={bureau}
            labels={{
              menu: t("nav.menu"),
              close: t("nav.close"),
              features: bureau ? "" : t("nav.features"),
              pricing: bureau ? "" : t("nav.pricing"),
              faq: bureau ? "" : t("nav.faq"),
              guide: bureau ? "" : t("nav.guide"),
              signIn: bureau
                ? t("nav.staffSignIn")
                : signInExternal
                  ? t("nav.tryDemo")
                  : t("nav.signIn"),
              signInHref: bureau ? "/sign-in" : signInHref,
              getStarted: bureau ? undefined : t("nav.getStarted"),
            }}
          />
        </div>
      </div>
    </header>
  );
}

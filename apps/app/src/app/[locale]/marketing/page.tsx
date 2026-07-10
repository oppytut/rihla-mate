import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "./_sections/hero";
import { FeaturesSection } from "./_sections/features";
import { HowItWorksSection } from "./_sections/how-it-works";
import { PricingSection } from "./_sections/pricing";
import { TestimonialsSection } from "./_sections/testimonials";
import { FaqSection } from "./_sections/faq";
import { CtaFooterSection } from "./_sections/cta-footer";

export default async function MarketingPage() {
  const t = await getTranslations("common");

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                {t("common.appNameAbbr")}
              </span>
            </div>
            <span className="font-semibold text-lg text-foreground">{t("common.appName")}</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.features")}
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.pricing")}
            </Link>
            <Link
              href="#faq"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.faq")}
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("nav.signIn")}
            </Link>
            <Link
              href="/sign-in"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              {t("nav.getStarted")}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaFooterSection />
      </main>
    </div>
  );
}

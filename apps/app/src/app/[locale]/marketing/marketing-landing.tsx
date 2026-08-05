import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { HeroSection } from "./_sections/hero";
import { TrustBadgesSection } from "./_sections/trust-badges";
import { FeaturesSection } from "./_sections/features";
import { HowItWorksSection } from "./_sections/how-it-works";
import { PricingSection } from "./_sections/pricing";
import { TestimonialsSection } from "./_sections/testimonials";
import { FaqSection } from "./_sections/faq";
import { CtaBand } from "./_sections/cta-footer";

export function MarketingLanding() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <main className="flex-1">
        <HeroSection />
        <TrustBadgesSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <FaqSection />
        <CtaBand />
      </main>
      <MarketingFooter />
    </div>
  );
}

import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { marketingShellClass } from "@/app/[locale]/marketing/_sections/section-wrapper";
import { BureauPackageGrid } from "@/app/[locale]/bureau-package-grid";

export type BureauPackageCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  durationDays: number;
  price: string;
  currency: string;
  departureCity: string | null;
  category: string | null;
};

type BureauLandingProps = {
  packages: BureauPackageCard[];
  cmsTitle?: string | null;
  cmsBody?: string | null;
};

export async function BureauLanding({ packages, cmsTitle, cmsBody }: BureauLandingProps) {
  const t = await getTranslations("marketing.bureau");

  return (
    <div className="flex min-h-0 flex-col bg-background">
      <MarketingHeader variant="bureau" />
      <main>
        <section className="border-b border-border/40 bg-muted/30">
          <div className={`${marketingShellClass} py-12 lg:py-16`}>
            <p className="mb-3 text-sm font-medium text-primary">{t("heroEyebrow")}</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {cmsTitle?.trim() || t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {cmsBody?.trim() || t("heroLead")}
            </p>
            <Link
              href="/packages"
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              {t("ctaPackages")}
            </Link>
          </div>
        </section>

        <section id="packages" className={`${marketingShellClass} py-12`}>
          {packages.length === 0 ? (
            <div className="max-w-xl">
              <p className="text-sm text-muted-foreground">{t("emptyPackages")}</p>
              <a
                href="#contact"
                className="mt-4 inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("contactLead")}
              </a>
            </div>
          ) : (
            <BureauPackageGrid packages={packages} />
          )}
        </section>

        <section id="how" className="border-t border-border/40 bg-muted/20">
          <div className={`${marketingShellClass} py-12`}>
            <h2 className="text-xl font-semibold text-foreground">{t("howTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("howLead")}</p>
          </div>
        </section>

        <section id="contact" className={`${marketingShellClass} py-12`}>
          <p className="text-sm text-muted-foreground">{t("contactLead")}</p>
        </section>
      </main>
      <MarketingFooter variant="bureau" />
    </div>
  );
}

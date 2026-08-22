import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { formatPrice } from "@/lib/utils/format";

export type BureauPackageCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  durationDays: number;
  price: string;
  currency: string;
  departureCity: string | null;
};

type BureauLandingProps = {
  packages: BureauPackageCard[];
  cmsTitle?: string | null;
  cmsBody?: string | null;
};

export async function BureauLanding({ packages, cmsTitle, cmsBody }: BureauLandingProps) {
  const t = await getTranslations("marketing.bureau");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader variant="bureau" />
      <main className="flex-1">
        <section className="border-b border-border/40 bg-muted/30">
          <div className="container mx-auto px-4 py-12 lg:px-8 lg:py-16">
            <p className="mb-3 text-sm font-medium text-primary">{t("heroEyebrow")}</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {cmsTitle?.trim() || t("heroTitle")}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {cmsBody?.trim() || t("heroLead")}
            </p>
            <Link
              href="/packages"
              className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              {t("ctaPackages")}
            </Link>
          </div>
        </section>

        <section id="packages" className="container mx-auto px-4 py-12 lg:px-8">
          {packages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyPackages")}</p>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <li
                  key={pkg.id}
                  className="flex flex-col rounded-lg border border-border/60 bg-card p-5 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-foreground">{pkg.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("durationDays", { days: pkg.durationDays })}
                    {pkg.departureCity ? ` · ${pkg.departureCity}` : ""}
                  </p>
                  {pkg.description ? (
                    <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                      {pkg.description}
                    </p>
                  ) : null}
                  <p className="mt-4 text-sm font-medium text-foreground">
                    {t("fromPrice")} {formatPrice(pkg.price, pkg.currency)}
                  </p>
                  <Link
                    href={`/packages/${pkg.slug}`}
                    className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {t("viewPackage")}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section id="how" className="border-t border-border/40 bg-muted/20">
          <div className="container mx-auto px-4 py-12 lg:px-8">
            <h2 className="text-xl font-semibold text-foreground">{t("howTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("howLead")}</p>
          </div>
        </section>

        <section id="contact" className="container mx-auto px-4 py-12 lg:px-8">
          <p className="text-sm text-muted-foreground">{t("contactLead")}</p>
        </section>
      </main>
      <MarketingFooter variant="bureau" />
    </div>
  );
}

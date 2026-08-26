import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { bureauShellClass } from "@/app/[locale]/marketing/_sections/section-wrapper";
import Image from "next/image";
import { BureauPackageGrid } from "@/app/[locale]/bureau-package-grid";
import { BureauWhatsAppFab } from "@/components/marketing/bureau-whatsapp-fab";
import { whatsappHref, type BureauPublicContact } from "@/lib/bureau-contact";
import {
  filledGallery,
  filledTestimonials,
  filledTextItems,
  type BureauHomeSections,
} from "@/lib/bureau-home-sections";

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
  contact?: BureauPublicContact | null;
  homeSections?: BureauHomeSections | null;
  variant?: "home" | "catalog";
};

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1200&q=80",
    alt: "Makkah",
  },
  {
    src: "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
    alt: "Madinah",
  },
  {
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    alt: "Hotel",
  },
  {
    src: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
    alt: "Nabawi",
  },
] as const;

const WHY_KEYS = ["hotel", "guide", "schedule", "office"] as const;
const HOW_KEYS = ["choose", "details", "deposit"] as const;
const TESTIMONIAL_KEYS = ["one", "two"] as const;

export async function BureauLanding({
  packages,
  cmsTitle,
  cmsBody,
  contact,
  homeSections,
  variant = "home",
}: BureauLandingProps) {
  const t = await getTranslations("marketing.bureau");
  const wa = whatsappHref(contact?.phone ?? null);
  const catalog = variant === "catalog";
  const whyItems = filledTextItems(homeSections?.whyItems ?? []);
  const howSteps = filledTextItems(homeSections?.howSteps ?? []);
  const galleryItems = filledGallery(homeSections?.gallery ?? []);
  const testimonials = filledTestimonials(homeSections?.testimonials ?? []);

  return (
    <div className="flex min-h-0 flex-col bg-background">
      <MarketingHeader variant="bureau" whatsappHref={wa} />
      <main>
        {catalog ? (
          <section className="border-b border-border/40 bg-muted/20">
            <div className={`${bureauShellClass} py-10 lg:py-12`}>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {t("catalogTitle")}
              </h1>
              <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t("catalogLead")}</p>
            </div>
          </section>
        ) : (
          <section className="relative min-h-[28rem] overflow-hidden border-b border-border/40 lg:min-h-[36rem]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=2400&q=80)",
              }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25"
              aria-hidden
            />
            <div
              className={`relative ${bureauShellClass} flex min-h-[28rem] flex-col justify-end py-16 lg:min-h-[36rem] lg:py-24`}
            >
              <p className="mb-3 text-sm font-medium tracking-wide text-amber-200/90">
                {t("heroEyebrow")}
              </p>
              <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                {cmsTitle?.trim() || t("heroTitle")}
              </h1>
              <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base text-white/85 sm:text-lg">
                {cmsBody?.trim() || t("heroLead")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/packages"
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  {t("ctaPackages")}
                </Link>
                {wa ? (
                  <a
                    href={wa}
                    className="inline-flex min-h-11 items-center rounded-md border border-white/40 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {t("whatsappCta")}
                  </a>
                ) : null}
              </div>
              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(["trustPpiu", "trustHotel", "trustMutawwif", "trustQuota"] as const).map(
                  (key) => (
                    <li
                      key={key}
                      className="rounded-md border border-white/15 bg-black/35 px-3 py-2 text-sm text-white/90 backdrop-blur-sm"
                    >
                      {t(key)}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        )}

        <section id="packages" className={`${bureauShellClass} py-12`}>
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
            <BureauPackageGrid packages={packages} showCityFilter showDurationFilter />
          )}
        </section>

        {catalog ? null : (
          <>
            <section id="why" className="border-t border-border/40 bg-muted/20">
              <div className={`${bureauShellClass} py-12`}>
                <h2 className="text-xl font-semibold text-foreground">
                  {homeSections?.whyTitle.trim() || t("whyTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {homeSections?.whyLead.trim() || t("whyLead")}
                </p>
                <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {(whyItems.length > 0
                    ? whyItems.map((item, index) => ({
                        key: `cms-why-${index}`,
                        title: item.title,
                        body: item.body,
                      }))
                    : WHY_KEYS.map((key) => ({
                        key,
                        title: t(`whyItems.${key}.title`),
                        body: t(`whyItems.${key}.body`),
                      }))
                  ).map((item) => (
                    <li key={item.key} className="rounded-lg border border-border/60 bg-card p-5">
                      <h3 className="font-medium text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="how" className="border-t border-border/40">
              <div className={`${bureauShellClass} py-12`}>
                <h2 className="text-xl font-semibold text-foreground">
                  {homeSections?.howTitle.trim() || t("howTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {homeSections?.howLead.trim() || t("howLead")}
                </p>
                <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                  {(howSteps.length > 0
                    ? howSteps.map((item, index) => ({
                        key: `cms-how-${index}`,
                        title: item.title,
                        body: item.body,
                      }))
                    : HOW_KEYS.map((key) => ({
                        key,
                        title: t(`howSteps.${key}.title`),
                        body: t(`howSteps.${key}.body`),
                      }))
                  ).map((item, index) => (
                    <li key={item.key} className="rounded-lg border border-border/60 bg-card p-5">
                      <p className="text-sm font-medium text-primary">{index + 1}</p>
                      <h3 className="mt-2 font-medium text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <section id="gallery" className="border-t border-border/40 bg-muted/20">
              <div className={`${bureauShellClass} py-12`}>
                <h2 className="text-xl font-semibold text-foreground">
                  {homeSections?.galleryTitle.trim() || t("galleryTitle")}
                </h2>
                <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {(galleryItems.length > 0 ? galleryItems : GALLERY).map((item) => (
                    <li
                      key={item.src}
                      className="overflow-hidden rounded-lg border border-border/60"
                    >
                      <Image
                        src={item.src}
                        alt={item.alt}
                        width={600}
                        height={400}
                        className="h-48 w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section id="testimonials" className="border-t border-border/40">
              <div className={`${bureauShellClass} py-12`}>
                <h2 className="text-xl font-semibold text-foreground">
                  {homeSections?.testimonialsTitle.trim() || t("testimonialsTitle")}
                </h2>
                <ul className="mt-6 grid gap-6 sm:grid-cols-2">
                  {(testimonials.length > 0
                    ? testimonials.map((item, index) => ({
                        key: `cms-tes-${index}`,
                        quote: item.quote,
                        name: item.name,
                      }))
                    : TESTIMONIAL_KEYS.map((key) => ({
                        key,
                        quote: t(`testimonials.${key}.quote`),
                        name: t(`testimonials.${key}.name`),
                      }))
                  ).map((item) => (
                    <li key={item.key} className="rounded-lg border border-border/60 bg-card p-5">
                      <p className="text-sm text-foreground">{item.quote}</p>
                      <p className="mt-3 text-sm font-medium text-muted-foreground">{item.name}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </>
        )}

        <section id="contact" className={`${bureauShellClass} py-12`}>
          <p className="text-sm text-muted-foreground">{t("contactLead")}</p>
          {contact?.address ? (
            <p className="mt-3 text-sm text-foreground">{contact.address}</p>
          ) : null}
          {contact?.email ? (
            <p className="mt-1 text-sm">
              <a
                className="text-primary underline-offset-4 hover:underline"
                href={`mailto:${contact.email}`}
              >
                {contact.email}
              </a>
            </p>
          ) : null}
          {contact?.phone ? <p className="mt-1 text-sm text-foreground">{contact.phone}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground">{t("contactHours")}</p>
          {wa ? (
            <a
              href={wa}
              className="mt-4 inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              rel="noopener noreferrer"
              target="_blank"
            >
              {t("whatsappCta")}
            </a>
          ) : null}
        </section>
      </main>
      <MarketingFooter variant="bureau" />
      {wa ? <BureauWhatsAppFab href={wa} label={t("whatsappCta")} /> : null}
    </div>
  );
}

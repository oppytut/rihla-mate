import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import {
  bureauInnerClass,
  bureauShellClass,
} from "@/app/[locale]/marketing/_sections/section-wrapper";
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

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=2400&q=80";

const GALLERY = [
  {
    src: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80",
    alt: "Masjidil Haram, Makkah",
  },
  {
    src: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1200&q=80",
    alt: "Kaabah, Makkah",
  },
  {
    src: "https://images.unsplash.com/photo-1580418827493-f2b22c0dc311?auto=format&fit=crop&w=1200&q=80",
    alt: "Masjid Nabawi, Madinah",
  },
  {
    src: "https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=1200&q=80",
    alt: "Suasana masjid",
  },
] as const;

const WHY_KEYS = ["hotel", "guide", "schedule", "office"] as const;
const HOW_KEYS = ["choose", "details", "deposit"] as const;
const TESTIMONIAL_KEYS = ["one", "two", "three"] as const;

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
              <div className={bureauInnerClass}>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {t("catalogTitle")}
                </h1>
                <p className="mt-3 max-w-2xl text-base text-muted-foreground">{t("catalogLead")}</p>
              </div>
            </div>
          </section>
        ) : (
          <section className="relative min-h-[28rem] overflow-hidden border-b border-border/40 lg:min-h-[70vh]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${HERO_IMAGE})` }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30"
              aria-hidden
            />
            <div
              className={`relative ${bureauShellClass} flex min-h-[28rem] flex-col justify-end py-16 lg:min-h-[70vh] lg:py-24`}
            >
              <div className={bureauInnerClass}>
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
                      className="hidden min-h-11 items-center rounded-md border border-white/40 bg-white/10 px-5 text-sm font-medium text-white backdrop-blur hover:bg-white/20 lg:inline-flex"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {t("whatsappCta")}
                    </a>
                  ) : null}
                </div>
                <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {(["trustPpiu", "trustHotel", "trustMutawwif", "trustQuota"] as const).map(
                    (key) => (
                      <li
                        key={key}
                        className="rounded-md border border-white/20 bg-black/60 px-3 py-2 text-sm text-white backdrop-blur-sm"
                      >
                        {t(key)}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </div>
          </section>
        )}

        <section id="packages" className={`${bureauShellClass} py-12`}>
          <div className={bureauInnerClass}>
            {catalog ? null : (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-foreground">{t("packagesTitle")}</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("packagesLead")}</p>
              </div>
            )}
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
          </div>
        </section>

        {catalog ? null : (
          <>
            <section id="why" className="border-t border-border/40 bg-muted/20">
              <div className={`${bureauShellClass} py-12`}>
                <div className={bureauInnerClass}>
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
              </div>
            </section>

            <section id="how" className="border-t border-border/40">
              <div className={`${bureauShellClass} py-12`}>
                <div className={bureauInnerClass}>
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
              </div>
            </section>

            <section id="gallery" className="border-t border-border/40 bg-muted/20">
              <div className={`${bureauShellClass} py-12`}>
                <div className={bureauInnerClass}>
                  <h2 className="text-xl font-semibold text-foreground">
                    {homeSections?.galleryTitle.trim() || t("galleryTitle")}
                  </h2>
                  <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                    {(galleryItems.length > 0 ? galleryItems : GALLERY).map((item, index) => (
                      <li
                        key={item.src}
                        className={`relative overflow-hidden rounded-lg border border-border/60 ${index === 0 ? "sm:col-span-2" : ""}`}
                      >
                        <Image
                          src={item.src}
                          alt={item.alt}
                          width={index === 0 ? 1200 : 600}
                          height={index === 0 ? 640 : 400}
                          className={`w-full object-cover ${index === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
                        />
                        {item.alt ? (
                          <p className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-sm text-white">
                            {item.alt}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section id="testimonials" className="border-t border-border/40">
              <div className={`${bureauShellClass} py-12`}>
                <div className={bureauInnerClass}>
                  <h2 className="text-xl font-semibold text-foreground">
                    {homeSections?.testimonialsTitle.trim() || t("testimonialsTitle")}
                  </h2>
                  <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
                    ).map((item) => {
                      const initial = item.name.trim().charAt(0).toUpperCase() || "?";
                      return (
                        <li
                          key={item.key}
                          className="rounded-lg border border-border/60 bg-card p-5"
                        >
                          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                            {initial}
                          </div>
                          <p className="text-base text-foreground">{item.quote}</p>
                          <p className="mt-3 text-sm font-medium text-muted-foreground">
                            {item.name}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}

        <section id="contact" className={`${bureauShellClass} py-12`}>
          <div className={`${bureauInnerClass} grid gap-8 lg:grid-cols-2 lg:items-center`}>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{t("contactTitle")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("contactLead")}</p>
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
              {contact?.phone ? (
                <p className="mt-1 text-sm text-foreground">{contact.phone}</p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground">{t("contactHours")}</p>
            </div>
            {wa ? (
              <a
                href={wa}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground lg:min-h-24"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t("whatsappCta")}
              </a>
            ) : null}
          </div>
        </section>
      </main>
      <MarketingFooter variant="bureau" />
      {wa ? <BureauWhatsAppFab href={wa} label={t("whatsappCta")} /> : null}
    </div>
  );
}

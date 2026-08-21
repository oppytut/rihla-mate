import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

const SECTIONS = [
  "who",
  "start",
  "login",
  "staff",
  "packages",
  "bookings",
  "customers",
  "payments",
  "catalog",
  "cms",
  "analytics",
  "license",
  "settings",
  "tips",
] as const;

export default async function GuidePage() {
  const t = await getTranslations("guide");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader crossPageAnchors />
      <main className="flex-1">
        <div className="border-b border-border/40 bg-muted/30">
          <div className="container mx-auto px-4 py-12 lg:px-8 lg:py-16">
            <p className="mb-3 text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{t("lead")}</p>
          </div>
        </div>

        <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-14">
          <nav className="lg:sticky lg:top-20 lg:self-start" aria-label={t("tocLabel")}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("tocLabel")}
            </p>
            <ol className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-block rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {t(`sections.${id}.nav`)}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-14">
            {SECTIONS.map((id) => {
              const steps = t.raw(`sections.${id}.steps`) as string[] | undefined;
              const notes = t.raw(`sections.${id}.notes`) as string[] | undefined;
              return (
                <section key={id} id={id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {t(`sections.${id}.title`)}
                  </h2>
                  <p className="mt-3 text-muted-foreground">{t(`sections.${id}.body`)}</p>
                  {steps && steps.length > 0 ? (
                    <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-foreground/90 sm:text-base">
                      {steps.map((step) => (
                        <li key={step} className="ps-1">
                          {step}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {notes && notes.length > 0 ? (
                    <ul className="mt-4 space-y-2 rounded-lg border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            })}

            <section className="rounded-xl border border-border/60 bg-muted/30 p-6">
              <h2 className="text-lg font-semibold">{t("cta.title")}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t("cta.body")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/installer"
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t("cta.installer")}
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
                >
                  {t("cta.signIn")}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <MarketingFooter crossPageAnchors />
    </div>
  );
}

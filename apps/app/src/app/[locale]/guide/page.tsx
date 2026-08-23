import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { readGuideSection } from "./guide-section";

const SECTIONS = [
  "who",
  "server",
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
  const sectionBag = t.raw("sections");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader crossPageAnchors />
      <main className="flex-1">
        <div className="border-b border-border/40 border-s-8 border-s-primary bg-muted/30">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 xl:px-10">
            <p className="mb-3 text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="max-w-3xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">{t("lead")}</p>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-[1680px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-14 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:px-10">
          <nav className="lg:sticky lg:top-20 lg:self-start" aria-label={t("tocLabel")}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground">
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

          <div className="min-w-0 max-w-prose space-y-14 text-base leading-relaxed xl:max-w-none">
            {SECTIONS.map((id) => {
              const { steps, notes, specs } = readGuideSection(sectionBag, id);
              return (
                <section key={id} id={id} className="scroll-mt-24">
                  <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {t(`sections.${id}.title`)}
                  </h2>
                  <p className="mt-3 text-muted-foreground">{t(`sections.${id}.body`)}</p>
                  {specs && specs.length > 0 ? (
                    <div className="mt-4 overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full min-w-[28rem] text-left text-sm">
                        <thead className="border-b border-border/60 bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 font-medium">{t("specCols.item")}</th>
                            <th className="px-3 py-2 font-medium">{t("specCols.min")}</th>
                            <th className="px-3 py-2 font-medium">{t("specCols.rec")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {specs.map((row) => (
                            <tr key={row.item} className="border-b border-border/40 last:border-0">
                              <td className="px-3 py-2 font-medium text-foreground">{row.item}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.min}</td>
                              <td className="px-3 py-2 text-muted-foreground">{row.rec}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
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
                    <ul className="mt-4 space-y-2 rounded-lg border border-s-4 border-border/60 border-s-primary bg-muted/40 p-4 text-sm text-muted-foreground">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              );
            })}

            <section className="rounded-xl bg-primary p-6 text-primary-foreground sm:p-8">
              <h2 className="text-lg font-semibold">{t("cta.title")}</h2>
              <p className="mt-2 text-sm text-primary-foreground/80">{t("cta.body")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/installer"
                  className="inline-flex h-10 items-center rounded-md bg-background px-4 text-sm font-semibold text-foreground hover:bg-background/90"
                >
                  {t("cta.installer")}
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex h-10 items-center rounded-md border border-primary-foreground/30 px-4 text-sm font-medium hover:bg-primary-foreground/10"
                >
                  {t("cta.signIn")}
                </Link>
              </div>
            </section>
          </div>

          <aside className="hidden xl:sticky xl:top-20 xl:block xl:self-start">
            <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("sections.start.nav")}
              </p>
              <pre className="mt-3 overflow-x-auto rounded-lg bg-[oklch(0.22_0.03_165)] p-3 font-mono text-[11px] leading-relaxed text-[oklch(0.93_0.02_85)]">
                {`docker compose up -d`}
              </pre>
            </div>
          </aside>
        </div>
      </main>
      <MarketingFooter crossPageAnchors />
    </div>
  );
}

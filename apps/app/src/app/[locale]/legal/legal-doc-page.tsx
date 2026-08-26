import type { getTranslations } from "next-intl/server";
import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

export function LegalDocPage({ t, sections }: { t: Translator; sections: readonly string[] }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader crossPageAnchors />
      <main className="flex-1">
        <div className="border-b border-border/40 border-s-8 border-s-primary bg-muted/30">
          <div className="mx-auto w-full max-w-[1680px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16 xl:px-10">
            <p className="mb-3 text-sm font-medium text-primary">{t("eyebrow")}</p>
            <h1 className="max-w-5xl text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl xl:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-4xl text-base text-muted-foreground sm:text-lg">{t("lead")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("updated")}</p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[800px] space-y-10 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          {sections.map((id) => (
            <section key={id} id={id} className="scroll-mt-24">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {t(`sections.${id}.title`)}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {t(`sections.${id}.body`)}
              </p>
            </section>
          ))}
        </div>
      </main>
      <MarketingFooter crossPageAnchors />
    </div>
  );
}

import { MarketingHeader } from "@/components/marketing/marketing-header";
import { MarketingFooter } from "@/components/marketing/marketing-footer";
import { marketingShellClass } from "@/app/[locale]/marketing/_sections/section-wrapper";

type BureauCmsPageProps = {
  title: string;
  body: string | null;
};

export function BureauCmsPage({ title, body }: BureauCmsPageProps) {
  return (
    <div className="flex min-h-0 flex-col bg-background">
      <MarketingHeader variant="bureau" />
      <main>
        <article className={`${marketingShellClass} py-12 lg:py-16`}>
          <h1 className="max-w-3xl min-w-0 break-words text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {title}
          </h1>
          {body ? (
            <div className="mt-6 max-w-2xl min-w-0 whitespace-pre-wrap break-words text-base text-muted-foreground sm:text-lg">
              {body}
            </div>
          ) : null}
        </article>
      </main>
      <MarketingFooter variant="bureau" />
    </div>
  );
}

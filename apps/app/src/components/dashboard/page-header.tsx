import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  leading?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleTestId?: string;
};

export function PageHeader({
  title,
  leading,
  description,
  actions,
  className,
  titleTestId = "page-heading",
}: PageHeaderProps) {
  return (
    <header className={cn("border-b border-border bg-card px-4 py-6 lg:px-8", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {leading ? <div className="mb-2">{leading}</div> : null}
          <h1
            className="text-2xl font-semibold tracking-tight text-foreground"
            data-testid={titleTestId}
          >
            {title}
          </h1>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

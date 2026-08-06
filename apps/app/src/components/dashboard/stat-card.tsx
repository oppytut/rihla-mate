import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  loading?: boolean;
  icon?: LucideIcon;
  className?: string;
  "data-testid"?: string;
};

export function StatCard({
  label,
  value,
  loading = false,
  icon: Icon,
  className,
  "data-testid": testId,
}: StatCardProps) {
  return (
    <Card
      data-testid={testId}
      className={cn("gap-0 py-4 shadow-sm ring-1 ring-black/5 dark:ring-white/5", className)}
    >
      <CardContent className="flex items-start gap-3 px-4">
        {Icon ? (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="mt-1 h-8 w-24 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-1 truncate text-2xl font-semibold tracking-tight text-foreground">
              {value}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

type ProductMockProps = {
  className?: string;
};

export function ProductMock({ className }: ProductMockProps) {
  const t = useTranslations("marketing.hero.mock");
  const locale = useLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-lg scale-[0.96] sm:scale-100 lg:max-w-none",
        className,
      )}
      aria-hidden
      dir={dir}
    >
      <div
        className="absolute -inset-4 -z-10 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,oklch(0.42_0.09_165_/_0.12),transparent_70%)] blur-2xl"
        aria-hidden
      />
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl shadow-primary/10 ring-1 ring-primary/5">
        <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-3 py-2">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-accent" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          </span>
          <div className="ms-2 flex-1 truncate rounded-md border border-border/40 bg-background/80 px-2.5 py-1 text-[10px] text-muted-foreground sm:text-xs">
            {t("browserTitle")}
          </div>
        </div>

        <div className="flex min-h-[300px] sm:min-h-[360px]">
          <aside className="hidden w-[92px] shrink-0 flex-col gap-1 border-e border-border/40 bg-primary/[0.04] p-2.5 sm:flex">
            <div className="mb-2 truncate px-1.5 text-[10px] font-semibold tracking-tight text-primary">
              {t("sidebarBrand")}
            </div>
            <MockNavItem active>{t("navDashboard")}</MockNavItem>
            <MockNavItem>{t("navBookings")}</MockNavItem>
            <MockNavItem>{t("navPackages")}</MockNavItem>
            <MockNavItem>{t("navSettings")}</MockNavItem>
            <div className="mt-auto rounded-md border border-border/40 bg-background/70 p-1.5">
              <div className="h-1 w-full rounded-full bg-muted">
                <div className="h-1 w-2/3 rounded-full bg-primary/70" />
              </div>
              <p className="mt-1 truncate text-[8px] text-muted-foreground">{t("chartLabel")}</p>
            </div>
          </aside>

          <div className="flex flex-1 flex-col gap-2.5 p-2.5 sm:gap-3 sm:p-4">
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              <MockStat
                label={t("statBookings")}
                value={t("statBookingsValue")}
                trend={t("statTrend")}
              />
              <MockStat
                label={t("statRevenue")}
                value={t("statRevenueValue")}
                accent
                trend={t("statTrend")}
              />
              <MockStat label={t("statPending")} value={t("statPendingValue")} />
            </div>

            <div className="flex items-end gap-1 rounded-lg border border-border/40 bg-muted/20 px-2.5 py-2">
              {[40, 55, 48, 70, 62, 78, 85].map((h, i) => (
                <span
                  key={i}
                  className={cn("flex-1 rounded-sm", i === 6 ? "bg-primary/80" : "bg-primary/25")}
                  style={{ height: `${h * 0.28}px` }}
                />
              ))}
              <span className="ms-1 self-center text-[9px] font-medium text-muted-foreground">
                {t("chartLabel")}
              </span>
            </div>

            <div className="flex-1 overflow-hidden rounded-lg border border-border/50 bg-background/60">
              <div className="grid grid-cols-[1.2fr_1.4fr_0.7fr] gap-2 border-b border-border/40 bg-muted/30 px-2.5 py-1.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground sm:text-[10px]">
                <span>{t("tableGuest")}</span>
                <span>{t("tablePackage")}</span>
                <span>{t("tableStatus")}</span>
              </div>
              <MockRow
                guest={t("row1Guest")}
                pkg={t("row1Package")}
                status={t("statusPaid")}
                paid
              />
              <MockRow guest={t("row2Guest")} pkg={t("row2Package")} status={t("statusPending")} />
              <MockRow
                guest={t("row3Guest")}
                pkg={t("row3Package")}
                status={t("statusPaid")}
                paid
              />
              <MockRow
                guest={t("row4Guest")}
                pkg={t("row4Package")}
                status={t("statusConfirmed")}
                confirmed
                last
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute -bottom-3 -end-3 hidden h-16 w-16 rounded-full bg-accent/25 blur-2xl sm:block"
        aria-hidden
      />
    </div>
  );
}

function MockNavItem({
  children,
  active = false,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "truncate rounded-md px-1.5 py-1 text-[9px] font-medium leading-tight",
        active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground",
      )}
    >
      {children}
    </div>
  );
}

function MockStat({
  label,
  value,
  accent = false,
  trend,
}: {
  label: string;
  value: string;
  accent?: boolean;
  trend?: string;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card px-1.5 py-1.5 shadow-sm sm:px-2.5 sm:py-2">
      <p className="truncate text-[9px] text-muted-foreground sm:text-[10px]">{label}</p>
      <p
        className={cn(
          "mt-0.5 truncate text-xs font-bold tracking-tight sm:text-sm",
          accent ? "text-accent-foreground" : "text-foreground",
        )}
      >
        <span className={cn(accent && "rounded px-0.5 text-primary")}>{value}</span>
      </p>
      {trend ? (
        <span className="mt-0.5 block text-[9px] font-semibold text-success">{trend}</span>
      ) : accent ? (
        <span className="mt-1 block h-0.5 w-6 rounded-full bg-accent" aria-hidden />
      ) : null}
    </div>
  );
}

function MockRow({
  guest,
  pkg,
  status,
  paid = false,
  confirmed = false,
  last = false,
}: {
  guest: string;
  pkg: string;
  status: string;
  paid?: boolean;
  confirmed?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[1.2fr_1.4fr_0.7fr] items-center gap-2 px-2.5 py-1.5 text-[10px] sm:py-2 sm:text-xs",
        !last && "border-b border-border/30",
      )}
    >
      <span className="truncate font-medium text-foreground">{guest}</span>
      <span className="truncate text-muted-foreground">{pkg}</span>
      <span
        className={cn(
          "inline-flex w-fit items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold sm:text-[10px]",
          paid
            ? "bg-success/15 text-success"
            : confirmed
              ? "bg-primary/10 text-primary"
              : "bg-accent/25 text-accent-foreground",
        )}
      >
        {status}
      </span>
    </div>
  );
}

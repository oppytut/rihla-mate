"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDateForDisplay, formatPrice } from "@/lib/utils/format";
import { CalendarCheck, Wallet, CircleDollarSign, Clock, Package } from "lucide-react";

const PERIOD_OPTIONS = [
  { value: 7, key: "7d" },
  { value: 30, key: "30d" },
  { value: 90, key: "90d" },
] as const;

export default function AnalyticsPage() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const [days, setDays] = useState(30);

  const summaryQuery = useQuery(trpc.analytics.summary.queryOptions({ days }));

  const data = summaryQuery.data;

  const statCards = [
    {
      label: t("analytics.totalBookings"),
      value: String(data?.totalBookings ?? "0"),
      icon: CalendarCheck,
    },
    {
      label: t("analytics.revenue"),
      value: formatPrice(data?.totalRevenue ?? "0", "IDR", locale),
      icon: Wallet,
    },
    {
      label: t("analytics.paidRevenue"),
      value: formatPrice(data?.paidRevenue ?? "0", "IDR", locale),
      icon: CircleDollarSign,
    },
    {
      label: t("analytics.pendingRevenue"),
      value: formatPrice(data?.pendingRevenue ?? "0", "IDR", locale),
      icon: Clock,
    },
    {
      label: t("analytics.publishedPackages"),
      value: String(data?.publishedPackages ?? "0"),
      icon: Package,
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "border-transparent bg-success/10 text-success";
      case "pending":
        return "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "confirmed":
        return "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled":
        return "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "border-transparent bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <PageHeader
        title={t("analytics.title")}
        description={t("analytics.overview")}
        actions={
          <div
            className="flex gap-1 rounded-lg bg-muted p-1"
            role="group"
            aria-label={t("analytics.period.label")}
            data-testid="analytics-period"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDays(opt.value)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  days === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`analytics.period.${opt.key}`)}
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-6 px-4 py-6 lg:px-8">
        {summaryQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {summaryQuery.error?.message ?? t("analytics.noData")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {statCards.map((stat) => (
                <StatCard
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  loading={summaryQuery.isLoading}
                  icon={stat.icon}
                />
              ))}
            </div>

            {data?.packagesByCategory && data.packagesByCategory.length > 0 && (
              <Card className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                  <CardTitle className="text-base font-semibold">
                    {t("analytics.packagesByCategory")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-4 sm:px-6">
                  <p className="mb-4 text-sm text-muted-foreground">{t("analytics.chartTitle")}</p>
                  <div
                    className="space-y-3"
                    role="img"
                    aria-label={t("analytics.packagesByCategory")}
                  >
                    {data.packagesByCategory.map((item) => {
                      const max = Math.max(...data.packagesByCategory.map((c) => c.count), 1);
                      const pct = Math.round((item.count / max) * 100);
                      return (
                        <div
                          key={item.category}
                          className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3"
                        >
                          <span className="truncate text-sm capitalize text-foreground">
                            {item.category}
                          </span>
                          <div className="h-3 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-right text-sm font-medium tabular-nums text-muted-foreground">
                            {item.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
              <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  {t("analytics.recentBookings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4 sm:px-6">
                {summaryQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                    ))}
                  </div>
                ) : !data?.recentBookings || data.recentBookings.length === 0 ? (
                  <p className="py-4 text-sm text-muted-foreground">{t("analytics.noData")}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-2 text-left font-medium text-muted-foreground">
                            {t("bookings.fields.customerName")}
                          </th>
                          <th className="py-2 text-left font-medium text-muted-foreground">
                            {t("bookings.fields.totalPrice")}
                          </th>
                          <th className="py-2 text-left font-medium text-muted-foreground">
                            {t("bookings.fields.travelers")}
                          </th>
                          <th className="py-2 text-left font-medium text-muted-foreground">
                            {t("bookings.fields.status")}
                          </th>
                          <th className="py-2 text-left font-medium text-muted-foreground">
                            {t("bookings.columns.date")}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.recentBookings.map((booking) => (
                          <tr key={booking.id} className="border-b border-border last:border-0">
                            <td className="py-2.5 text-foreground">{booking.customerName}</td>
                            <td className="py-2.5 text-foreground">
                              {formatPrice(String(booking.totalPrice), "IDR", locale)}
                            </td>
                            <td className="py-2.5 text-foreground">{booking.travelers}</td>
                            <td className="py-2.5">
                              <Badge
                                variant="outline"
                                className={cn("font-medium", statusVariant(booking.status))}
                              >
                                {t(`bookings.status.${booking.status}`)}
                              </Badge>
                            </td>
                            <td className="py-2.5 text-muted-foreground">
                              {formatDateForDisplay(new Date(booking.createdAt), locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}

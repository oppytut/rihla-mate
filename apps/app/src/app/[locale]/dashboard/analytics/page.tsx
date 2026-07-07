"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";

const PERIOD_OPTIONS = [
  { value: 7, key: "7d" },
  { value: 30, key: "30d" },
  { value: 90, key: "90d" },
] as const;

export default function AnalyticsPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const [days, setDays] = useState(30);

  const summaryQuery = useQuery(trpc.analytics.summary.queryOptions({ days }));

  const data = summaryQuery.data;

  const formatCurrency = (value: string) => {
    const num = Number(value);
    if (isNaN(num)) return "Rp 0";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const statCards = [
    {
      label: t("analytics.totalBookings"),
      value: String(data?.totalBookings ?? "0"),
    },
    {
      label: t("analytics.revenue"),
      value: formatCurrency(data?.totalRevenue ?? "0"),
    },
    {
      label: t("analytics.paidRevenue"),
      value: formatCurrency(data?.paidRevenue ?? "0"),
    },
    {
      label: t("analytics.pendingRevenue"),
      value: formatCurrency(data?.pendingRevenue ?? "0"),
    },
    {
      label: t("analytics.publishedPackages"),
      value: String(data?.publishedPackages ?? "0"),
    },
  ];

  const statusVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "confirmed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
              {t("analytics.title")}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t("analytics.overview")}</p>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setDays(opt.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  days === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`analytics.period.${opt.key}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6 space-y-6">
        {summaryQuery.isError ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {summaryQuery.error?.message ?? t("analytics.noData")}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {statCards.map((stat, index) => (
                <div key={index} className="bg-card border border-border rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {summaryQuery.isLoading ? (
                    <div className="mt-1 h-8 w-24 bg-muted rounded animate-pulse" />
                  ) : (
                    <p className="text-2xl font-semibold text-foreground mt-1">{stat.value}</p>
                  )}
                </div>
              ))}
            </div>

            {data?.packagesByCategory && data.packagesByCategory.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-4">
                <h2 className="text-lg font-semibold text-foreground mb-3">
                  {t("analytics.packagesByCategory")}
                </h2>
                <div className="space-y-2">
                  {data.packagesByCategory.map((item) => (
                    <div
                      key={item.category}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <span className="text-sm text-foreground capitalize">{item.category}</span>
                      <span className="text-sm font-medium text-muted-foreground">
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                {t("analytics.recentBookings")}
              </h2>
              {summaryQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : !data?.recentBookings || data.recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">{t("analytics.noData")}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          {t("bookings.fields.customerName")}
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          {t("bookings.fields.totalPrice")}
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          {t("bookings.fields.travelers")}
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          {t("bookings.fields.status")}
                        </th>
                        <th className="text-left py-2 font-medium text-muted-foreground">
                          {t("bookings.columns.date")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentBookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-border last:border-0">
                          <td className="py-2 text-foreground">{booking.customerName}</td>
                          <td className="py-2 text-foreground">
                            {formatCurrency(String(booking.totalPrice))}
                          </td>
                          <td className="py-2 text-foreground">{booking.travelers}</td>
                          <td className="py-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusVariant(booking.status)}`}
                            >
                              {t(`bookings.status.${booking.status}`)}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground">
                            {new Date(booking.createdAt).toLocaleDateString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

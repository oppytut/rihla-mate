"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CalendarCheck,
  Package,
  Users,
  Wallet,
  Plus,
  LayoutList,
  BarChart3,
  Clock,
} from "lucide-react";

function statusVariant(status: string) {
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
}

export default function DashboardPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const statsQuery = useQuery(trpc.dashboard.stats.queryOptions());
  const stats = statsQuery.data;

  const formatCurrency = (value: string | number | null | undefined) => {
    const num = Number(value ?? 0);
    if (isNaN(num)) return "Rp 0";
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  const statCards = [
    {
      label: t("dashboard.overview.totalBookings"),
      value: String(stats?.totalBookings ?? "0"),
      icon: CalendarCheck,
      testId: "stat-card-0",
    },
    {
      label: t("dashboard.overview.activePackages"),
      value: String(stats?.activePackages ?? "0"),
      icon: Package,
      testId: "stat-card-1",
    },
    {
      label: t("dashboard.overview.totalCustomers"),
      value: String(stats?.totalCustomers ?? "0"),
      icon: Users,
      testId: "stat-card-2",
    },
    {
      label: t("dashboard.overview.revenue"),
      value: stats?.revenue ? formatCurrency(stats.revenue) : "Rp 0",
      icon: Wallet,
      testId: "stat-card-3",
    },
  ];

  const quickActions = [
    {
      href: "/dashboard/bookings/new",
      label: t("dashboard.overview.actions.newBooking"),
      icon: Plus,
      testId: "quick-action-new-booking",
    },
    {
      href: "/dashboard/bookings",
      label: t("dashboard.overview.actions.viewBookings"),
      icon: LayoutList,
      testId: "quick-action-bookings",
    },
    {
      href: "/dashboard/packages",
      label: t("dashboard.overview.actions.viewPackages"),
      icon: Package,
      testId: "quick-action-packages",
    },
    {
      href: "/dashboard/analytics",
      label: t("dashboard.overview.actions.viewAnalytics"),
      icon: BarChart3,
      testId: "quick-action-analytics",
    },
  ];

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={
          userQuery.isLoading ? (
            <span className="inline-block h-4 w-40 animate-pulse rounded bg-muted" />
          ) : user ? (
            <>
              {t("dashboard.welcome")}, {user.name}
            </>
          ) : (
            t("dashboard.welcome")
          )
        }
      />

      <div className="space-y-6 px-4 py-6 lg:px-8">
        {userQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {userQuery.error?.message || "Failed to load user data"}
            </p>
          </div>
        ) : statsQuery.isError ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {statsQuery.error?.message || "Failed to load dashboard stats"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <StatCard
                key={stat.testId}
                label={stat.label}
                value={stat.value}
                loading={statsQuery.isLoading}
                icon={stat.icon}
                data-testid={stat.testId}
              />
            ))}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card
            className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5 lg:col-span-2"
            data-testid="dashboard-recent-bookings"
          >
            <CardHeader className="flex flex-row items-center justify-between border-b border-border px-4 py-4 sm:px-6">
              <CardTitle className="text-base font-semibold">
                {t("dashboard.overview.recentBookings")}
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/bookings">{t("dashboard.overview.viewAll")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="px-4 py-4 sm:px-6">
              {statsQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded bg-muted" />
                  ))}
                </div>
              ) : !stats?.recentBookings?.length ? (
                <div className="space-y-3 py-2" data-testid="dashboard-recent-empty">
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.overview.recentEmpty")}
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/bookings/new">
                      {t("dashboard.overview.actions.newBooking")}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 text-left font-medium text-muted-foreground">
                          {t("bookings.fields.customerName")}
                        </th>
                        <th className="py-2 text-left font-medium text-muted-foreground">
                          {t("dashboard.overview.package")}
                        </th>
                        <th className="py-2 text-left font-medium text-muted-foreground">
                          {t("bookings.fields.totalPrice")}
                        </th>
                        <th className="py-2 text-left font-medium text-muted-foreground">
                          {t("bookings.fields.status")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentBookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-border last:border-0">
                          <td className="py-2.5">
                            <Link
                              href={`/dashboard/bookings/${booking.id}`}
                              className="font-medium text-foreground hover:underline"
                            >
                              {booking.customerName}
                            </Link>
                          </td>
                          <td className="py-2.5 text-muted-foreground">
                            {booking.packageTitle ?? "—"}
                          </td>
                          <td className="py-2.5 text-foreground">
                            {formatCurrency(booking.totalPrice)}
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant="outline"
                              className={cn("font-medium", statusVariant(booking.status))}
                            >
                              {t(`bookings.status.${booking.status}`)}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card
              className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              data-testid="dashboard-pending-card"
            >
              <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  {t("dashboard.overview.pendingBookings")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4 sm:px-6">
                {statsQuery.isLoading ? (
                  <div className="h-8 w-16 animate-pulse rounded bg-muted" />
                ) : (
                  <>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                      {stats?.pendingBookings ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("dashboard.overview.pendingHint")}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/dashboard/bookings?status=pending">
                        {t("dashboard.overview.actions.viewPending")}
                      </Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card
              className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              data-testid="dashboard-quick-actions"
            >
              <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  {t("dashboard.overview.quickActions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 px-4 py-4 sm:px-6">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    variant="secondary"
                    className="justify-start gap-2"
                    asChild
                    data-testid={action.testId}
                  >
                    <Link href={action.href}>
                      <action.icon className="size-4" aria-hidden />
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

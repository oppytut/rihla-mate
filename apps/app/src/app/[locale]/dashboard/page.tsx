"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Package, Users, Wallet } from "lucide-react";

export default function DashboardPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const statsQuery = useQuery(trpc.dashboard.stats.queryOptions());

  const statCards = [
    {
      label: t("dashboard.overview.totalBookings"),
      value: String(statsQuery.data?.totalBookings ?? "0"),
      icon: CalendarCheck,
      testId: "stat-card-0",
    },
    {
      label: t("dashboard.overview.activePackages"),
      value: String(statsQuery.data?.activePackages ?? "0"),
      icon: Package,
      testId: "stat-card-1",
    },
    {
      label: t("dashboard.overview.totalCustomers"),
      value: String(statsQuery.data?.totalCustomers ?? "0"),
      icon: Users,
      testId: "stat-card-2",
    },
    {
      label: t("dashboard.overview.revenue"),
      value: statsQuery.data?.revenue
        ? `Rp ${Number(statsQuery.data.revenue).toLocaleString("id-ID")}`
        : "Rp 0",
      icon: Wallet,
      testId: "stat-card-3",
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

        <Card className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
          <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
            <CardTitle className="text-base font-semibold">
              {t("dashboard.overview.quickGlance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4 text-sm text-muted-foreground sm:px-6">
            {t("dashboard.overview.quickGlanceHint")}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

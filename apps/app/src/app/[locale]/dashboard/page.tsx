"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";

export default function DashboardPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const statCards = [
    { label: t("dashboard.overview.totalBookings"), value: "0" },
    { label: t("dashboard.overview.activePackages"), value: "0" },
    { label: t("dashboard.overview.totalCustomers"), value: "0" },
    { label: t("dashboard.overview.revenue"), value: "Rp 0" },
  ];

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
          {t("dashboard.title")}
        </h1>
        {userQuery.isLoading ? (
          <div className="mt-1 h-4 w-40 bg-muted rounded animate-pulse" />
        ) : user ? (
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.welcome")}, {user.name}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">
            {t("dashboard.welcome")}
          </p>
        )}
      </header>

      <div className="px-4 lg:px-8 py-6">
        {userQuery.isError ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {userQuery.error?.message || "Failed to load user data"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <div
                key={index}
                data-testid={`stat-card-${index}`}
                className="bg-card border border-border rounded-lg p-4"
              >
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-semibold text-foreground mt-1">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

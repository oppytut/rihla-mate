"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const navItems = [
    { key: "dashboard", href: "/dashboard", active: true },
    { key: "bookings", href: "/dashboard/bookings", active: false },
    { key: "customers", href: "/dashboard/customers", active: false },
    { key: "packages", href: "/dashboard/packages", active: false },
    { key: "settings", href: "/dashboard/settings", active: false },
    { key: "users", href: "/dashboard/users", active: false },
  ];

  const statCards = [
    { label: t("dashboard.overview.totalBookings"), value: "0" },
    { label: t("dashboard.overview.activePackages"), value: "0" },
    { label: t("dashboard.overview.totalCustomers"), value: "0" },
    { label: t("dashboard.overview.revenue"), value: "Rp 0" },
  ];

  return (
    <div className="min-h-screen bg-background antialiased">
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Rihla Mate</h1>
          <p className="text-xs text-muted-foreground">Travel Agency Platform</p>
        </div>
      </div>

      <div className="flex">
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r border-border">
          <div className="px-4 py-5 border-b border-border">
            <h1 className="text-lg font-semibold text-foreground">Rihla Mate</h1>
            <p className="text-xs text-muted-foreground">Travel Agency Platform</p>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  item.active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                )}
              >
                {t(`dashboard.sidebar.${item.key}`)}
              </a>
            ))}
          </nav>

          <div className="px-3 py-4 border-t border-border">
            {userQuery.isLoading ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-32 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ) : userQuery.isError ? (
              <div className="px-3 py-2">
                <p className="text-sm text-muted-foreground">Not signed in</p>
              </div>
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="px-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.user.signedInAs")}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {user.role || "user"}
                  </span>
                </div>
                <div className="px-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="w-full"
                  >
                    {t("dashboard.user.signOut")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 lg:ml-64">
          <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
            <h1 className="text-2xl font-semibold text-foreground">
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
        </main>
      </div>
    </div>
  );
}

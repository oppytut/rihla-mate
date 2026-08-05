"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { NotificationBanner } from "@/components/notification-banner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

const APP_VERSION = "0.1.0";

const NAV_ITEMS = [
  { key: "dashboard", href: "/dashboard" },
  { key: "bookings", href: "/dashboard/bookings" },
  { key: "customers", href: "/dashboard/customers" },
  { key: "packages", href: "/dashboard/packages" },
  { key: "media", href: "/dashboard/media" },
  { key: "pages", href: "/dashboard/pages" },
  { key: "analytics", href: "/dashboard/analytics" },
  { key: "license", href: "/dashboard/license" },
  { key: "settings", href: "/dashboard/settings" },
  { key: "users", href: "/dashboard/users" },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/dashboard/";
    }
    return pathname.startsWith(href);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    queryClient.invalidateQueries({ queryKey: trpc.user.me.queryKey() });
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background antialiased">
      <NotificationBanner currentVersion={APP_VERSION} />
      <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <BrandMark
          size="sm"
          showWordmark
          abbr={t("common.appNameAbbr")}
          wordmark={t("common.appName")}
        />
      </div>

      <div className="flex">
        <aside className="hidden bg-card border-r border-border lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="border-b border-border px-4 py-5">
            <BrandMark
              size="md"
              showWordmark
              abbr={t("common.appNameAbbr")}
              wordmark={t("common.appName")}
            />
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4" data-testid="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`sidebar-link-${item.key}`}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-primary/20 hover:text-foreground",
                )}
              >
                {t(`dashboard.sidebar.${item.key}`)}
              </Link>
            ))}
          </nav>

          <div className="border-t border-border px-3 py-4">
            {userQuery.isLoading ? (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-2 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ) : userQuery.isError ? (
              <div className="px-3 py-2">
                <p className="text-sm text-muted-foreground">Not signed in</p>
              </div>
            ) : user ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                    {user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs text-muted-foreground">
                    {t("dashboard.user.signedInAs")}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {user.role || "user"}
                  </span>
                </div>
                <div className="px-3">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="sign-out-button"
                    onClick={handleSignOut}
                    className="w-full"
                  >
                    {t("dashboard.user.signOut")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="flex-1 lg:ml-64">{children}</main>
      </div>
    </div>
  );
}

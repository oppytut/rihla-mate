"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { NotificationBanner } from "@/components/notification-banner";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const pathname = usePathname();
  const router = useRouter();

  const userQuery = useQuery(trpc.user.me.queryOptions());
  const user = userQuery.data?.user;

  const isActive = (href: string) => {
    // Strip locale prefix for matching
    const stripped = pathname.replace(/^\/(en|id)/, "") || "/";
    if (href === "/dashboard") {
      return stripped === "/dashboard" || stripped === "/dashboard/";
    }
    return stripped.startsWith(href);
  };

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-background antialiased">
      <NotificationBanner currentVersion={APP_VERSION} />
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

          <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.key}
                href={item.href}
                data-testid={`sidebar-link-${item.key}`}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-primary/20 hover:text-foreground",
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
                    <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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

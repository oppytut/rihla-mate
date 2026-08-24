"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { LocaleSwitcher } from "@/components/marketing/locale-switcher";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { NotificationBanner } from "@/components/notification-banner";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  Package,
  Image,
  FileText,
  BarChart3,
  Key,
  Settings,
  UserCog,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const APP_VERSION = "0.1.0";

const NAV_ITEMS: { key: string; href: string; icon: LucideIcon }[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "bookings", href: "/dashboard/bookings", icon: CalendarCheck },
  { key: "customers", href: "/dashboard/customers", icon: Users },
  { key: "packages", href: "/dashboard/packages", icon: Package },
  { key: "media", href: "/dashboard/media", icon: Image },
  { key: "pages", href: "/dashboard/pages", icon: FileText },
  { key: "analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { key: "license", href: "/dashboard/license", icon: Key },
  { key: "settings", href: "/dashboard/settings", icon: Settings },
  { key: "users", href: "/dashboard/users", icon: UserCog },
];

function NavLinks({
  onNavigate,
  isActive,
  t,
}: {
  onNavigate?: () => void;
  isActive: (href: string) => boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            data-testid={`sidebar-link-${item.key}`}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-primary"
                : "text-muted-foreground hover:bg-primary/10 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{t(`dashboard.sidebar.${item.key}`)}</span>
          </Link>
        );
      })}
    </>
  );
}

function UserFooter({
  user,
  isLoading,
  isError,
  onSignOut,
  t,
}: {
  user:
    | {
        name?: string | null;
        email?: string | null;
        role?: string | null;
      }
    | undefined;
  isLoading: boolean;
  isError: boolean;
  onSignOut: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="flex-1 space-y-1">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-2 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-3 py-2">
        <p className="text-sm text-muted-foreground">{t("dashboard.layout.notSignedIn")}</p>
      </div>
    );
  }

  if (!user) return null;

  return (
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
        <span className="text-xs text-muted-foreground">{t("dashboard.user.signedInAs")}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {user.role || "user"}
        </span>
      </div>
      <div className="px-3">
        <Button
          variant="outline"
          size="sm"
          data-testid="sign-out-button"
          onClick={onSignOut}
          className="w-full gap-2"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
          {t("dashboard.user.signOut")}
        </Button>
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  brandWordmark,
  brandAbbr,
  bureau = false,
}: {
  children: React.ReactNode;
  brandWordmark?: string;
  brandAbbr?: string;
  bureau?: boolean;
}) {
  const t = useTranslations();
  const wordmark = brandWordmark?.trim() || t("common.appName");
  const abbr = brandAbbr?.trim() || t("common.appNameAbbr");
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="min-h-screen bg-background antialiased" data-testid="dashboard-shell">
      <NotificationBanner currentVersion={APP_VERSION} />

      <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 lg:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0"
            aria-expanded={mobileOpen}
            aria-controls="dashboard-mobile-nav"
            aria-label={
              mobileOpen ? t("dashboard.layout.closeMenu") : t("dashboard.layout.openMenu")
            }
            data-testid="dashboard-mobile-menu"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <BrandMark size="sm" showWordmark abbr={abbr} wordmark={wordmark} />
        </div>
        <LocaleSwitcher />
      </div>

      {mobileOpen ? (
        <div
          id="dashboard-mobile-nav"
          className="fixed inset-0 z-40 lg:hidden"
          data-testid="dashboard-mobile-drawer"
        >
          <button
            type="button"
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            aria-label={t("dashboard.layout.closeMenu")}
            onClick={closeMobile}
          />
          <aside className="absolute inset-y-0 start-0 flex w-[min(18rem,85vw)] flex-col border-e border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <BrandMark size="sm" showWordmark abbr={abbr} wordmark={wordmark} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={closeMobile}
                aria-label={t("dashboard.layout.closeMenu")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav
              className="flex-1 space-y-1 overflow-y-auto px-3 py-4"
              data-testid="sidebar-nav-mobile"
            >
              <NavLinks onNavigate={closeMobile} isActive={isActive} t={t} />
            </nav>
            <div className="border-t border-border px-3 py-4">
              <UserFooter
                user={user}
                isLoading={userQuery.isLoading}
                isError={userQuery.isError}
                onSignOut={handleSignOut}
                t={t}
              />
            </div>
          </aside>
        </div>
      ) : null}

      <div className="flex">
        <aside className="hidden bg-card border-r border-border lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <BrandMark size="md" showWordmark abbr={abbr} wordmark={wordmark} />
            <LocaleSwitcher className="shrink-0" />
          </div>

          {bureau ? null : (
            <div className="border-b border-border px-4 py-3">
              <p className="text-xs font-medium text-foreground">
                {t("dashboard.layout.brandName")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t("dashboard.layout.brandSubtitle")}
              </p>
            </div>
          )}

          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" data-testid="sidebar-nav">
            <NavLinks isActive={isActive} t={t} />
          </nav>

          <div className="border-t border-border px-3 py-4">
            <UserFooter
              user={user}
              isLoading={userQuery.isLoading}
              isError={userQuery.isError}
              onSignOut={handleSignOut}
              t={t}
            />
          </div>
        </aside>

        <main className="min-w-0 flex-1 lg:ml-64">{children}</main>
      </div>
    </div>
  );
}

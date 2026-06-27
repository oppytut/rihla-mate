"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

export default function PackagesPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = `${t("packages.title")} - Rihla Mate`;
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [t]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  const packagesQuery = useQuery(
    trpc.packages.list.queryOptions({
      search: debouncedSearch || undefined,
      status: status || undefined,
      page,
      limit: PAGE_SIZE,
    })
  );

  const deleteMutation = useMutation(
    trpc.packages.delete.mutationOptions({
      onSuccess: () => {
        window.alert(t("packages.deleteSuccess"));
        packagesQuery.refetch();
      },
      onError: (error) => {
        window.alert(`${t("common.error")}: ${error.message}`);
      },
    })
  );

  const packages = packagesQuery.data?.items ?? [];
  const total = packagesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = search !== "" || status !== "";

  const formatPrice = (price: string | number, currency: string = "IDR") => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const getStatusBadgeClass = (pkgStatus: string) => {
    switch (pkgStatus) {
      case "published":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "draft":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "archived":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDelete = (pkgId: string) => {
    if (window.confirm(t("packages.deleteConfirm"))) {
      deleteMutation.mutate({ id: pkgId });
    }
  };

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

          <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
            {[
              { key: "dashboard", href: "/dashboard", active: false },
              { key: "bookings", href: "/dashboard/bookings", active: false },
              { key: "packages", href: "/dashboard/packages", active: true },
              { key: "settings", href: "/dashboard/settings", active: false },
              { key: "users", href: "/dashboard/users", active: false },
            ].map((item) => (
              <Link
                key={item.key}
                href={item.href}
                data-testid={`sidebar-link-${item.key}`}
                className={cn(
                  "flex items-center px-3 py-2 text-sm rounded-md transition-colors",
                  item.active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-primary/20 hover:text-foreground"
                )}
              >
                {t(`dashboard.sidebar.${item.key}`)}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 lg:ml-64">
          <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
                {t("packages.title")}
              </h1>
              <Button asChild data-testid="packages-add-new">
                <Link href="/dashboard/packages/new">
                  {t("packages.addPackage")}
                </Link>
              </Button>
            </div>
          </header>

          <div className="px-4 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                data-testid="packages-search"
                placeholder={t("packages.search")}
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label={t("packages.search")}
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                data-testid="packages-status-filter"
                aria-label={t("packages.allStatus")}
                className="px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              >
                <option value="">{t("packages.allStatus")}</option>
                <option value="draft">{t("packages.status.draft")}</option>
                <option value="published">{t("packages.status.published")}</option>
                <option value="archived">{t("packages.status.archived")}</option>
              </select>
            </div>

            {packagesQuery.isError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <p className="text-sm text-destructive">
                  {t("common.error")}: {packagesQuery.error?.message || "Failed to load packages"}
                </p>
              </div>
            )}

            {packagesQuery.isLoading && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.title")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.slug")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.category")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.duration")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.price")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.status")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {[...Array(4)].map((_, i) => (
                        <tr key={i}>
                          <td className="px-4 py-3">
                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                          </td>
                          <td className="px-4 py-3">
                            <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!packagesQuery.isLoading && !packagesQuery.isError && packages.length === 0 && (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                {hasFilters ? (
                  <>
                    <p className="text-muted-foreground mb-4">{t("packages.noResults")}</p>
                    <Button
                      onClick={() => {
                        setSearch("");
                        setDebouncedSearch("");
                        setStatus("");
                        setPage(1);
                      }}
                      data-testid="packages-clear-filters"
                    >
                      {t("packages.clearFilters")}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-muted-foreground mb-4">{t("packages.empty")}</p>
                    <Button asChild data-testid="packages-add-new-empty">
                      <Link href="/dashboard/packages/new">
                        {t("packages.addPackage")}
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            )}

            {!packagesQuery.isLoading && !packagesQuery.isError && packages.length > 0 && (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.title")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.slug")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.category")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.duration")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.price")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.status")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                          {t("packages.columns.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {packages.map((pkg) => (
                        <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground">
                            <span className="block max-w-[200px] truncate">{pkg.title}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="block max-w-[150px] truncate">{pkg.slug}</span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {pkg.category || "-"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {pkg.durationDays} {t("packages.days")}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatPrice(pkg.price, pkg.currency)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                                getStatusBadgeClass(pkg.status)
                              )}
                            >
                              {t(`packages.status.${pkg.status}`)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                data-testid={`package-edit-${pkg.id}`}
                              >
                                <Link href={`/dashboard/packages/${pkg.id}`} aria-label={t("packages.edit")}>
                                  {t("packages.edit")}
                                </Link>
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(pkg.id)}
                                disabled={deleteMutation.isPending}
                                data-testid={`package-delete-${pkg.id}`}
                                aria-label={t("packages.delete")}
                              >
                                {t("packages.delete")}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <p className="text-sm text-muted-foreground" data-testid="packages-page-info">
                    {t("packages.pageInfo", { page, total: totalPages || 1 })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      data-testid="packages-prev-page"
                      aria-label={t("common.previous")}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      data-testid="packages-next-page"
                      aria-label={t("common.next")}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

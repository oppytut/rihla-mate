"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import { getStatusBadgeClass } from "@/lib/utils/badge";
import { Link } from "@/i18n/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

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
    }),
  );

  const deleteMutation = useMutation(
    trpc.packages.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("packages.deleteSuccess"));
        packagesQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const packages = packagesQuery.data?.items ?? [];
  const total = packagesQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search !== "" || status !== "";

  const handleDelete = (pkgId: string) => {
    if (window.confirm(t("packages.deleteConfirm"))) {
      deleteMutation.mutate({ id: pkgId });
    }
  };

  return (
    <>
      <PageHeader
        title={t("packages.title")}
        description={
          packagesQuery.isSuccess
            ? t("packages.listCount", { count: total })
            : t("packages.description")
        }
        actions={
          <Button asChild data-testid="packages-add-new">
            <Link href="/dashboard/packages/new">{t("packages.addPackage")}</Link>
          </Button>
        }
      />

      <div className="px-4 lg:px-8 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            data-testid="packages-search"
            placeholder={t("packages.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("packages.search")}
            className="flex-1 bg-background"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            data-testid="packages-status-filter"
            aria-label={t("packages.allStatus")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.title")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell"
                    >
                      {t("packages.columns.slug")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("packages.columns.category")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell"
                    >
                      {t("packages.columns.duration")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.price")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
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
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
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
          <div className="rounded-lg border border-border bg-card p-10 text-center sm:p-12">
            <p className="text-base font-medium text-foreground">
              {hasFilters ? t("packages.noResults") : t("packages.empty")}
            </p>
            {!hasFilters && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {t("packages.emptyHint")}
              </p>
            )}
            {hasFilters ? (
              <Button
                className="mt-6"
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
            ) : (
              <Button asChild className="mt-6" data-testid="packages-add-new-empty">
                <Link href="/dashboard/packages/new">{t("packages.addPackage")}</Link>
              </Button>
            )}
          </div>
        )}

        {!packagesQuery.isLoading && !packagesQuery.isError && packages.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.title")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell"
                    >
                      {t("packages.columns.slug")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("packages.columns.category")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell"
                    >
                      {t("packages.columns.duration")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.price")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("packages.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
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
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        <span className="block max-w-[150px] truncate">{pkg.slug}</span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {pkg.category || "-"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {pkg.durationDays} {t("packages.days")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPrice(pkg.price, pkg.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            getStatusBadgeClass(pkg.status),
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
                            <Link
                              href={`/dashboard/packages/${pkg.id}`}
                              aria-label={t("packages.edit")}
                            >
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground" data-testid="packages-page-info">
                  {t("packages.pageInfo", { page, total: totalPages })}
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
            )}
          </div>
        )}
      </div>
    </>
  );
}

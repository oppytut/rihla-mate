"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { formatPrice, formatDisplayDate } from "@/lib/utils/format";
import { Link } from "@/i18n/navigation";
import { useState, useCallback, useRef, useEffect } from "react";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function CustomersPage() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = `${t("customers.title")}`;
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

  const customersQuery = useQuery(
    trpc.customers.list.queryOptions({
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
  );

  const customers = customersQuery.data?.items ?? [];
  const total = customersQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search !== "";

  return (
    <>
      <PageHeader
        title={t("customers.title")}
        description={
          customersQuery.isSuccess
            ? t("customers.listCount", { count: total })
            : t("customers.description")
        }
      />

      <div className="flex min-h-[calc(100dvh-8rem)] flex-col px-4 py-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            data-testid="customers-search"
            placeholder={t("customers.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("customers.search")}
            className="flex-1 bg-background"
          />
        </div>

        {customersQuery.isError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {customersQuery.error?.message || "Failed to load customers"}
            </p>
          </div>
        )}

        {customersQuery.isLoading && (
          <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.name")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell"
                    >
                      {t("customers.columns.email")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("customers.columns.phone")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell"
                    >
                      {t("customers.columns.bookings")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.totalSpent")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("customers.columns.lastBooking")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell">
                        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 sm:table-cell">
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="hidden px-4 py-3 lg:table-cell">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length === 0 && (
          <div
            className="rounded-lg border border-border bg-card p-10 text-center sm:p-12"
            data-testid="customers-empty"
          >
            <p className="text-base font-medium text-foreground">
              {hasFilters ? t("customers.noResults") : t("customers.empty")}
            </p>
            {!hasFilters && (
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {t("customers.emptyHint")}
              </p>
            )}
            {hasFilters && (
              <Button
                className="mt-6"
                onClick={() => {
                  setSearch("");
                  setDebouncedSearch("");
                  setPage(1);
                }}
                data-testid="customers-clear-filters"
              >
                {t("customers.clearFilters")}
              </Button>
            )}
          </div>
        )}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length > 0 && (
          <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="customers-table">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.name")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground md:table-cell"
                    >
                      {t("customers.columns.email")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("customers.columns.phone")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground sm:table-cell"
                    >
                      {t("customers.columns.bookings")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.totalSpent")}
                    </th>
                    <th
                      scope="col"
                      className="hidden px-4 py-3 text-left font-medium text-muted-foreground lg:table-cell"
                    >
                      {t("customers.columns.lastBooking")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("customers.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((customer) => (
                    <tr
                      key={`${customer.customerName}-${customer.customerEmail}`}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link
                          href={`/dashboard/customers/${encodeURIComponent(customer.customerName ?? "")}?email=${encodeURIComponent(customer.customerEmail ?? "")}`}
                          className="hover:underline"
                        >
                          <span className="block max-w-[200px] truncate">
                            {customer.customerName ?? "-"}
                          </span>
                        </Link>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                        <span className="block max-w-[200px] truncate">
                          {customer.customerEmail ?? "-"}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {customer.customerPhone || "-"}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                        {customer.totalBookings}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPrice(customer.totalSpent ?? "0", "IDR", locale)}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {customer.lastBookingDate
                          ? formatDisplayDate(customer.lastBookingDate, locale)
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          data-testid={`customer-view-${customer.customerName ?? ""}`}
                        >
                          <Link
                            href={`/dashboard/customers/${encodeURIComponent(customer.customerName ?? "")}?email=${encodeURIComponent(customer.customerEmail ?? "")}`}
                          >
                            {t("customers.view")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <p className="text-sm text-muted-foreground" data-testid="customers-page-info">
                  {t("customers.pageInfo", { page, total: totalPages })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    data-testid="customers-prev-page"
                    aria-label={t("common.previous")}
                  >
                    {t("common.previous")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    data-testid="customers-next-page"
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

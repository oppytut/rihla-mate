"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDisplayDate } from "@/lib/utils/format";
import Link from "next/link";
import { useState, useCallback, useRef, useEffect } from "react";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

export default function CustomersPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = `${t("customers.title")} - Rihla Mate`;
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
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = search !== "";

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
          {t("customers.title")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            data-testid="customers-search"
            placeholder={t("customers.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("customers.search")}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
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
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.name")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.email")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.phone")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.bookings")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.totalSpent")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.lastBooking")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
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
                      <td className="px-4 py-3">
                        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-28 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
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
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            {hasFilters ? (
              <>
                <p className="text-muted-foreground mb-4">{t("customers.noResults")}</p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setPage(1);
                  }}
                  data-testid="customers-clear-filters"
                >
                  {t("customers.clearFilters")}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">{t("customers.empty")}</p>
            )}
          </div>
        )}

        {!customersQuery.isLoading && !customersQuery.isError && customers.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.name")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.email")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.phone")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.bookings")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.totalSpent")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("customers.columns.lastBooking")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
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
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block max-w-[200px] truncate">
                          {customer.customerEmail ?? "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.customerPhone || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{customer.totalBookings}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPrice(customer.totalSpent ?? "0", "IDR")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {customer.lastBookingDate
                          ? formatDisplayDate(customer.lastBookingDate)
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

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="customers-page-info">
                {t("customers.pageInfo", { page, total: totalPages || 1 })}
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
          </div>
        )}
      </div>
    </>
  );
}

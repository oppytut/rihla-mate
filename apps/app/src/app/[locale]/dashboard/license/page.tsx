"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

function isExpired(expiresAt: Date | string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

function getStatus(
  revokedAt: Date | string | null,
  expiresAt: Date | string | null,
): "revoked" | "expired" | "active" {
  if (revokedAt) return "revoked";
  if (isExpired(expiresAt)) return "expired";
  return "active";
}

function getStatusBadgeClass(status: "revoked" | "expired" | "active"): string {
  switch (status) {
    case "active":
      return "bg-success/10 text-success";
    case "expired":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "revoked":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
}

export default function LicensePage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    document.title = `${t("license.title")} - Rihla Mate`;
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

  const licenseQuery = useQuery(
    trpc.licenseAdmin.list.queryOptions({
      search: debouncedSearch || undefined,
      page,
      limit: PAGE_SIZE,
    }),
  );

  const statusQuery = useQuery(trpc.licenseAdmin.getStatus.queryOptions());

  const revokeMutation = useMutation(
    trpc.licenseAdmin.revoke.mutationOptions({
      onSuccess: () => {
        toast.success(t("license.revokeSuccess"));
        licenseQuery.refetch();
        statusQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const licenses = licenseQuery.data?.items ?? [];
  const total = licenseQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = search !== "";
  const statusData = statusQuery.data;

  const handleRevoke = (licenseKey: string) => {
    if (window.confirm(t("license.revokeConfirm"))) {
      revokeMutation.mutate({ key: licenseKey });
    }
  };

  return (
    <>
      <PageHeader
        title={t("license.title")}
        description={
          statusQuery.isSuccess && statusData ? (
            <span data-testid="license-status">
              {t("license.statusSummary", {
                active: statusData.active,
                total: statusData.total,
              })}
            </span>
          ) : undefined
        }
      />

      <div className="px-4 lg:px-8 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Input
            type="search"
            data-testid="license-search"
            placeholder={t("license.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("license.search")}
            className="flex-1 bg-background"
          />
        </div>

        {licenseQuery.isError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {licenseQuery.error?.message || "Failed to load licenses"}
            </p>
          </div>
        )}

        {licenseQuery.isLoading && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.key")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.type")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.seats")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.issued")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.expires")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-10 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
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

        {!licenseQuery.isLoading && !licenseQuery.isError && licenses.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            {hasFilters ? (
              <>
                <p className="text-muted-foreground mb-4">{t("license.noResults")}</p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setPage(1);
                  }}
                  data-testid="license-clear-filters"
                >
                  {t("license.clearFilters")}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">{t("license.empty")}</p>
            )}
          </div>
        )}

        {!licenseQuery.isLoading && !licenseQuery.isError && licenses.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.key")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.type")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.seats")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.issued")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.expires")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("license.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {licenses.map((license) => {
                    const status = getStatus(license.revokedAt, license.expiresAt);
                    const shortKey =
                      license.key.length > 16 ? `${license.key.slice(0, 16)}...` : license.key;
                    return (
                      <tr key={license.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          <span className="block max-w-[180px] truncate font-mono text-xs">
                            {shortKey}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {t(
                            `license.type.${license.type}` as
                              | "node-locked"
                              | "floating"
                              | "subscription",
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{license.seats}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {license.issuedAt ? new Date(license.issuedAt).toLocaleDateString() : "-"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {license.expiresAt
                            ? new Date(license.expiresAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              getStatusBadgeClass(status),
                            )}
                          >
                            {t(`license.status.${status}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevoke(license.key)}
                            disabled={revokeMutation.isPending || status === "revoked"}
                            data-testid={`license-revoke-${license.key.slice(0, 8)}`}
                            aria-label={t("license.revoke")}
                          >
                            {t("license.revoke")}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="license-page-info">
                {t("license.pageInfo", { page, total: totalPages || 1 })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-testid="license-prev-page"
                  aria-label={t("common.previous")}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="license-next-page"
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

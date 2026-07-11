"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function LandingPagesPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = `${t("landingPages.title")} - Rihla Mate`;
  }, [t]);

  const pagesQuery = useQuery(
    trpc.pages.list.queryOptions({
      page,
      limit: PAGE_SIZE,
    }),
  );

  const deleteMutation = useMutation(
    trpc.pages.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("landingPages.deleteSuccess"));
        pagesQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const pages = pagesQuery.data?.items ?? [];
  const total = pagesQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDelete = (pageId: string) => {
    if (window.confirm(t("landingPages.deleteConfirm"))) {
      deleteMutation.mutate({ id: pageId });
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
            {t("landingPages.title")}
          </h1>
          <Button asChild data-testid="pages-add-new">
            <Link href="/dashboard/pages/new">{t("landingPages.addPage")}</Link>
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6">
        {pagesQuery.isError && (
          <div
            className="bg-destructive/10 border border-destructive/20 rounded-lg p-6"
            data-testid="pages-page-info"
          >
            <p className="text-sm text-destructive">
              {t("common.error")}: {pagesQuery.error?.message || "Failed to load pages"}
            </p>
          </div>
        )}

        {pagesQuery.isLoading && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.title")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.slug")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.template")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.updated")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.actions")}
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
                        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
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

        {!pagesQuery.isLoading && !pagesQuery.isError && pages.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground mb-4">{t("landingPages.empty")}</p>
            <Button asChild data-testid="pages-add-new-empty">
              <Link href="/dashboard/pages/new">{t("landingPages.addPage")}</Link>
            </Button>
          </div>
        )}

        {!pagesQuery.isLoading && !pagesQuery.isError && pages.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.title")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.slug")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.template")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.status")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.updated")}
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground"
                    >
                      {t("landingPages.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pages.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="block max-w-[200px] truncate">{p.title}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block max-w-[150px] truncate">{p.slug}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.templateId}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            p.isPublished
                              ? "bg-green-500/10 text-green-700 dark:text-green-300"
                              : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
                          )}
                        >
                          {p.isPublished
                            ? t("landingPages.status.published")
                            : t("landingPages.status.draft")}
                        </span>
                        {p.isHomepage && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
                            {t("landingPages.homepage")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`page-edit-${p.id}`}
                          >
                            <Link href={`/dashboard/pages/${p.id}`}>{t("landingPages.edit")}</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(p.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`page-delete-${p.id}`}
                          >
                            {t("landingPages.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="pages-page-info">
                {t("landingPages.pageInfo", { page, total: totalPages || 1 })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
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

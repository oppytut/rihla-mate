"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

export default function MediaPage() {
  const t = useTranslations();
  const trpc = useTRPC();

  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = `${t("media.title")} - Rihla Mate`;
  }, [t]);

  const mediaQuery = useQuery(
    trpc.media.list.queryOptions({
      page,
      limit: PAGE_SIZE,
    }),
  );

  const deleteMutation = useMutation(
    trpc.media.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("media.deleteSuccess"));
        mediaQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const mediaItems = mediaQuery.data?.items ?? [];
  const total = mediaQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleDelete = (id: string) => {
    if (window.confirm(t("media.deleteConfirm"))) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
          {t("media.title")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        {mediaQuery.isError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {mediaQuery.error?.message || "Failed to load media"}
            </p>
          </div>
        )}

        {mediaQuery.isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!mediaQuery.isLoading && !mediaQuery.isError && mediaItems.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">{t("media.empty")}</p>
          </div>
        )}

        {!mediaQuery.isLoading && !mediaQuery.isError && mediaItems.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mediaItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
                >
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    {item.mimeType.startsWith("image/") ? (
                      <Image
                        src={item.filename}
                        alt={item.altText || item.originalName}
                        className="w-full h-full object-cover"
                        width={256}
                        height={256}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-8 w-8 mb-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs truncate max-w-full">{item.originalName}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-foreground truncate">
                      {item.originalName}
                    </p>
                    {item.altText && (
                      <p className="text-xs text-muted-foreground truncate">{item.altText}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {item.sizeBytes > 1024 * 1024
                        ? `${(item.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                        : item.sizeBytes > 1024
                          ? `${(item.sizeBytes / 1024).toFixed(1)} KB`
                          : `${item.sizeBytes} B`}
                    </p>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(item.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`media-delete-${item.id}`}
                    >
                      {t("media.delete")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-4 py-3 mt-6 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="media-page-info">
                {t("media.pageInfo", { page, total: totalPages || 1 })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-testid="media-prev-page"
                  aria-label={t("common.previous")}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="media-next-page"
                  aria-label={t("common.next")}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { PageFormContent, type PageFormData } from "@/components/forms/page-form";

function EditPagePage({ pageId }: { pageId: string }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const pageQuery = useQuery(trpc.pages.getById.queryOptions({ id: pageId }));

  const [initialData, setInitialData] = useState<PageFormData | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    document.title = `${t("pages.editTitle")} - Rihla Mate`;
  }, [t]);

  useEffect(() => {
    if (pageQuery.data && !initialized.current) {
      const pg = pageQuery.data;
      setInitialData({
        templateId: pg.templateId ?? "default",
        slug: pg.slug ?? "",
        title: pg.title ?? "",
        content: pg.content && typeof pg.content === "object" ? JSON.stringify(pg.content) : "{}",
        seo: {
          title:
            pg.seo && typeof pg.seo === "object" && "title" in pg.seo
              ? String((pg.seo as Record<string, unknown>).title ?? "")
              : "",
          description:
            pg.seo && typeof pg.seo === "object" && "description" in pg.seo
              ? String((pg.seo as Record<string, unknown>).description ?? "")
              : "",
          ogImage:
            pg.seo && typeof pg.seo === "object" && "ogImage" in pg.seo
              ? String((pg.seo as Record<string, unknown>).ogImage ?? "")
              : "",
        },
        isPublished: pg.isPublished ?? false,
        isHomepage: pg.isHomepage ?? false,
      });
      initialized.current = true;
    }
  }, [pageQuery.data]);

  if (pageQuery.isError) {
    return (
      <>
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-foreground mb-2" data-testid="page-heading">
              Error
            </h1>
            <p className="text-sm text-destructive" data-testid="error-message">
              Failed to load page: {pageQuery.error?.message}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (pageQuery.isLoading || !initialData) {
    return (
      <>
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      </>
    );
  }

  return <PageFormContent initialData={initialData} isEditMode={true} pageId={pageId} />;
}

export default function PageFormPage() {
  const params = useParams();
  const pageId = params.id as string;

  return <EditPagePage pageId={pageId} />;
}

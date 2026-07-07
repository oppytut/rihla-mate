"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils/slug";
import { tryParseJson } from "@/lib/utils/slug";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TEMPLATES = [
  { value: "default", labelKey: "pages.templates.default" },
  { value: "hero", labelKey: "pages.templates.hero" },
  { value: "split", labelKey: "pages.templates.split" },
] as const;

export type PageFormData = {
  templateId: string;
  slug: string;
  title: string;
  content: string;
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };
  isPublished: boolean;
  isHomepage: boolean;
};

export const initialPageForm: PageFormData = {
  templateId: "default",
  slug: "",
  title: "",
  content: "{}",
  seo: {
    title: "",
    description: "",
    ogImage: "",
  },
  isPublished: false,
  isHomepage: false,
};

export function PageFormContent({
  initialData,
  isEditMode,
  pageId,
}: {
  initialData: PageFormData | null;
  isEditMode: boolean;
  pageId: string | null;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();

  const [form, setForm] = useState<PageFormData>(initialData || initialPageForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${isEditMode ? t("pages.editTitle") : t("pages.createTitle")} - Rihla Mate`;
  }, [isEditMode, t]);

  const createMutation = useMutation(
    trpc.pages.create.mutationOptions({
      onSuccess: () => {
        toast.success(t("pages.createSuccess"));
        router.push("/dashboard/pages");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.pages.update.mutationOptions({
      onSuccess: () => {
        toast.success(t("pages.updateSuccess"));
        router.push("/dashboard/pages");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof PageFormData>(field: K, value: PageFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !isEditMode) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    setSubmitError(null);
  };

  const updateSeoField = (field: keyof PageFormData["seo"], value: string) => {
    setForm((prev) => ({
      ...prev,
      seo: { ...prev.seo, [field]: value },
    }));
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.templateId.trim()) {
      errors.templateId = t("pages.validation.templateIdRequired");
    }

    if (!form.slug.trim()) {
      errors.slug = t("pages.validation.slugRequired");
    } else if (!SLUG_REGEX.test(form.slug)) {
      errors.slug = t("pages.validation.slugInvalid");
    }

    if (!form.title.trim()) {
      errors.title = t("pages.validation.titleRequired");
    }

    if (form.content.trim()) {
      const parsed = tryParseJson(form.content);
      if (!parsed.valid) {
        errors.content = t("pages.validation.contentInvalid");
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    let contentObj: Record<string, unknown> = {};
    if (form.content.trim()) {
      try {
        contentObj = JSON.parse(form.content);
      } catch {
        // validation already caught this
      }
    }

    const payload = {
      title: form.title,
      slug: form.slug,
      templateId: form.templateId,
      content: contentObj,
      seo: {
        title: form.seo.title || undefined,
        description: form.seo.description || undefined,
        ogImage: form.seo.ogImage || undefined,
      },
      isPublished: form.isPublished,
      isHomepage: form.isHomepage,
    };

    if (isEditMode && pageId) {
      updateMutation.mutate({ id: pageId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/pages"
            data-testid="pages-back-to-list"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("pages.backToList")}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mt-2" data-testid="page-heading">
          {isEditMode ? t("pages.editTitle") : t("pages.createTitle")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
          <div className="bg-card border border-border rounded-lg p-6 space-y-8">
            {/* Basic Information Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("pages.fields.section.basic")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="templateId" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.templateId")} *
                </label>
                <select
                  id="templateId"
                  value={form.templateId}
                  onChange={(e) => updateField("templateId", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="page-template-id"
                  aria-label={t("pages.fields.templateId")}
                  aria-describedby={fieldErrors.templateId ? "templateId-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                    fieldErrors.templateId ? "border-destructive" : "border-border",
                  )}
                >
                  {TEMPLATES.map((tmpl) => (
                    <option key={tmpl.value} value={tmpl.value}>
                      {t(tmpl.labelKey)}
                    </option>
                  ))}
                </select>
                {fieldErrors.templateId && (
                  <p
                    id="templateId-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-templateId"
                  >
                    {fieldErrors.templateId}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.title")} *
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                  disabled={isSubmitting}
                  data-testid="page-title"
                  aria-label={t("pages.fields.title")}
                  aria-describedby={fieldErrors.title ? "title-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                    fieldErrors.title ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.title && (
                  <p
                    id="title-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-title"
                  >
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="slug" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.slug")} *
                </label>
                <input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  required
                  disabled={isSubmitting}
                  data-testid="page-slug"
                  aria-label={t("pages.fields.slug")}
                  aria-describedby={fieldErrors.slug ? "slug-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                    fieldErrors.slug ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.slug && (
                  <p
                    id="slug-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-slug"
                  >
                    {fieldErrors.slug}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="content" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.content")}
                </label>
                <textarea
                  id="content"
                  value={form.content}
                  onChange={(e) => updateField("content", e.target.value)}
                  rows={6}
                  disabled={isSubmitting}
                  data-testid="page-content"
                  aria-label={t("pages.fields.content")}
                  aria-describedby={fieldErrors.content ? "content-error" : undefined}
                  placeholder='{"hero": {"headline": "..."}}'
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.content ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.content && (
                  <p
                    id="content-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-content"
                  >
                    {fieldErrors.content}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex items-center gap-2">
                  <input
                    id="isPublished"
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => updateField("isPublished", e.target.checked)}
                    disabled={isSubmitting}
                    data-testid="page-is-published"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="isPublished" className="text-sm font-medium text-foreground">
                    {t("pages.fields.isPublished")}
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="isHomepage"
                    type="checkbox"
                    checked={form.isHomepage}
                    onChange={(e) => updateField("isHomepage", e.target.checked)}
                    disabled={isSubmitting}
                    data-testid="page-is-homepage"
                    className="h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="isHomepage" className="text-sm font-medium text-foreground">
                    {t("pages.fields.isHomepage")}
                  </label>
                </div>
              </div>
            </section>

            {/* SEO Settings Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("pages.fields.section.seo")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="seoTitle" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.seo.title")}
                </label>
                <input
                  id="seoTitle"
                  type="text"
                  value={form.seo.title}
                  onChange={(e) => updateSeoField("title", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="page-seo-title"
                  aria-label={t("pages.fields.seo.title")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="seoDescription"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("pages.fields.seo.description")}
                </label>
                <textarea
                  id="seoDescription"
                  value={form.seo.description}
                  onChange={(e) => updateSeoField("description", e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  data-testid="page-seo-description"
                  aria-label={t("pages.fields.seo.description")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="seoOgImage" className="block text-sm font-medium text-foreground">
                  {t("pages.fields.seo.ogImage")}
                </label>
                <input
                  id="seoOgImage"
                  type="text"
                  value={form.seo.ogImage}
                  onChange={(e) => updateSeoField("ogImage", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="page-seo-og-image"
                  aria-label={t("pages.fields.seo.ogImage")}
                  placeholder="https://example.com/og-image.jpg"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </section>

            {submitError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSubmitting} data-testid="page-submit">
                {isSubmitting ? t("pages.saving") : t("pages.save")}
              </Button>
              <Link href="/dashboard/pages">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  data-testid="page-cancel"
                >
                  {t("pages.backToList")}
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

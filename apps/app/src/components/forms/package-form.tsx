"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/utils/slug";
import { validatePackage } from "@/lib/utils/validation";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";

export type PackageForm = {
  title: string;
  slug: string;
  description: string;
  category: string;
  durationDays: number;
  price: string;
  currency: string;
  departureCity: string;
  status: string;
  featuredImage: string;
  itinerary: string;
  inclusions: string;
  exclusions: string;
  availableDates: string;
  gallery: string;
};

export const initialForm: PackageForm = {
  title: "",
  slug: "",
  description: "",
  category: "standard",
  durationDays: 1,
  price: "",
  currency: "IDR",
  departureCity: "",
  status: "draft",
  featuredImage: "",
  itinerary: "[]",
  inclusions: "[]",
  exclusions: "[]",
  availableDates: "[]",
  gallery: "[]",
};

export function PackageFormContent({
  initialData,
  isEditMode,
  packageId,
}: {
  initialData: PackageForm | null;
  isEditMode: boolean;
  packageId: string;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();

  const [form, setForm] = useState<PackageForm>(initialData || initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${isEditMode ? t("packages.editTitle") : t("packages.createTitle")} - Rihla Mate`;
  }, [isEditMode, t]);

  const createMutation = useMutation(
    trpc.packages.create.mutationOptions({
      onSuccess: () => {
        toast.success(t("packages.createSuccess"));
        router.push("/dashboard/packages");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.packages.update.mutationOptions({
      onSuccess: () => {
        toast.success(t("packages.updateSuccess"));
        router.push("/dashboard/packages");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof PackageForm>(field: K, value: PackageForm[K]) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "title" && !isEditMode) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const result = validatePackage(
      {
        title: form.title,
        slug: form.slug,
        price: form.price,
        durationDays: form.durationDays,
        itinerary: form.itinerary,
        inclusions: form.inclusions,
        exclusions: form.exclusions,
        availableDates: form.availableDates,
        gallery: form.gallery,
      },
      t,
    );
    const errorMap: Record<string, string> = {
      title: t("packages.validation.titleRequired"),
      slug: t("packages.validation.slugRequired"),
      price: t("packages.validation.priceRequired"),
      durationDays: t("packages.validation.durationMin"),
      itinerary: t("packages.invalidJson"),
      inclusions: t("packages.invalidJson"),
      exclusions: t("packages.invalidJson"),
      availableDates: t("packages.invalidJson"),
      gallery: t("packages.invalidJson"),
    };
    const translatedErrors: Record<string, string> = {};
    for (const [key, msg] of Object.entries(result.errors)) {
      translatedErrors[key] = errorMap[key] || msg;
    }
    setFieldErrors(translatedErrors);
    return result.valid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    const payload = {
      title: form.title,
      slug: form.slug,
      description: form.description || undefined,
      category: form.category,
      durationDays: form.durationDays,
      price: form.price,
      currency: form.currency,
      departureCity: form.departureCity || undefined,
      status: form.status,
      featuredImage: form.featuredImage || undefined,
      itinerary: form.itinerary || "[]",
      inclusions: form.inclusions || "[]",
      exclusions: form.exclusions || "[]",
      availableDates: form.availableDates || "[]",
      gallery: form.gallery || "[]",
    };

    if (isEditMode) {
      updateMutation.mutate({ id: packageId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/packages"
            data-testid="packages-back-to-list"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("packages.backToList")}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mt-2" data-testid="page-heading">
          {isEditMode ? t("packages.editTitle") : t("packages.createTitle")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
          <div className="bg-card border border-border rounded-lg p-6 space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("packages.fields.section.basic")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.title")} *
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  required
                  disabled={isSubmitting}
                  data-testid="package-title"
                  aria-label={t("packages.fields.title")}
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
                  {t("packages.fields.slug")} *
                </label>
                <input
                  id="slug"
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  required
                  disabled={isSubmitting}
                  data-testid="package-slug"
                  aria-label={t("packages.fields.slug")}
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
                <label htmlFor="description" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.description")}
                </label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  data-testid="package-description"
                  aria-label={t("packages.fields.description")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="category" className="block text-sm font-medium text-foreground">
                    {t("packages.fields.category")}
                  </label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => updateField("category", e.target.value)}
                    disabled={isSubmitting}
                    data-testid="package-category"
                    aria-label={t("packages.fields.category")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="standard">{t("packages.category.standard")}</option>
                    <option value="premium">{t("packages.category.premium")}</option>
                    <option value="vip">{t("packages.category.vip")}</option>
                    <option value="economy">{t("packages.category.economy")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="durationDays"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("packages.fields.durationDays")} *
                  </label>
                  <input
                    id="durationDays"
                    type="number"
                    min={1}
                    value={form.durationDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateField("durationDays", isNaN(val) ? 0 : val);
                    }}
                    required
                    disabled={isSubmitting}
                    data-testid="package-duration-days"
                    aria-label={t("packages.fields.durationDays")}
                    aria-describedby={fieldErrors.durationDays ? "durationDays-error" : undefined}
                    className={cn(
                      "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                      fieldErrors.durationDays ? "border-destructive" : "border-border",
                    )}
                  />
                  {fieldErrors.durationDays && (
                    <p
                      id="durationDays-error"
                      className="text-sm text-destructive"
                      data-testid="validation-error-durationDays"
                    >
                      {fieldErrors.durationDays}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="departureCity"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("packages.fields.departureCity")}
                </label>
                <input
                  id="departureCity"
                  type="text"
                  value={form.departureCity}
                  onChange={(e) => updateField("departureCity", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="package-departure-city"
                  aria-label={t("packages.fields.departureCity")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="status" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.status")}
                </label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="package-status"
                  aria-label={t("packages.fields.status")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="draft">{t("packages.status.draft")}</option>
                  <option value="published">{t("packages.status.published")}</option>
                  <option value="archived">{t("packages.status.archived")}</option>
                </select>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("packages.fields.section.pricing")}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="price" className="block text-sm font-medium text-foreground">
                    {t("packages.fields.price")} *
                  </label>
                  <input
                    id="price"
                    type="text"
                    value={form.price}
                    onChange={(e) => updateField("price", e.target.value)}
                    required
                    disabled={isSubmitting}
                    placeholder="1500000"
                    data-testid="package-price"
                    aria-label={t("packages.fields.price")}
                    aria-describedby={fieldErrors.price ? "price-error" : undefined}
                    className={cn(
                      "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                      fieldErrors.price ? "border-destructive" : "border-border",
                    )}
                  />
                  {fieldErrors.price && (
                    <p
                      id="price-error"
                      className="text-sm text-destructive"
                      data-testid="validation-error-price"
                    >
                      {fieldErrors.price}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="currency" className="block text-sm font-medium text-foreground">
                    {t("packages.fields.currency")}
                  </label>
                  <select
                    id="currency"
                    value={form.currency}
                    onChange={(e) => updateField("currency", e.target.value)}
                    disabled={isSubmitting}
                    data-testid="package-currency"
                    aria-label={t("packages.fields.currency")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="IDR">IDR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("packages.fields.section.media")}
              </h2>

              <div className="space-y-2">
                <label
                  htmlFor="featuredImage"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("packages.fields.featuredImage")}
                </label>
                <input
                  id="featuredImage"
                  type="text"
                  value={form.featuredImage}
                  onChange={(e) => updateField("featuredImage", e.target.value)}
                  disabled={isSubmitting}
                  placeholder="https://example.com/image.jpg"
                  data-testid="package-featured-image"
                  aria-label={t("packages.fields.featuredImage")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="gallery" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.gallery")}
                </label>
                <textarea
                  id="gallery"
                  value={form.gallery}
                  onChange={(e) => updateField("gallery", e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder='["https://...", "https://..."]'
                  data-testid="package-gallery"
                  aria-label={t("packages.fields.gallery")}
                  aria-describedby={fieldErrors.gallery ? "gallery-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.gallery ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.gallery && (
                  <p
                    id="gallery-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-gallery"
                  >
                    {fieldErrors.gallery}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("packages.fields.section.content")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="itinerary" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.itinerary")}
                </label>
                <textarea
                  id="itinerary"
                  value={form.itinerary}
                  onChange={(e) => updateField("itinerary", e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  placeholder='[{"day": 1, "description": "..."}]'
                  data-testid="package-itinerary"
                  aria-label={t("packages.fields.itinerary")}
                  aria-describedby={fieldErrors.itinerary ? "itinerary-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.itinerary ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.itinerary && (
                  <p
                    id="itinerary-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-itinerary"
                  >
                    {fieldErrors.itinerary}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="inclusions" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.inclusions")}
                </label>
                <textarea
                  id="inclusions"
                  value={form.inclusions}
                  onChange={(e) => updateField("inclusions", e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder='["Hotel", "Transport"]'
                  data-testid="package-inclusions"
                  aria-label={t("packages.fields.inclusions")}
                  aria-describedby={fieldErrors.inclusions ? "inclusions-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.inclusions ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.inclusions && (
                  <p
                    id="inclusions-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-inclusions"
                  >
                    {fieldErrors.inclusions}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="exclusions" className="block text-sm font-medium text-foreground">
                  {t("packages.fields.exclusions")}
                </label>
                <textarea
                  id="exclusions"
                  value={form.exclusions}
                  onChange={(e) => updateField("exclusions", e.target.value)}
                  rows={3}
                  disabled={isSubmitting}
                  placeholder='["Tiket pesawat"]'
                  data-testid="package-exclusions"
                  aria-label={t("packages.fields.exclusions")}
                  aria-describedby={fieldErrors.exclusions ? "exclusions-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.exclusions ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.exclusions && (
                  <p
                    id="exclusions-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-exclusions"
                  >
                    {fieldErrors.exclusions}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="availableDates"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("packages.fields.availableDates")}
                </label>
                <textarea
                  id="availableDates"
                  value={form.availableDates}
                  onChange={(e) => updateField("availableDates", e.target.value)}
                  rows={2}
                  disabled={isSubmitting}
                  placeholder='["2026-07-01", "2026-08-15"]'
                  data-testid="package-available-dates"
                  aria-label={t("packages.fields.availableDates")}
                  aria-describedby={fieldErrors.availableDates ? "availableDates-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none font-mono text-sm",
                    fieldErrors.availableDates ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.availableDates && (
                  <p
                    id="availableDates-error"
                    className="text-sm text-destructive"
                    data-testid="validation-error-availableDates"
                  >
                    {fieldErrors.availableDates}
                  </p>
                )}
              </div>
            </section>

            {submitError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" disabled={isSubmitting} data-testid="package-submit">
                {isSubmitting ? t("packages.saving") : t("packages.save")}
              </Button>
              <Link href="/dashboard/packages">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  data-testid="package-cancel"
                >
                  {t("packages.backToList")}
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

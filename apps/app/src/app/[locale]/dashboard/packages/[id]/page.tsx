"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { PackageFormContent, type PackageForm } from "@/components/forms/package-form";

function EditPackagePage({ packageId }: { packageId: string }) {
  const t = useTranslations();
  const trpc = useTRPC();
  const packageQuery = useQuery(trpc.packages.getById.queryOptions({ id: packageId }));

  const [initialData, setInitialData] = useState<PackageForm | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    document.title = `${t("packages.editTitle")} - Rihla Mate`;
  }, [t]);

  useEffect(() => {
    if (packageQuery.data && !initialized.current) {
      const pkg = packageQuery.data;
      setInitialData({
        title: pkg.title ?? "",
        slug: pkg.slug ?? "",
        description: pkg.description ?? "",
        category: pkg.category ?? "standard",
        durationDays: pkg.durationDays ?? 1,
        price: pkg.price ?? "",
        currency: pkg.currency ?? "IDR",
        departureCity: pkg.departureCity ?? "",
        status: pkg.status ?? "draft",
        featuredImage: pkg.featuredImage ?? "",
        itinerary: pkg.itinerary ? JSON.stringify(pkg.itinerary) : "[]",
        inclusions: pkg.inclusions ? JSON.stringify(pkg.inclusions) : "[]",
        exclusions: pkg.exclusions ? JSON.stringify(pkg.exclusions) : "[]",
        availableDates: pkg.availableDates ? JSON.stringify(pkg.availableDates) : "[]",
        gallery: pkg.gallery ? JSON.stringify(pkg.gallery) : "[]",
      });
      initialized.current = true;
    }
  }, [packageQuery.data]);

  if (packageQuery.isError) {
    return (
      <>
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h1 className="text-2xl font-semibold text-foreground mb-2" data-testid="page-heading">
              Error
            </h1>
            <p className="text-sm text-destructive" data-testid="error-message">
              Failed to load package: {packageQuery.error?.message}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (packageQuery.isLoading || !initialData) {
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

  return <PackageFormContent initialData={initialData} isEditMode={true} packageId={packageId} />;
}

export default function PackageFormPage() {
  const params = useParams();
  const packageId = params.id as string;

  return <EditPackagePage packageId={packageId} />;
}

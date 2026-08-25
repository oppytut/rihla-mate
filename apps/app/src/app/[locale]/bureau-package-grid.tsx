"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils/format";
import { isKnownPackageCategory, packageCategorySlug } from "@/lib/bureau-package-category";
import type { BureauPackageCard } from "./bureau-landing";

export function BureauPackageGrid({
  packages,
  showCityFilter = false,
  showDurationFilter = false,
}: {
  packages: BureauPackageCard[];
  showCityFilter?: boolean;
  showDurationFilter?: boolean;
}) {
  const t = useTranslations("marketing.bureau");
  const tPkg = useTranslations("packages");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [duration, setDuration] = useState("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of packages) {
      const slug = packageCategorySlug(pkg.category);
      if (slug) set.add(slug);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [packages]);

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const pkg of packages) {
      if (pkg.departureCity?.trim()) set.add(pkg.departureCity.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [packages]);

  const durations = useMemo(() => {
    const set = new Set<number>();
    for (const pkg of packages) set.add(pkg.durationDays);
    return [...set].sort((a, b) => a - b);
  }, [packages]);

  const filtered = useMemo(() => {
    return packages.filter((pkg) => {
      if (category && packageCategorySlug(pkg.category) !== category) return false;
      if (city && (pkg.departureCity ?? "") !== city) return false;
      if (duration && String(pkg.durationDays) !== duration) return false;
      return true;
    });
  }, [packages, category, city, duration]);

  const categoryLabel = (value: string) => {
    const key = packageCategorySlug(value);
    if (isKnownPackageCategory(key)) {
      return tPkg(`category.${key}`);
    }
    return value;
  };

  const showFilters =
    categories.length > 1 ||
    (showCityFilter && cities.length > 1) ||
    (showDurationFilter && durations.length > 1);

  return (
    <div>
      {showFilters ? (
        <div
          className="mb-6 flex flex-wrap items-center gap-4"
          data-testid="catalog-category-filter"
        >
          {categories.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="catalog-category" className="text-sm font-medium text-foreground">
                {t("filterCategory")}
              </label>
              <select
                id="catalog-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">{t("filterAll")}</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabel(cat)}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showCityFilter && cities.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="catalog-city" className="text-sm font-medium text-foreground">
                {t("filterCity")}
              </label>
              <select
                id="catalog-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="min-h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">{t("filterAllCities")}</option>
                {cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showDurationFilter && durations.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="catalog-duration" className="text-sm font-medium text-foreground">
                {t("filterDuration")}
              </label>
              <select
                id="catalog-duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="min-h-11 rounded-md border border-input bg-card px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <option value="">{t("filterAllDurations")}</option>
                {durations.map((d) => (
                  <option key={d} value={String(d)}>
                    {t("durationDays", { days: d })}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyPackages")}</p>
      ) : (
        <ul className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((pkg) => (
            <li key={pkg.id} className="h-full">
              <article className="flex h-full flex-col rounded-lg border border-border/60 bg-card p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">{pkg.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t("durationDays", { days: pkg.durationDays })}
                  {pkg.departureCity ? ` · ${pkg.departureCity}` : ""}
                </p>
                {pkg.description ? (
                  <p className="mt-3 line-clamp-3 flex-1 text-sm text-muted-foreground">
                    {pkg.description}
                  </p>
                ) : (
                  <div className="flex-1" />
                )}
                <p className="mt-4 text-sm font-medium text-foreground">
                  {t("fromPrice")} {formatPrice(pkg.price, pkg.currency)}
                </p>
                <Link
                  href={`/packages/${pkg.slug}`}
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  {t("viewPackage")}
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

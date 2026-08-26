"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/utils/format";
import { isKnownPackageCategory, packageCategorySlug } from "@/lib/bureau-package-category";
import { NativeSelect } from "@/components/ui/native-select";
import type { BureauPackageCard } from "./bureau-landing";

const PACKAGE_IMAGES = [
  "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1580418827493-f2b22c0dc311?auto=format&fit=crop&w=800&q=80",
] as const;

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
              <NativeSelect
                id="catalog-category"
                value={category}
                onValueChange={setCategory}
                placeholder={t("filterAll")}
                data-testid="catalog-category"
                className="w-auto min-w-40"
                options={categories.map((cat) => ({
                  value: cat,
                  label: categoryLabel(cat),
                }))}
              />
            </div>
          ) : null}
          {showCityFilter && cities.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="catalog-city" className="text-sm font-medium text-foreground">
                {t("filterCity")}
              </label>
              <NativeSelect
                id="catalog-city"
                value={city}
                onValueChange={setCity}
                placeholder={t("filterAllCities")}
                className="w-auto min-w-40"
                options={cities.map((c) => ({ value: c, label: c }))}
              />
            </div>
          ) : null}
          {showDurationFilter && durations.length > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="catalog-duration" className="text-sm font-medium text-foreground">
                {t("filterDuration")}
              </label>
              <NativeSelect
                id="catalog-duration"
                value={duration}
                onValueChange={setDuration}
                placeholder={t("filterAllDurations")}
                className="w-auto min-w-40"
                options={durations.map((d) => ({
                  value: String(d),
                  label: t("durationDays", { days: d }),
                }))}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyPackages")}</p>
      ) : (
        <ul className="grid auto-rows-fr gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((pkg, index) => (
            <li key={pkg.id} className="h-full">
              <article className="flex h-full flex-col overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
                <div
                  className="aspect-[4/3] w-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${PACKAGE_IMAGES[index % PACKAGE_IMAGES.length]})`,
                  }}
                  aria-hidden
                />
                <div className="flex flex-1 flex-col p-5">
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
                  <p className="mt-4 text-lg font-semibold text-foreground">
                    {t("fromPrice")} {formatPrice(pkg.price, pkg.currency)}
                  </p>
                  <Link
                    href={`/packages/${pkg.slug}`}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                  >
                    {t("viewPackage")}
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

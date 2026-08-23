"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDisplayDate, formatPrice } from "@/lib/utils/format";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Check, X, MapPin, CalendarDays } from "lucide-react";

function collectGalleryUrls(featuredImage: unknown, gallery: unknown, limit = 8): string[] {
  const urls: string[] = [];
  if (typeof featuredImage === "string" && featuredImage.trim()) {
    urls.push(featuredImage.trim());
  }
  let galleryRaw: unknown = gallery;
  if (typeof galleryRaw === "string") {
    try {
      galleryRaw = JSON.parse(galleryRaw);
    } catch {
      galleryRaw = [];
    }
  }
  if (Array.isArray(galleryRaw)) {
    for (const item of galleryRaw) {
      if (typeof item === "string" && item.trim() && !urls.includes(item.trim())) {
        urls.push(item.trim());
      }
    }
  }
  return urls.slice(0, limit);
}

function parseStringList(value: unknown): string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
          .map((item) => item.trim());
      }
    } catch {
      return trimmed ? [trimmed] : [];
    }
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function parseItinerary(
  value: unknown,
): Array<{ day: number; title: string; description?: string }> {
  let raw: unknown = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  const items: Array<{ day: number; title: string; description?: string }> = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    if (!title) continue;
    const dayNum = typeof row.day === "number" ? row.day : Number(row.day);
    items.push({
      day: Number.isFinite(dayNum) ? dayNum : items.length + 1,
      title,
      description: typeof row.description === "string" ? row.description : undefined,
    });
  }
  return items.sort((a, b) => a.day - b.day);
}

function categoryLabel(
  category: string | null | undefined,
  t: ReturnType<typeof useTranslations>,
): string | null {
  if (!category) return null;
  const key = category.toLowerCase();
  if (key === "standard" || key === "premium" || key === "vip" || key === "economy") {
    return t(`packages.category.${key}`);
  }
  return category;
}

export function PublicPackageDetailView() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const params = useParams();
  const slug = params.slug as string;

  const packageQuery = useQuery(trpc.packages.getBySlug.queryOptions({ slug }));

  if (packageQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background" data-testid="package-detail-loading">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 py-6 lg:px-8">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-64 animate-pulse rounded bg-muted" />
          </div>
        </header>
        <div className="container mx-auto max-w-4xl space-y-4 px-4 py-8 lg:px-8">
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-32 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (packageQuery.isError) {
    const errorCode = packageQuery.error?.data?.code;
    const errorMessage = packageQuery.error?.message?.toLowerCase() ?? "";
    const isNotFound = errorCode === "NOT_FOUND" || errorMessage.includes("not found");

    return (
      <div className="min-h-screen bg-background" data-testid="package-detail-error">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 py-6 lg:px-8">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("bookings.backHome")}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              {isNotFound ? t("packages.notFoundTitle") : t("common.error")}
            </h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-3 rounded-lg border border-border bg-card p-8 text-center">
            <p className="font-medium text-foreground">
              {isNotFound ? t("packages.notFound") : t("packages.temporaryUnavailable")}
            </p>
            {isNotFound ? (
              <p className="text-sm text-muted-foreground">{t("packages.notFoundHint")}</p>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/marketing"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                {t("packages.browsePackages")}
              </Link>
              <Link href="/" className="text-sm font-medium text-primary hover:underline">
                {t("bookings.backHome")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!packageQuery.data) {
    return (
      <div className="min-h-screen bg-background" data-testid="package-detail-empty">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 py-6 lg:px-8">
            <Link
              href="/"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("bookings.backHome")}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              {t("packages.notFoundTitle")}
            </h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 lg:px-8">
          <div className="mx-auto max-w-2xl space-y-3 rounded-lg border border-border bg-card p-8 text-center">
            <p className="font-medium text-foreground">{t("packages.notFound")}</p>
            <p className="text-sm text-muted-foreground">{t("packages.notFoundHint")}</p>
            <Link
              href="/marketing"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              {t("packages.browsePackages")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const pkg = packageQuery.data;
  const galleryUrls = collectGalleryUrls(pkg.featuredImage, pkg.gallery);
  const itinerary = parseItinerary(pkg.itinerary);
  const inclusions = parseStringList(pkg.inclusions);
  const exclusions = parseStringList(pkg.exclusions);
  const availableDates = parseStringList(pkg.availableDates);
  const catLabel = categoryLabel(pkg.category, t);
  const bookHref = `/packages/${slug}/book`;

  return (
    <div className="min-h-screen bg-background pb-28" data-testid="package-detail">
      <header className="relative overflow-hidden border-b border-border/40 bg-card">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,oklch(0.42_0.09_165_/_0.12),transparent)]"
          aria-hidden
        />
        <div className="container mx-auto px-4 py-8 lg:px-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("bookings.backHome")}
          </Link>
          <div className="mt-4 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              {catLabel ? (
                <Badge variant="outline" className="font-medium">
                  {catLabel}
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {pkg.title}
            </h1>
            {pkg.description ? (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {pkg.description}
              </p>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm">
                <span className="text-xs font-normal opacity-90">{t("packages.fromPrice")}</span>
                {formatPrice(pkg.price, "IDR", locale)}
                <span className="text-xs font-normal opacity-90">{t("packages.perPerson")}</span>
              </span>
              {pkg.durationDays ? (
                <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  {pkg.durationDays} {t("packages.days")}
                </span>
              ) : null}
              {pkg.departureCity ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  <MapPin className="size-3.5 opacity-70" aria-hidden />
                  {pkg.departureCity}
                </span>
              ) : null}
            </div>
            <div className="mt-6">
              <Button asChild size="lg" data-testid="package-detail-book-cta">
                <Link href={bookHref}>{t("packages.detail.bookCta")}</Link>
              </Button>
            </div>
          </div>

          {galleryUrls.length > 0 ? (
            <div className="mt-8 max-w-4xl" data-testid="package-detail-gallery">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("packages.detail.gallery")}
              </p>
              <div
                className={cn(
                  "grid gap-2",
                  galleryUrls.length === 1 && "grid-cols-1",
                  galleryUrls.length === 2 && "grid-cols-2",
                  galleryUrls.length >= 3 && "grid-cols-2 sm:grid-cols-3",
                )}
              >
                {galleryUrls.map((url, index) => (
                  <div
                    key={url}
                    className={cn(
                      "relative overflow-hidden rounded-xl border border-border/60 bg-muted",
                      index === 0 && galleryUrls.length >= 3
                        ? "aspect-[16/10] sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:min-h-[220px]"
                        : "aspect-[4/3]",
                    )}
                  >
                    <Image
                      src={url}
                      alt={`${pkg.title} — ${index + 1}`}
                      fill
                      sizes={
                        index === 0 && galleryUrls.length >= 3
                          ? "(max-width: 640px) 100vw, 66vw"
                          : "(max-width: 640px) 50vw, 33vw"
                      }
                      className="object-cover"
                      priority={index === 0}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <div className="container mx-auto max-w-4xl space-y-6 px-4 py-8 lg:px-8">
        {pkg.description ? (
          <Card className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
            <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
              <CardTitle className="text-base font-semibold">
                {t("packages.detail.about")}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 py-4 text-sm leading-relaxed text-muted-foreground sm:px-6">
              {pkg.description}
            </CardContent>
          </Card>
        ) : null}

        {itinerary.length > 0 ? (
          <Card
            className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
            data-testid="package-detail-itinerary"
          >
            <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
              <CardTitle className="text-base font-semibold">
                {t("packages.detail.itinerary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border px-0 py-0">
              {itinerary.map((item) => (
                <div key={`${item.day}-${item.title}`} className="px-4 py-4 sm:px-6">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary">
                    {t("packages.detail.dayLabel", { day: item.day })}
                  </p>
                  <p className="mt-1 font-medium text-foreground">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          {inclusions.length > 0 ? (
            <Card
              className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              data-testid="package-detail-inclusions"
            >
              <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  {t("packages.detail.inclusions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4 sm:px-6">
                <ul className="space-y-2">
                  {inclusions.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {exclusions.length > 0 ? (
            <Card
              className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
              data-testid="package-detail-exclusions"
            >
              <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
                <CardTitle className="text-base font-semibold">
                  {t("packages.detail.exclusions")}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-4 sm:px-6">
                <ul className="space-y-2">
                  {exclusions.map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-foreground">
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Card
          className="gap-0 py-0 shadow-sm ring-1 ring-black/5 dark:ring-white/5"
          data-testid="package-detail-dates"
        >
          <CardHeader className="border-b border-border px-4 py-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
              {t("packages.detail.availableDates")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4 sm:px-6">
            {availableDates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("packages.detail.noDates")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableDates.map((date) => (
                  <span
                    key={date}
                    className="inline-flex rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {formatDisplayDate(date, locale)}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{pkg.title}</p>
            <p className="text-xs text-muted-foreground">
              {t("packages.fromPrice")} {formatPrice(pkg.price, "IDR", locale)}{" "}
              {t("packages.perPerson")}
            </p>
          </div>
          <Button asChild data-testid="package-detail-book-sticky">
            <Link href={bookHref}>{t("packages.detail.bookCta")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

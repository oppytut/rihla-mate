"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDisplayDate, formatPrice } from "@/lib/utils/format";
import { validateBooking } from "@/lib/utils/validation";
import { useParams } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import { useSnapPayment } from "@/components/payment/snap-payment";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import Image from "next/image";

interface BookingForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departureDate: string;
  travelers: number;
  notes: string;
}

function collectGalleryUrls(featuredImage: unknown, gallery: unknown): string[] {
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
  return urls.slice(0, 4);
}

const initialForm: BookingForm = {
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  departureDate: "",
  travelers: 1,
  notes: "",
};

export default function PublicBookingPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [form, setForm] = useState<BookingForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const bookingIdRef = useRef<string | null>(null);

  const packageQuery = useQuery(trpc.packages.getBySlug.queryOptions({ slug }));

  const createMutation = useMutation(
    trpc.bookings.createPublic.mutationOptions({
      onSuccess: (data) => {
        toast.success(t("bookings.createSuccess"));
        bookingIdRef.current = data.id;
        snapMutation.mutate({ bookingId: data.id });
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const snapMutation = useMutation(
    trpc.publicMidtrans.createTransaction.mutationOptions({
      onSuccess: (data) => {
        if (data.token) {
          setSnapToken(data.token);
          setIsPaying(true);
          return;
        }
        toast.info(t("bookings.snap.pending"));
        router.push(
          `/packages/${slug}/book/success?bookingId=${bookingIdRef.current}&status=pending`,
        );
      },
      onError: (error) => {
        toast.error(error.message || t("common.error"));
      },
    }),
  );

  const isSubmitting = createMutation.isPending || snapMutation.isPending;

  const { pay } = useSnapPayment();

  const handleSnapSuccess = useCallback(
    (result: Record<string, unknown>) => {
      void result;
      router.push(`/packages/${slug}/book/success?bookingId=${bookingIdRef.current}`);
    },
    [router, slug],
  );

  const handleSnapError = useCallback(
    (result: Record<string, unknown>) => {
      void result;
      setIsPaying(false);
      setSnapToken(null);
      toast.error(t("bookings.paymentError"));
    },
    [t],
  );

  const handleSnapClose = useCallback(() => {
    setIsPaying(false);
    setSnapToken(null);
  }, []);

  useEffect(() => {
    if (!snapToken || !isPaying) return;
    pay(snapToken, {
      onSuccess: handleSnapSuccess,
      onPending: handleSnapSuccess,
      onError: handleSnapError,
      onClose: handleSnapClose,
    });
  }, [snapToken, isPaying, pay, handleSnapSuccess, handleSnapError, handleSnapClose]);

  const updateField = <K extends keyof BookingForm>(field: K, value: BookingForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const { [field]: _unused, ...rest } = prev;
        void _unused;
        return rest;
      });
    }
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const pkg = packageQuery.data;
    if (!pkg) return false;

    const totalPrice = (parseFloat(pkg.price) * form.travelers).toFixed(2);

    const result = validateBooking(
      {
        packageId: pkg.id,
        departureDate: form.departureDate,
        customerName: form.customerName,
        totalPrice,
        travelers: form.travelers,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
      },
      t,
    );

    const errorMap: Record<string, string> = {
      customerName: t("bookings.validation.customerNameRequired"),
      packageId: t("bookings.validation.packageRequired"),
      departureDate: t("bookings.validation.dateRequired"),
      totalPrice: t("bookings.validation.priceRequired"),
      travelers: t("bookings.validation.travelersMin"),
      customerEmail: t("bookings.validation.emailInvalid") || "Invalid email format",
      customerPhone: t("bookings.validation.phoneInvalid") || "Invalid phone format",
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

    const pkg = packageQuery.data;
    if (!pkg) return;

    createMutation.mutate({
      packageId: pkg.id,
      departureDate: form.departureDate,
      customerName: form.customerName,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
      travelers: form.travelers,
      notes: form.notes || undefined,
    });
  };

  const inputClass = (field: string) =>
    cn(
      "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
      fieldErrors[field] ? "border-destructive" : "border-border",
    );

  /* ------------------------------------------------------------------ */
  /*  Loading skeleton                                                  */
  /* ------------------------------------------------------------------ */
  if (packageQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-8 w-64 animate-pulse rounded bg-muted" />
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl space-y-6">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="h-6 w-48 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="flex gap-4">
                  <div className="h-6 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-6 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="space-y-4">
                <div className="h-6 w-40 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
                <div className="h-10 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (packageQuery.isError) {
    const errorCode = packageQuery.error?.data?.code;
    const errorMessage = packageQuery.error?.message?.toLowerCase() ?? "";
    const isNotFound = errorCode === "NOT_FOUND" || errorMessage.includes("not found");

    if (isNotFound) {
      return (
        <div className="min-h-screen bg-background">
          <header className="border-b border-border/40 bg-card">
            <div className="container mx-auto px-4 lg:px-8 py-6">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("bookings.backHome")}
              </Link>
              <h1 className="text-2xl font-semibold text-foreground mt-2">
                {t("packages.notFoundTitle")}
              </h1>
            </div>
          </header>
          <div className="container mx-auto px-4 lg:px-8 py-8">
            <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center space-y-3">
              <p className="text-foreground font-medium">{t("packages.notFound")}</p>
              <p className="text-sm text-muted-foreground">{t("packages.notFoundHint")}</p>
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

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("bookings.backHome")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">{t("common.error")}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center space-y-3">
            <p className="text-foreground font-medium">{t("packages.temporaryUnavailable")}</p>
            <p className="text-sm text-muted-foreground">{t("common.unexpectedError")}</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              {t("bookings.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!packageQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("bookings.backHome")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">
              {t("packages.notFoundTitle")}
            </h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center space-y-3">
            <p className="text-foreground font-medium">{t("packages.notFound")}</p>
            <p className="text-sm text-muted-foreground">{t("packages.notFoundHint")}</p>
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

  const pkg = packageQuery.data;

  let availableDates: string[] = [];
  try {
    const raw = pkg.availableDates as unknown;
    if (Array.isArray(raw)) {
      availableDates = raw as string[];
    } else if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) availableDates = parsed as string[];
    }
  } catch {
    availableDates = [];
  }

  const galleryUrls = collectGalleryUrls(pkg.featuredImage, pkg.gallery);

  const availableDateSet = new Set(availableDates);
  const totalPrice = parseFloat(pkg.price) * form.travelers;

  /* ------------------------------------------------------------------ */
  /*  No available dates                                                 */
  /* ------------------------------------------------------------------ */
  if (availableDates.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("bookings.backHome")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">{pkg.title}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">{t("bookings.noAvailableDates")}</p>
            <Link
              href="/"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              {t("bookings.backHome")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Main booking form                                                  */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="relative overflow-hidden border-b border-border/40 bg-card">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_0%_0%,oklch(0.42_0.09_165_/_0.12),transparent)]"
          aria-hidden
        />
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("bookings.backHome")}
            </Link>
            <span className="text-muted-foreground/50" aria-hidden>
              ·
            </span>
            <Link
              href={`/packages/${slug}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
              data-testid="book-back-to-package"
            >
              {pkg.title}
            </Link>
          </div>
          <div className="mt-4 max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">
              {t("bookings.publicCreateTitle")}
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
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
                {formatPrice(pkg.price)}
                <span className="text-xs font-normal opacity-90">{t("packages.perPerson")}</span>
              </span>
              {pkg.durationDays ? (
                <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  {pkg.durationDays} {t("packages.days")}
                </span>
              ) : null}
              {pkg.departureCity ? (
                <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  {pkg.departureCity}
                </span>
              ) : null}
            </div>
          </div>

          {galleryUrls.length > 0 ? (
            <div className="mt-6 max-w-3xl" data-testid="book-media-strip">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("bookings.galleryLabel")}
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

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={handleSubmit} noValidate id="public-booking-form">
            <div className="rounded-xl border border-border bg-card p-6 space-y-8 shadow-sm">
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                  {t("bookings.fields.section.booking")}
                </h2>

                <div className="space-y-2">
                  <label
                    htmlFor="departureDate"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("bookings.fields.departureDate")} *
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSubmitting || isPaying}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.departureDate && "text-muted-foreground",
                        )}
                      >
                        {form.departureDate
                          ? formatDisplayDate(form.departureDate)
                          : t("bookings.pickDate")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          form.departureDate
                            ? new Date(form.departureDate + "T00:00:00")
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            const yyyy = date.getFullYear();
                            const mm = String(date.getMonth() + 1).padStart(2, "0");
                            const dd = String(date.getDate()).padStart(2, "0");
                            updateField("departureDate", `${yyyy}-${mm}-${dd}`);
                          }
                        }}
                        disabled={(date) => {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, "0");
                          const dd = String(date.getDate()).padStart(2, "0");
                          return !availableDateSet.has(`${yyyy}-${mm}-${dd}`);
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.departureDate && (
                    <p className="text-sm text-destructive">{fieldErrors.departureDate}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="travelers" className="block text-sm font-medium text-foreground">
                    {t("bookings.fields.travelers")} *
                  </label>
                  <Input
                    id="travelers"
                    type="number"
                    min={1}
                    value={form.travelers}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateField("travelers", isNaN(val) ? 1 : Math.max(1, val));
                    }}
                    disabled={isSubmitting || isPaying}
                    className={inputClass("travelers")}
                  />
                  {fieldErrors.travelers && (
                    <p className="text-sm text-destructive">{fieldErrors.travelers}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-foreground">
                    {t("bookings.fields.totalPrice")}
                  </label>
                  <div className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-foreground">
                    {formatPrice(totalPrice)}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                    {t("bookings.fields.notes")}
                  </label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    disabled={isSubmitting || isPaying}
                    className="resize-none"
                  />
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                  {t("bookings.fields.section.customer")}
                </h2>

                <div className="space-y-2">
                  <label
                    htmlFor="customerName"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("bookings.fields.customerName")} *
                  </label>
                  <Input
                    id="customerName"
                    type="text"
                    value={form.customerName}
                    onChange={(e) => updateField("customerName", e.target.value)}
                    required
                    disabled={isSubmitting || isPaying}
                    className={inputClass("customerName")}
                  />
                  {fieldErrors.customerName && (
                    <p className="text-sm text-destructive">{fieldErrors.customerName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="customerEmail"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.customerEmail")}
                    </label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => updateField("customerEmail", e.target.value)}
                      disabled={isSubmitting || isPaying}
                      className={inputClass("customerEmail")}
                    />
                    {fieldErrors.customerEmail && (
                      <p className="text-sm text-destructive">{fieldErrors.customerEmail}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="customerPhone"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.customerPhone")}
                    </label>
                    <Input
                      id="customerPhone"
                      type="tel"
                      value={form.customerPhone}
                      onChange={(e) => updateField("customerPhone", e.target.value)}
                      disabled={isSubmitting || isPaying}
                      className={inputClass("customerPhone")}
                    />
                    {fieldErrors.customerPhone && (
                      <p className="text-sm text-destructive">{fieldErrors.customerPhone}</p>
                    )}
                  </div>
                </div>
              </section>

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              <div className="hidden items-center gap-4 border-t border-border pt-4 sm:flex">
                <Button type="submit" disabled={isSubmitting || isPaying}>
                  {isPaying
                    ? t("bookings.processingPayment")
                    : isSubmitting
                      ? t("bookings.saving")
                      : t("bookings.save")}
                </Button>
                <Link href="/">
                  <Button type="button" variant="outline" disabled={isSubmitting || isPaying}>
                    {t("bookings.backHome")}
                  </Button>
                </Link>
              </div>

              {isPaying && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-6 text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm font-medium text-foreground">
                    {t("bookings.processingPaymentMessage")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("bookings.processingPaymentHint")}
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-card/95 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-card/85">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">{pkg.title}</p>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {formatPrice(totalPrice)}
              <span className="ms-1 text-xs font-normal text-muted-foreground">
                × {form.travelers}
              </span>
            </p>
          </div>
          <Button
            type="submit"
            form="public-booking-form"
            disabled={isSubmitting || isPaying}
            className="shrink-0 shadow-md"
          >
            {isPaying
              ? t("bookings.processingPayment")
              : isSubmitting
                ? t("bookings.saving")
                : t("bookings.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

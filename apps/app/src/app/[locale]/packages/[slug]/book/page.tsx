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
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

interface BookingForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  departureDate: string;
  travelers: number;
  notes: string;
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
  const locale = params.locale as string;

  const [form, setForm] = useState<BookingForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const packageQuery = useQuery(trpc.packages.getBySlug.queryOptions({ slug }));

  const createMutation = useMutation(
    trpc.bookings.createPublic.mutationOptions({
      onSuccess: (data) => {
        toast.success(t("bookings.createSuccess"));
        router.push(`/${locale}/packages/${slug}/book/success?bookingId=${data.id}`);
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const isSubmitting = createMutation.isPending;

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

  /* ------------------------------------------------------------------ */
  /*  Error state                                                        */
  /* ------------------------------------------------------------------ */
  if (packageQuery.isError) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link
              href={`/${locale}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; {t("bookings.backToList")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">{t("common.error")}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {packageQuery.error?.message || t("common.error")}
            </p>
            <Link
              href={`/${locale}`}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              &larr; {t("bookings.backToList")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Not found state                                                    */
  /* ------------------------------------------------------------------ */
  if (!packageQuery.data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border/40 bg-card">
          <div className="container mx-auto px-4 lg:px-8 py-6">
            <Link
              href={`/${locale}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; {t("bookings.backToList")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">{t("packages.title")}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">{t("bookings.notFound")}</p>
            <Link
              href={`/${locale}`}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              &larr; {t("bookings.backToList")}
            </Link>
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
              href={`/${locale}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              &larr; {t("bookings.backToList")}
            </Link>
            <h1 className="text-2xl font-semibold text-foreground mt-2">{pkg.title}</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 lg:px-8 py-8">
          <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              No available dates for this package. Please check back later or contact us.
            </p>
            <Link
              href={`/${locale}`}
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              &larr; {t("bookings.backToList")}
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
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card">
        <div className="container mx-auto px-4 lg:px-8 py-6">
          <Link
            href={`/${locale}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; {t("bookings.backToList")}
          </Link>
          <h1 className="text-2xl font-semibold text-foreground mt-2">{pkg.title}</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 rounded-lg border border-border bg-card p-6">
            <div className="space-y-3">
              <h2 className="text-lg font-medium text-foreground">{pkg.title}</h2>
              {pkg.description && (
                <p className="text-sm text-muted-foreground leading-relaxed">{pkg.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {formatPrice(pkg.price)}
                </span>
                {pkg.durationDays && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {pkg.durationDays} {t("packages.days")}
                  </span>
                )}
                {pkg.departureCity && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {pkg.departureCity}
                  </span>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="rounded-lg border border-border bg-card p-6 space-y-8">
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
                        disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                      disabled={isSubmitting}
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
                      disabled={isSubmitting}
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

              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("bookings.saving") : t("bookings.save")}
                </Button>
                <Link href={`/${locale}`}>
                  <Button type="button" variant="outline" disabled={isSubmitting}>
                    {t("bookings.backToList")}
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

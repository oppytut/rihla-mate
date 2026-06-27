"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed";

type BookingForm = {
  packageId: string;
  departureDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelers: number;
  totalPrice: string;
  status: BookingStatus;
  paymentRef: string;
  notes: string;
};

const initialForm: BookingForm = {
  packageId: "",
  departureDate: "",
  customerName: "",
  customerEmail: "",
  customerPhone: "",
  travelers: 1,
  totalPrice: "",
  status: "pending",
  paymentRef: "",
  notes: "",
};

function formatDateForDisplay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function BookingFormContent({
  initialData,
  isEditMode,
  bookingId,
}: {
  initialData: BookingForm | null;
  isEditMode: boolean;
  bookingId: string;
}) {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();

  const [form, setForm] = useState<BookingForm>(initialData || initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const packagesQuery = useQuery(
    trpc.packages.list.queryOptions({ limit: 100 })
  );

  useEffect(() => {
    document.title = `${isEditMode ? t("bookings.editTitle") : t("bookings.createTitle")} - Rihla Mate`;
  }, [isEditMode, t]);

  const updateMutation = useMutation(
    trpc.bookings.update.mutationOptions({
      onSuccess: () => {
        window.alert(t("bookings.updateSuccess"));
        router.push("/dashboard/bookings");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    })
  );

  const isSubmitting = updateMutation.isPending;

  const updateField = <K extends keyof BookingForm>(
    field: K,
    value: BookingForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let hasErrors = false;

    if (!form.packageId.trim()) {
      errors.packageId = t("bookings.validation.packageRequired");
      hasErrors = true;
    }

    if (!form.departureDate.trim()) {
      errors.departureDate = t("bookings.validation.dateRequired");
      hasErrors = true;
    }

    if (!form.customerName.trim()) {
      errors.customerName = t("bookings.validation.customerNameRequired");
      hasErrors = true;
    }

    if (!form.totalPrice.trim()) {
      errors.totalPrice = t("bookings.validation.priceRequired");
      hasErrors = true;
    } else if (!/^\d+(\.\d{1,2})?$/.test(form.totalPrice)) {
      errors.totalPrice = t("bookings.validation.priceInvalid");
      hasErrors = true;
    }

    if (form.travelers < 1) {
      errors.travelers = t("bookings.validation.travelersMin");
      hasErrors = true;
    }

    setFieldErrors(errors);
    return !hasErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    updateMutation.mutate({
      id: bookingId,
      packageId: form.packageId,
      departureDate: form.departureDate,
      customerName: form.customerName,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
      travelers: form.travelers,
      totalPrice: form.totalPrice,
      status: form.status,
      paymentRef: form.paymentRef || undefined,
      notes: form.notes || undefined,
    });
  };

  const selectedDate = form.departureDate
    ? new Date(form.departureDate + "T00:00:00")
    : undefined;

  return (
    <div className="min-h-screen bg-background antialiased">
      <div className="lg:ml-64">
        <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/bookings"
              data-testid="bookings-back-to-list"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("bookings.backToList")}
            </Link>
          </div>
          <h1 className="text-2xl font-semibold text-foreground mt-2" data-testid="page-heading">
            {t("bookings.editTitle")}
          </h1>
        </header>

        <div className="px-4 lg:px-8 py-6">
          <form onSubmit={handleSubmit} className="max-w-3xl">
            <div className="bg-card border border-border rounded-lg p-6 space-y-8">
              <section className="space-y-4">
                <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                  {t("bookings.fields.section.booking")}
                </h2>

                <div className="space-y-2">
                  <label
                    htmlFor="packageId"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("bookings.fields.package")} *
                  </label>
                  <select
                    id="packageId"
                    value={form.packageId}
                    onChange={(e) => updateField("packageId", e.target.value)}
                    required
                    disabled={isSubmitting}
                    data-testid="booking-package"
                    aria-label={t("bookings.fields.package")}
                    aria-describedby={fieldErrors.packageId ? "packageId-error" : undefined}
                    className={cn(
                      "w-full px-3 py-2 bg-background border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                      fieldErrors.packageId ? "border-destructive" : "border-border"
                    )}
                  >
                    <option value="">{t("bookings.selectPackage")}</option>
                    {packagesQuery.data?.items.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.title}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.packageId && (
                    <p id="packageId-error" className="text-sm text-destructive">
                      {fieldErrors.packageId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="departureDate"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("bookings.fields.departureDate")} *
                  </label>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        id="departureDate"
                        disabled={isSubmitting}
                        data-testid="booking-departure-date"
                        aria-label={t("bookings.fields.departureDate")}
                        aria-describedby={fieldErrors.departureDate ? "departureDate-error" : undefined}
                        className={cn(
                          "w-full px-3 py-2 bg-background border rounded-md text-left text-foreground flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                          fieldErrors.departureDate ? "border-destructive" : "border-border"
                        )}
                      >
                        <span className={form.departureDate ? "" : "text-muted-foreground"}>
                          {form.departureDate
                            ? formatDateForDisplay(new Date(form.departureDate + "T00:00:00"))
                            : t("bookings.noDateSelected")}
                        </span>
                        <CalendarIcon className="size-4 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            updateField("departureDate", formatDateForStorage(date));
                          }
                          setCalendarOpen(false);
                        }}
                        autoFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {fieldErrors.departureDate && (
                    <p id="departureDate-error" className="text-sm text-destructive">
                      {fieldErrors.departureDate}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="travelers"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.travelers")} *
                    </label>
                    <input
                      id="travelers"
                      type="number"
                      min={1}
                      value={form.travelers}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        updateField("travelers", isNaN(val) ? 0 : val);
                      }}
                      required
                      disabled={isSubmitting}
                      data-testid="booking-travelers"
                      aria-label={t("bookings.fields.travelers")}
                      aria-describedby={fieldErrors.travelers ? "travelers-error" : undefined}
                      className={cn(
                        "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                        fieldErrors.travelers ? "border-destructive" : "border-border"
                      )}
                    />
                    {fieldErrors.travelers && (
                      <p id="travelers-error" className="text-sm text-destructive">
                        {fieldErrors.travelers}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="status"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.status")}
                    </label>
                    <select
                      id="status"
                      value={form.status}
                      onChange={(e) => updateField("status", e.target.value as BookingStatus)}
                      disabled={isSubmitting}
                      data-testid="booking-status"
                      aria-label={t("bookings.fields.status")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="pending">{t("bookings.status.pending")}</option>
                      <option value="confirmed">{t("bookings.status.confirmed")}</option>
                      <option value="cancelled">{t("bookings.status.cancelled")}</option>
                      <option value="completed">{t("bookings.status.completed")}</option>
                    </select>
                  </div>
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
                  <input
                      id="customerName"
                      type="text"
                      value={form.customerName}
                      onChange={(e) => updateField("customerName", e.target.value)}
                      required
                      disabled={isSubmitting}
                      data-testid="booking-customer-name"
                      aria-label={t("bookings.fields.customerName")}
                    aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined}
                    className={cn(
                      "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                      fieldErrors.customerName ? "border-destructive" : "border-border"
                    )}
                  />
                  {fieldErrors.customerName && (
                    <p id="customerName-error" className="text-sm text-destructive">
                      {fieldErrors.customerName}
                    </p>
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
                    <input
                      id="customerEmail"
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => updateField("customerEmail", e.target.value)}
                      disabled={isSubmitting}
                      data-testid="booking-customer-email"
                      aria-label={t("bookings.fields.customerEmail")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="customerPhone"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.customerPhone")}
                    </label>
                    <input
                      id="customerPhone"
                      type="tel"
                      value={form.customerPhone}
                      onChange={(e) => updateField("customerPhone", e.target.value)}
                      disabled={isSubmitting}
                      data-testid="booking-customer-phone"
                      aria-label={t("bookings.fields.customerPhone")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                  {t("bookings.fields.section.payment")}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="totalPrice"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.totalPrice")} *
                    </label>
                    <input
                      id="totalPrice"
                      type="text"
                      value={form.totalPrice}
                      onChange={(e) => updateField("totalPrice", e.target.value)}
                      required
                      disabled={isSubmitting}
                      placeholder="1500000"
                      data-testid="booking-total-price"
                      aria-label={t("bookings.fields.totalPrice")}
                      aria-describedby={fieldErrors.totalPrice ? "totalPrice-error" : undefined}
                      className={cn(
                        "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                        fieldErrors.totalPrice ? "border-destructive" : "border-border"
                      )}
                    />
                    {fieldErrors.totalPrice && (
                      <p id="totalPrice-error" className="text-sm text-destructive">
                        {fieldErrors.totalPrice}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="paymentRef"
                      className="block text-sm font-medium text-foreground"
                    >
                      {t("bookings.fields.paymentRef")}
                    </label>
                    <input
                      id="paymentRef"
                      type="text"
                      value={form.paymentRef}
                      onChange={(e) => updateField("paymentRef", e.target.value)}
                      disabled={isSubmitting}
                      aria-label={t("bookings.fields.paymentRef")}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-foreground"
                  >
                    {t("bookings.fields.notes")}
                  </label>
                  <textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={3}
                    disabled={isSubmitting}
                    data-testid="booking-notes"
                    aria-label={t("bookings.fields.notes")}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
                  />
                </div>
              </section>

              {submitError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-sm text-destructive">{submitError}</p>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t border-border">
                <Button type="submit" disabled={isSubmitting} data-testid="booking-submit">
                  {isSubmitting
                    ? t("bookings.saving")
                    : t("bookings.save")}
                </Button>
                <Link href="/dashboard/bookings">
                  <Button type="button" variant="outline" disabled={isSubmitting} data-testid="booking-cancel">
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

function EditBookingPage({ bookingId }: { bookingId: string }) {
  const trpc = useTRPC();
  const bookingQuery = useQuery(
    trpc.bookings.getById.queryOptions({ id: bookingId })
  );

  const [initialData, setInitialData] = useState<BookingForm | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (bookingQuery.data && !initialized.current) {
      const booking = bookingQuery.data;
      setInitialData({
        packageId: booking.packageId ?? "",
        departureDate: booking.departureDate ?? "",
        customerName: booking.customerName ?? "",
        customerEmail: booking.customerEmail ?? "",
        customerPhone: booking.customerPhone ?? "",
        travelers: booking.travelers ?? 1,
        totalPrice: booking.totalPrice ?? "",
        status: (booking.status as BookingStatus) ?? "pending",
        paymentRef: booking.paymentRef ?? "",
        notes: booking.notes ?? "",
      });
      initialized.current = true;
    }
  }, [bookingQuery.data]);

  if (bookingQuery.isLoading || !initialData) {
    return (
      <div className="min-h-screen bg-background antialiased">
        <div className="lg:ml-64">
          <div className="px-4 lg:px-8 py-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-32 bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
                <div className="h-10 w-full bg-muted rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bookingQuery.isError) {
    return (
      <div className="min-h-screen bg-background antialiased">
        <div className="lg:ml-64">
          <div className="px-4 lg:px-8 py-6">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
              <p className="text-sm text-destructive">
                Failed to load booking: {bookingQuery.error?.message}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BookingFormContent
      initialData={initialData}
      isEditMode={true}
      bookingId={bookingId}
    />
  );
}

export default function BookingFormPage() {
  const params = useParams();
  const bookingId = params.id as string;

  return <EditBookingPage bookingId={bookingId} />;
}

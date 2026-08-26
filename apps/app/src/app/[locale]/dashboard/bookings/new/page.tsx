"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/utils/format";
import { validateBooking } from "@/lib/utils/validation";
import { useState, useEffect } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { toast } from "sonner";

type BookingForm = {
  packageId: string;
  departureDate: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelers: number;
  totalPrice: string;
  status: string;
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

export default function BookingCreatePage() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const router = useRouter();

  const [form, setForm] = useState<BookingForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t("bookings.createTitle")}`;
  }, [t]);

  const packagesQuery = useQuery(trpc.packages.list.queryOptions({ page: 1, limit: 100 }));

  const createMutation = useMutation(
    trpc.bookings.create.mutationOptions({
      onSuccess: () => {
        toast.success(t("bookings.createSuccess"));
        router.push("/dashboard/bookings");
      },
      onError: (error) => {
        setSubmitError(error.message || t("common.error"));
      },
    }),
  );

  const isSubmitting = createMutation.isPending;

  const updateField = <K extends keyof BookingForm>(field: K, value: BookingForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSubmitError(null);
  };

  const validateForm = (): boolean => {
    const result = validateBooking(
      {
        packageId: form.packageId,
        departureDate: form.departureDate,
        customerName: form.customerName,
        totalPrice: form.totalPrice,
        travelers: form.travelers,
        customerEmail: form.customerEmail || undefined,
        customerPhone: form.customerPhone || undefined,
        status: form.status,
      },
      t,
    );
    const errorMap: Record<string, string> = {
      customerName: t("bookings.validation.customerNameRequired"),
      packageId: t("bookings.validation.packageRequired"),
      departureDate: t("bookings.validation.dateRequired"),
      totalPrice: t("bookings.validation.priceRequired"),
      travelers: t("bookings.validation.travelersMin"),
      customerEmail: t("bookings.validation.emailInvalid"),
      customerPhone: t("bookings.validation.phoneInvalid"),
      status: t("bookings.validation.statusInvalid"),
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
      packageId: form.packageId,
      departureDate: form.departureDate,
      customerName: form.customerName,
      customerEmail: form.customerEmail || undefined,
      customerPhone: form.customerPhone || undefined,
      travelers: form.travelers,
      totalPrice: form.totalPrice,
      status: form.status as "pending" | "confirmed" | "cancelled" | "completed" | "paid",
      paymentRef: form.paymentRef || undefined,
      notes: form.notes || undefined,
    };

    createMutation.mutate(payload);
  };

  const packages = packagesQuery.data?.items ?? [];

  return (
    <>
      <PageHeader
        title={t("bookings.createTitle")}
        leading={
          <Link
            href="/dashboard/bookings"
            data-testid="bookings-back-to-list"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bookings.backToList")}
          </Link>
        }
      />

      <div className="px-4 lg:px-8 py-6">
        <form onSubmit={handleSubmit} noValidate className="max-w-3xl">
          <div className="bg-card border border-border rounded-lg p-6 space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("bookings.fields.section.booking")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="packageId" className="block text-sm font-medium text-foreground">
                  {t("bookings.fields.package")} *
                </label>
                <NativeSelect
                  id="packageId"
                  data-testid="booking-package"
                  value={form.packageId}
                  onValueChange={(value) => updateField("packageId", value)}
                  disabled={isSubmitting}
                  aria-label={t("bookings.fields.package")}
                  aria-describedby={fieldErrors.packageId ? "packageId-error" : undefined}
                  aria-invalid={Boolean(fieldErrors.packageId)}
                  placeholder={t("bookings.selectPackage")}
                  triggerClassName={fieldErrors.packageId ? "border-destructive" : undefined}
                  options={packages.map((pkg) => ({
                    value: pkg.id,
                    label: pkg.title,
                  }))}
                />
                {fieldErrors.packageId && (
                  <p
                    id="packageId-error"
                    data-testid="validation-error-packageId"
                    className="text-sm text-destructive"
                  >
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="booking-departure-date"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !form.departureDate && "text-muted-foreground",
                      )}
                      aria-label={t("bookings.fields.departureDate")}
                      aria-describedby={
                        fieldErrors.departureDate ? "departureDate-error" : undefined
                      }
                    >
                      {form.departureDate
                        ? formatDisplayDate(form.departureDate, locale)
                        : t("bookings.pickDate")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        form.departureDate ? new Date(form.departureDate + "T00:00:00") : undefined
                      }
                      onSelect={(date) => {
                        if (date) {
                          const yyyy = date.getFullYear();
                          const mm = String(date.getMonth() + 1).padStart(2, "0");
                          const dd = String(date.getDate()).padStart(2, "0");
                          updateField("departureDate", `${yyyy}-${mm}-${dd}`);
                        }
                      }}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
                {fieldErrors.departureDate && (
                  <p
                    id="departureDate-error"
                    data-testid="validation-error-departureDate"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.departureDate}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="status" className="block text-sm font-medium text-foreground">
                    {t("bookings.fields.status")}
                  </label>
                  <NativeSelect
                    id="status"
                    value={form.status}
                    onValueChange={(value) => updateField("status", value)}
                    disabled={isSubmitting}
                    data-testid="booking-status"
                    aria-label={t("bookings.fields.status")}
                    options={[
                      { value: "pending", label: t("bookings.status.pending") },
                      { value: "confirmed", label: t("bookings.status.confirmed") },
                      { value: "cancelled", label: t("bookings.status.cancelled") },
                      { value: "completed", label: t("bookings.status.completed") },
                      { value: "paid", label: t("bookings.status.paid") },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="travelers" className="block text-sm font-medium text-foreground">
                    {t("bookings.fields.travelers")} *
                  </label>
                  <Input
                    id="travelers"
                    type="number"
                    min={1}
                    data-testid="booking-travelers"
                    value={form.travelers}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      updateField("travelers", isNaN(val) ? 0 : val);
                    }}
                    required
                    disabled={isSubmitting}
                    aria-label={t("bookings.fields.travelers")}
                    aria-describedby={fieldErrors.travelers ? "travelers-error" : undefined}
                    className={cn(fieldErrors.travelers ? "border-destructive" : "border-border")}
                  />
                  {fieldErrors.travelers && (
                    <p
                      id="travelers-error"
                      data-testid="validation-error-travelers"
                      className="text-sm text-destructive"
                    >
                      {fieldErrors.travelers}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="totalPrice" className="block text-sm font-medium text-foreground">
                  {t("bookings.fields.totalPrice")} *
                </label>
                <input
                  id="totalPrice"
                  type="text"
                  data-testid="booking-total-price"
                  value={form.totalPrice}
                  onChange={(e) => updateField("totalPrice", e.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="1500000"
                  aria-label={t("bookings.fields.totalPrice")}
                  aria-describedby={fieldErrors.totalPrice ? "totalPrice-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                    fieldErrors.totalPrice ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.totalPrice && (
                  <p
                    id="totalPrice-error"
                    data-testid="validation-error-totalPrice"
                    className="text-sm text-destructive"
                  >
                    {fieldErrors.totalPrice}
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                {t("bookings.fields.section.customer")}
              </h2>

              <div className="space-y-2">
                <label htmlFor="customerName" className="block text-sm font-medium text-foreground">
                  {t("bookings.fields.customerName")} *
                </label>
                <input
                  id="customerName"
                  type="text"
                  data-testid="booking-customer-name"
                  value={form.customerName}
                  onChange={(e) => updateField("customerName", e.target.value)}
                  required
                  disabled={isSubmitting}
                  aria-label={t("bookings.fields.customerName")}
                  aria-describedby={fieldErrors.customerName ? "customerName-error" : undefined}
                  className={cn(
                    "w-full px-3 py-2 bg-background border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed",
                    fieldErrors.customerName ? "border-destructive" : "border-border",
                  )}
                />
                {fieldErrors.customerName && (
                  <p
                    id="customerName-error"
                    data-testid="validation-error-customerName"
                    className="text-sm text-destructive"
                  >
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

              <div className="space-y-2">
                <label htmlFor="paymentRef" className="block text-sm font-medium text-foreground">
                  {t("bookings.fields.paymentRef")}
                </label>
                <input
                  id="paymentRef"
                  type="text"
                  value={form.paymentRef}
                  onChange={(e) => updateField("paymentRef", e.target.value)}
                  disabled={isSubmitting}
                  data-testid="booking-payment-ref"
                  aria-label={t("bookings.fields.paymentRef")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="notes" className="block text-sm font-medium text-foreground">
                  {t("bookings.fields.notes")}
                </label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  data-testid="booking-notes"
                  aria-label={t("bookings.fields.notes")}
                  className="resize-none"
                />
              </div>
            </section>

            {submitError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                <p className="text-sm text-destructive">{submitError}</p>
              </div>
            )}

            <div className="flex items-center gap-4 pt-4 border-t border-border">
              <Button type="submit" data-testid="booking-submit" disabled={isSubmitting}>
                {isSubmitting ? t("bookings.saving") : t("bookings.save")}
              </Button>
              <Link href="/dashboard/bookings">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  data-testid="booking-cancel"
                >
                  {t("bookings.backToList")}
                </Button>
              </Link>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

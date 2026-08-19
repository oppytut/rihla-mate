"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils/format";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

function getTransactionStatusBadge(status: string | null | undefined): {
  className: string;
  labelKey: string;
} {
  switch (status) {
    case "settlement":
    case "capture":
      return {
        className: "bg-success/10 text-success",
        labelKey: "bookings.paymentStatus.paid",
      };
    case "pending":
      return {
        className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
        labelKey: "bookings.paymentStatus.pending",
      };
    case "cancel":
    case "deny":
      return {
        className: "bg-red-500/10 text-red-600 dark:text-red-400",
        labelKey: "bookings.paymentStatus.cancelled",
      };
    case "expire":
      return {
        className: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
        labelKey: "bookings.paymentStatus.expired",
      };
    case "failure":
    case "error":
      return {
        className: "bg-red-500/10 text-red-600 dark:text-red-400",
        labelKey: "bookings.paymentStatus.failed",
      };
    default:
      return {
        className: "bg-muted text-muted-foreground",
        labelKey: "bookings.paymentStatus.unknown",
      };
  }
}

function intlLocale(locale: string): string {
  if (locale.startsWith("en")) return "en-US";
  if (locale.startsWith("ar")) return "ar-SA";
  return "id-ID";
}

function formatDateTime(value: string | Date | null | undefined, locale: string): string {
  if (!value) return "-";
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(intlLocale(locale), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return "-";
  }
}

function formatPaymentAmount(amount: number | string | null | undefined, locale: string): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  return formatPrice(num, "IDR", locale);
}

export default function PaymentStatusPage() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;
  const snapToastKeyRef = useRef<string | null>(null);

  const bookingQuery = useQuery({
    ...trpc.bookings.getById.queryOptions({ id: bookingId }),
    refetchInterval: (query) => {
      const b = query.state.data;
      if (!b) return false;
      const terminalTxn = ["settlement", "capture", "cancel", "deny", "expire", "failure", "error"];
      if (b.status === "paid" || b.status === "cancelled" || b.status === "completed") {
        return false;
      }
      if (b.transactionStatus && terminalTxn.includes(b.transactionStatus)) {
        return false;
      }
      return 3000;
    },
  });

  useEffect(() => {
    document.title = `${t("bookings.paymentStatus.title")} - Rihla Mate`;
  }, [t]);

  useEffect(() => {
    const urlStatus = searchParams.get("status");
    if (!urlStatus || !bookingQuery.data) return;
    const dbStatus = bookingQuery.data.status;
    const toastKind =
      urlStatus === "success" && dbStatus === "paid"
        ? "success"
        : urlStatus === "success" || urlStatus === "pending"
          ? "pending"
          : null;
    if (!toastKind) return;
    const toastKey = `${bookingId}:${urlStatus}:${toastKind}`;
    if (snapToastKeyRef.current === toastKey) return;
    snapToastKeyRef.current = toastKey;
    if (toastKind === "success") {
      toast.success(t("bookings.snap.success"));
      return;
    }
    toast.info(t("bookings.snap.pending"));
  }, [searchParams, t, bookingQuery.data, bookingId]);

  const backToBookings = (
    <Link
      href="/dashboard/bookings"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {t("bookings.backToList")}
    </Link>
  );

  if (bookingQuery.isLoading) {
    return (
      <>
        <PageHeader title={t("bookings.paymentStatus.title")} leading={backToBookings} />
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
              <div className="h-10 w-full bg-muted rounded" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (bookingQuery.isError) {
    return (
      <>
        <PageHeader title={t("bookings.paymentStatus.title")} leading={backToBookings} />
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {bookingQuery.error?.message || "Failed to load booking"}
            </p>
          </div>
        </div>
      </>
    );
  }

  const booking = bookingQuery.data;

  if (!booking) {
    return (
      <>
        <PageHeader title={t("bookings.paymentStatus.title")} leading={backToBookings} />
        <div className="px-4 lg:px-8 py-6">
          <div className="bg-card border border-border rounded-lg p-6 text-center">
            <p className="text-muted-foreground">Booking not found</p>
          </div>
        </div>
      </>
    );
  }

  const statusBadge = getTransactionStatusBadge(booking.transactionStatus);

  return (
    <>
      <PageHeader
        title={t("bookings.paymentStatus.title")}
        leading={
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bookings.backToList")}
          </Link>
        }
      />

      <div className="px-4 lg:px-8 py-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("bookings.paymentStatus.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium",
                    statusBadge.className,
                  )}
                  data-testid="payment-status-badge"
                >
                  {t(statusBadge.labelKey)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("bookings.payment.orderId")}</p>
                  <p className="text-foreground font-medium" data-testid="payment-order-id">
                    {booking.midtransOrderId || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("bookings.payment.transactionId")}
                  </p>
                  <p className="text-foreground font-medium" data-testid="payment-transaction-id">
                    {booking.transactionId || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("bookings.payment.method")}</p>
                  <p className="text-foreground font-medium" data-testid="payment-method">
                    {booking.paymentMethod || "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    {t("bookings.payment.grossAmount")}
                  </p>
                  <p className="text-foreground font-medium" data-testid="payment-amount">
                    {formatPaymentAmount(booking.grossAmount, locale)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("bookings.payment.paidAt")}</p>
                  <p className="text-foreground font-medium" data-testid="payment-paid-at">
                    {formatDateTime(booking.paidAt, locale)}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Button asChild data-testid="payment-back-to-booking">
                  <Link href={`/dashboard/bookings/${bookingId}`}>{t("bookings.backToList")}</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

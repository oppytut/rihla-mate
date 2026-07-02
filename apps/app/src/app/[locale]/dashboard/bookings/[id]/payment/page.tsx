"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";

function getTransactionStatusBadge(status: string | null | undefined): {
  className: string;
  labelKey: string;
} {
  switch (status) {
    case "settlement":
    case "capture":
      return {
        className: "bg-green-500/10 text-green-600 dark:text-green-400",
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

function formatPrice(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return "-";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
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

export default function PaymentStatusPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const params = useParams();
  const searchParams = useSearchParams();
  const bookingId = params.id as string;

  const bookingQuery = useQuery(trpc.bookings.getById.queryOptions({ id: bookingId }));

  useEffect(() => {
    document.title = `${t("bookings.paymentStatus.title")} - Rihla Mate`;
  }, [t]);

  useEffect(() => {
    if (searchParams.get("status") === "success") {
      toast.success(t("bookings.snap.success"));
    }
  }, [searchParams, t]);

  if (bookingQuery.isLoading) {
    return (
      <>
        <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-7 w-48 bg-muted rounded animate-pulse mt-2" />
        </header>
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
        <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
          <Link
            href="/dashboard/bookings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bookings.backToList")}
          </Link>
        </header>
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
        <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
          <Link
            href="/dashboard/bookings"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bookings.backToList")}
          </Link>
        </header>
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
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("bookings.backToList")}
          </Link>
        </div>
        <h1 className="text-2xl font-semibold text-foreground mt-2" data-testid="page-heading">
          {t("bookings.paymentStatus.title")}
        </h1>
      </header>

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
                    {formatPrice(booking.grossAmount)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t("bookings.payment.paidAt")}</p>
                  <p className="text-foreground font-medium" data-testid="payment-paid-at">
                    {formatDateTime(booking.paidAt)}
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

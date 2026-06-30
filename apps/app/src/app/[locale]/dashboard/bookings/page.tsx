"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { SnapPayment } from "@/components/payment/snap-payment";

const DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

export default function BookingsPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snapToken, setSnapToken] = useState<string | null>(null);
  const [payingBookingId, setPayingBookingId] = useState<string | null>(null);

  useEffect(() => {
    document.title = `${t("bookings.title")} - Rihla Mate`;
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [t]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, DEBOUNCE_MS);
  }, []);

  const bookingsQuery = useQuery(
    trpc.bookings.list.queryOptions({
      search: debouncedSearch || undefined,
      status: status || undefined,
      page,
      limit: PAGE_SIZE,
    }),
  );

  const deleteMutation = useMutation(
    trpc.bookings.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t("bookings.deleteSuccess"));
        bookingsQuery.refetch();
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
      },
    }),
  );

  const payMutation = useMutation(
    trpc.midtrans.createTransaction.mutationOptions({
      onSuccess: (result) => {
        if (result.token) {
          setSnapToken(result.token);
        } else {
          // Token is null when midtransOrderId already exists
          router.push(`/dashboard/bookings/${payingBookingId}/payment?status=success`);
          setPayingBookingId(null);
        }
      },
      onError: (error) => {
        toast.error(`${t("common.error")}: ${error.message}`);
        setPayingBookingId(null);
      },
    }),
  );

  const bookings = bookingsQuery.data?.items ?? [];
  const total = bookingsQuery.data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = search !== "" || status !== "";

  const formatPrice = (price: string | number) => {
    const num = typeof price === "string" ? parseFloat(price) : price;
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getStatusBadgeClass = (bookingStatus: string) => {
    switch (bookingStatus) {
      case "confirmed":
        return "bg-green-500/10 text-green-600 dark:text-green-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "cancelled":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "completed":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleDelete = (bookingId: string) => {
    if (window.confirm(t("bookings.deleteConfirm"))) {
      deleteMutation.mutate({ id: bookingId });
    }
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-semibold text-foreground" data-testid="page-heading">
            {t("bookings.title")}
          </h1>
          <Button asChild data-testid="bookings-add-new">
            <Link href="/dashboard/bookings/new">{t("bookings.addBooking")}</Link>
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            data-testid="bookings-search"
            placeholder={t("bookings.search")}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label={t("bookings.search")}
            className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            data-testid="bookings-status-filter"
            aria-label={t("bookings.allStatus")}
            className="px-3 py-2 text-sm bg-background border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
          >
            <option value="">{t("bookings.allStatus")}</option>
            <option value="pending">{t("bookings.status.pending")}</option>
            <option value="confirmed">{t("bookings.status.confirmed")}</option>
            <option value="cancelled">{t("bookings.status.cancelled")}</option>
            <option value="completed">{t("bookings.status.completed")}</option>
          </select>
        </div>

        {bookingsQuery.isError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-sm text-destructive">
              {t("common.error")}: {bookingsQuery.error?.message || "Failed to load bookings"}
            </p>
          </div>
        )}

        {bookingsQuery.isLoading && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.customer")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.package")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.date")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.travelers")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.total")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.status")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {[...Array(4)].map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3">
                        <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-8 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length === 0 && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            {hasFilters ? (
              <>
                <p className="text-muted-foreground mb-4">{t("bookings.noResults")}</p>
                <Button
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setStatus("");
                    setPage(1);
                  }}
                  data-testid="bookings-clear-filters"
                >
                  {t("bookings.clearFilters")}
                </Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground mb-4">{t("bookings.empty")}</p>
                <Button asChild data-testid="bookings-add-new-empty">
                  <Link href="/dashboard/bookings/new">{t("bookings.addBooking")}</Link>
                </Button>
              </>
            )}
          </div>
        )}

        {!bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length > 0 && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.customer")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.package")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.date")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.travelers")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.total")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.status")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t("bookings.columns.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <span className="block max-w-[200px] truncate">{booking.customerName}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="block max-w-[150px] truncate">
                          {booking.packageTitle || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(booking.departureDate)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{booking.travelers}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPrice(booking.totalPrice)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            getStatusBadgeClass(booking.status),
                          )}
                        >
                          {t(`bookings.status.${booking.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {booking.status === "pending" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setPayingBookingId(booking.id);
                                payMutation.mutate({ bookingId: booking.id });
                              }}
                              disabled={payMutation.isPending && payingBookingId === booking.id}
                              data-testid={`booking-pay-${booking.id}`}
                              aria-label={t("bookings.payNow")}
                            >
                              {payMutation.isPending && payingBookingId === booking.id
                                ? t("bookings.paying")
                                : t("bookings.payNow")}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`booking-edit-${booking.id}`}
                          >
                            <Link
                              href={`/dashboard/bookings/${booking.id}`}
                              aria-label={t("bookings.edit")}
                            >
                              {t("bookings.edit")}
                            </Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(booking.id)}
                            disabled={deleteMutation.isPending}
                            data-testid={`booking-delete-${booking.id}`}
                            aria-label={t("bookings.delete")}
                          >
                            {t("bookings.delete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground" data-testid="bookings-page-info">
                {t("bookings.pageInfo", { page, total: totalPages || 1 })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  data-testid="bookings-prev-page"
                  aria-label={t("common.previous")}
                >
                  {t("common.previous")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  data-testid="bookings-next-page"
                  aria-label={t("common.next")}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SnapPayment
        token={snapToken}
        onSuccess={() => {
          toast.success(t("bookings.snap.success"));
          router.push(`/dashboard/bookings/${payingBookingId}/payment?status=success`);
          setSnapToken(null);
          setPayingBookingId(null);
        }}
        onError={() => {
          toast.error(t("bookings.snap.error"));
          setSnapToken(null);
          setPayingBookingId(null);
        }}
        onClose={() => {
          toast.info(t("bookings.snap.close"));
          setSnapToken(null);
          setPayingBookingId(null);
        }}
      />
    </>
  );
}

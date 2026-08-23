"use client";

import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery } from "@tanstack/react-query";

const TERMINAL_TXN = ["settlement", "capture", "cancel", "deny", "expire", "failure", "error"];

export function BookingSuccessView() {
  const t = useTranslations();
  const trpc = useTRPC();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const bookingId = searchParams.get("bookingId");
  const urlStatus = searchParams.get("status");

  const statusQuery = useQuery({
    ...trpc.bookings.getPublicStatus.queryOptions({
      id: bookingId ?? "00000000-0000-0000-0000-000000000000",
    }),
    enabled: Boolean(bookingId),
    refetchInterval: (query) => {
      const b = query.state.data;
      if (!b) return false;
      if (b.status === "paid" || b.status === "cancelled" || b.status === "completed") {
        return false;
      }
      if (b.transactionStatus && TERMINAL_TXN.includes(b.transactionStatus)) {
        return false;
      }
      return 3000;
    },
  });

  const dbStatus = statusQuery.data?.status;
  const isPaid = dbStatus === "paid" || dbStatus === "completed";
  const isPending = isPaid
    ? false
    : urlStatus === "pending" || Boolean(statusQuery.data) || !dbStatus;

  const nextSteps = [
    t("bookings.successStep1"),
    t("bookings.successStep2"),
    t("bookings.successStep3"),
  ];

  const title = isPaid ? t("bookings.successTitle") : t("bookings.successPendingTitle");
  const message = isPaid ? t("bookings.successMessage") : t("bookings.successPendingMessage");

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden border-b border-border/40 bg-card">
        <div
          className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_80%_at_100%_0%,oklch(0.48_0.12_155_/_0.14),transparent)]"
          aria-hidden
        />
        <div className="container mx-auto px-4 py-6 lg:px-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("bookings.backHome")}
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 lg:px-8">
        <div className="mx-auto max-w-lg space-y-6">
          <Card className="overflow-hidden border-border/80 shadow-sm">
            <div className={isPending ? "h-1.5 bg-accent" : "h-1.5 bg-success"} aria-hidden />
            <CardHeader className="pb-2 text-center">
              <div
                className={
                  isPending
                    ? "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 ring-4 ring-accent/10"
                    : "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 ring-4 ring-success/10"
                }
              >
                {isPending ? (
                  <svg
                    className="h-8 w-8 text-accent-foreground"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-8 w-8 text-success"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <CardTitle className="text-xl text-foreground">{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>

              <div
                className="rounded-xl border border-border bg-muted/30 p-4 text-start"
                data-testid="booking-receipt"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("bookings.successReceiptTitle")}
                </p>
                <dl className="mt-3 space-y-3">
                  {bookingId ? (
                    <div>
                      <dt className="text-xs text-muted-foreground">
                        {t("bookings.successBookingId")}
                      </dt>
                      <dd className="mt-1 break-all font-mono text-sm font-semibold text-foreground">
                        {bookingId}
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      {t("bookings.successPackage")}
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {statusQuery.data?.packageTitle ?? slug}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-xl border border-border/80 bg-card p-4 text-start">
                <p className="text-sm font-medium text-foreground">
                  {t("bookings.successWhatsNext")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("bookings.successNextSteps")}
                </p>
                <ol className="mt-3 space-y-2">
                  {nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 leading-snug">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:justify-center">
                <Link href={`/packages/${slug}/book`}>
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t("bookings.bookAgain")}
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="w-full sm:w-auto">{t("landing.cta")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

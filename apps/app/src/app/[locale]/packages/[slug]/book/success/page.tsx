"use client";

import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function BookingSuccessPage() {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const bookingId = searchParams.get("bookingId");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card">
        <div className="container mx-auto px-4 py-6 lg:px-8">
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("bookings.backHome")}
          </Link>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader className="pb-2 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <svg
                  className="h-8 w-8 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle className="text-xl text-foreground">
                {t("bookings.createSuccess")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">{t("bookings.successMessage")}</p>

              {bookingId ? (
                <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-left">
                  <p className="text-xs text-muted-foreground">{t("email.booking.bookingId")}</p>
                  <p className="mt-1 break-all font-mono text-sm font-medium text-foreground">
                    {bookingId}
                  </p>
                </div>
              ) : null}

              <p className="text-sm text-muted-foreground">{t("bookings.successNextSteps")}</p>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
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

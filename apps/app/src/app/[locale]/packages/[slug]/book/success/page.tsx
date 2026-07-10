"use client";

import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function BookingSuccessPage() {
  const t = useTranslations();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;
  const slug = params.slug as string;
  const bookingId = searchParams.get("bookingId");

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
        </div>
      </header>

      <div className="container mx-auto px-4 lg:px-8 py-8">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-8 w-8 text-green-600"
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
              <p className="text-sm text-muted-foreground">{t("common.success")}</p>

              {bookingId && (
                <p className="text-xs text-muted-foreground">
                  {t("email.booking.bookingId")}{" "}
                  <span className="font-mono font-medium text-foreground">{bookingId}</span>
                </p>
              )}

              <div className="pt-4">
                <Link href={`/${locale}/packages/${slug}`}>
                  <Button variant="outline" className="mr-2">
                    {t("bookings.backToList")}
                  </Button>
                </Link>
                <Link href={`/${locale}`}>
                  <Button>{t("landing.cta")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

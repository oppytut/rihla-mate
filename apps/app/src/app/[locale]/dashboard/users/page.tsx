"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { Link } from "@/i18n/navigation";

export default function UsersPage() {
  const t = useTranslations();

  useEffect(() => {
    document.title = `${t("users.title")} - Rihla Mate`;
  }, [t]);

  return (
    <>
      <PageHeader title={t("users.title")} titleTestId="dashboard-heading" />

      <div className="px-4 lg:px-8 py-6">
        <div className="rounded-lg border border-border bg-card p-10 text-center sm:p-12">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted ring-4 ring-muted/50"
            aria-hidden
          >
            <svg
              className="h-6 w-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
          </div>
          <p className="text-base font-medium text-foreground">{t("users.empty")}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {t("users.emptyHint")}
          </p>
          <Button asChild variant="outline" className="mt-6" data-testid="users-back-overview">
            <Link href="/dashboard">{t("users.backToOverview")}</Link>
          </Button>
        </div>
      </div>
    </>
  );
}

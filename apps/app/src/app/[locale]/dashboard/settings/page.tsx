"use client";

import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations();

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <h1 data-testid="dashboard-heading" className="text-2xl font-semibold text-foreground">
          {t("settings.title")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <p className="text-muted-foreground">{t("settings.empty")}</p>
        </div>
      </div>
    </>
  );
}

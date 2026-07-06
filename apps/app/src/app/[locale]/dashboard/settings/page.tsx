"use client";

import { useTranslations } from "next-intl";
import { useTRPC } from "@/lib/trpc/react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

type SettingsMap = Record<string, unknown>;

const SETTING_KEYS = {
  general: ["appName", "appDescription", "contactEmail", "contactPhone", "address", "currency"],
  payment: ["midtransServerKey", "midtransClientKey", "midtransMerchantId", "midtransProduction"],
  email: ["resendApiKey", "resendFromEmail"],
  booking: ["bookingPrefix", "autoConfirm", "requirePayment"],
} as const;

type SectionKey = keyof typeof SETTING_KEYS;

function isTruthy(val: unknown): boolean {
  return val === "true" || val === true;
}

export default function SettingsPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const [form, setForm] = useState<SettingsMap>({});
  const [initialized, setInitialized] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey>("general");

  useEffect(() => {
    document.title = `${t("settings.title")} - Rihla Mate`;
  }, [t]);

  const settingsQuery = useQuery(trpc.settings.list.queryOptions());

  useEffect(() => {
    if (settingsQuery.data && !initialized) {
      setForm(settingsQuery.data);
      setInitialized(true);
    }
  }, [settingsQuery.data, initialized]);

  const saveMutation = useMutation(
    trpc.settings.set.mutationOptions({
      onSuccess: () => {
        toast.success(t("settings.saved"));
      },
      onError: (error) => {
        toast.error(error.message || t("settings.error"));
      },
    }),
  );

  const updateField = useCallback((key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const keys = SETTING_KEYS[activeSection];
    for (const key of keys) {
      if (form[key] !== undefined) {
        saveMutation.mutate({ key, value: form[key] });
      }
    }
  }, [activeSection, form, saveMutation]);

  const sections: { key: SectionKey; label: string }[] = [
    { key: "general", label: t("settings.sections.general") },
    { key: "payment", label: t("settings.sections.payment") },
    { key: "email", label: t("settings.sections.email") },
    { key: "booking", label: t("settings.sections.booking") },
  ];

  const renderField = (key: string) => {
    const rawValue = form[key];
    const strValue = typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
    const isBoolean =
      key === "midtransProduction" || key === "autoConfirm" || key === "requirePayment";
    const isPassword = key === "midtransServerKey" || key === "resendApiKey";

    if (isBoolean) {
      const checked = isTruthy(rawValue);
      return (
        <div key={key} className="flex items-center justify-between py-3">
          <label htmlFor={key} className="text-sm font-medium text-foreground">
            {t(`settings.fields.${key}`)}
          </label>
          <button
            id={key}
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => updateField(key, checked ? "false" : "true")}
            disabled={saveMutation.isPending}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50",
              checked ? "bg-primary" : "bg-input",
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow transition-transform",
                checked ? "translate-x-5" : "translate-x-0",
              )}
            />
          </button>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-2">
        <label htmlFor={key} className="block text-sm font-medium text-foreground">
          {t(`settings.fields.${key}`)}
        </label>
        <input
          id={key}
          type={isPassword ? "password" : "text"}
          value={strValue}
          onChange={(e) => updateField(key, e.target.value)}
          disabled={saveMutation.isPending}
          className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
    );
  };

  return (
    <>
      <header className="px-4 lg:px-8 py-6 border-b border-border bg-card">
        <h1 data-testid="dashboard-heading" className="text-2xl font-semibold text-foreground">
          {t("settings.title")}
        </h1>
      </header>

      <div className="px-4 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Section sidebar */}
          <nav className="w-48 shrink-0 space-y-1">
            {sections.map((section) => (
              <button
                key={section.key}
                type="button"
                onClick={() => setActiveSection(section.key)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-md transition-colors",
                  activeSection === section.key
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-primary/20 hover:text-foreground",
                )}
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Settings form */}
          <div className="flex-1 max-w-2xl">
            {settingsQuery.isLoading ? (
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-6 w-32 bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded" />
                  <div className="h-10 w-full bg-muted rounded" />
                </div>
              </div>
            ) : settingsQuery.isError ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <p className="text-sm text-destructive">
                  Error loading settings: {settingsQuery.error?.message}
                </p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <h2 className="text-lg font-medium text-foreground border-b border-border pb-2">
                  {sections.find((s) => s.key === activeSection)?.label}
                </h2>

                <div className="space-y-4">
                  {SETTING_KEYS[activeSection].map((key) => renderField(key))}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    data-testid="settings-save"
                  >
                    {saveMutation.isPending ? t("settings.saving") : t("settings.save")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

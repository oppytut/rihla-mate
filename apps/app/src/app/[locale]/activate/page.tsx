"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link } from "@/i18n/navigation";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { logger } from "@/lib/utils/logger";

export default function ActivatePage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const [licenseKey, setLicenseKey] = useState("");
  const [trialKey, setTrialKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const instanceIdRef = useRef(crypto.randomUUID());
  const [activateResult, setActivateResult] = useState<{
    plan?: string;
    expiresAt?: Date;
    seats?: number;
  } | null>(null);

  const startTrialMutation = useMutation(
    trpc.license.startTrial.mutationOptions({
      onSuccess: (data) => {
        setTrialKey(data.key);
        setError(null);
      },
      onError: (err) => {
        logger.error("startTrial failed", { component: "activate" }, err);
        setError(err.message || t("activate.trialFailed"));
      },
    }),
  );

  const activateMutation = useMutation(
    trpc.license.activate.mutationOptions({
      onSuccess: (data) => {
        setActivateResult({
          plan: data.plan,
          expiresAt: data.expiresAt,
          seats: data.seats,
        });
        setError(null);
      },
      onError: (err) => {
        logger.error("activate failed", { component: "activate" }, err);
        setError(err.message || t("activate.activateFailed"));
      },
    }),
  );

  const handleStartTrial = () => {
    startTrialMutation.mutate({ instanceId: instanceIdRef.current });
  };

  const handleActivate = () => {
    if (!licenseKey.trim()) return;
    setActivateResult(null);
    activateMutation.mutate({ licenseKey: licenseKey.trim() });
  };

  return (
    <AuthShell maxWidth="md">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("activate.title")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("activate.subtitle")}</p>
        <p className="mt-2 text-xs text-muted-foreground/90">{t("activate.secureNote")}</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label htmlFor="license-key" className="text-sm font-medium text-foreground">
            {t("activate.licenseKeyLabel")}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="license-key"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              data-testid="activate-license-key"
              placeholder={t("activate.licenseKeyPlaceholder")}
              className="flex-1 font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleActivate();
              }}
            />
            <Button
              onClick={handleActivate}
              disabled={!licenseKey.trim() || activateMutation.isPending}
              variant="default"
              data-testid="activate-submit"
              className="sm:shrink-0"
            >
              {activateMutation.isPending ? t("activate.activating") : t("activate.activate")}
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("activate.orDivider")}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleStartTrial}
            disabled={startTrialMutation.isPending}
            variant="outline"
            className="w-full"
            data-testid="activate-start-trial"
          >
            {startTrialMutation.isPending ? t("activate.startingTrial") : t("activate.startTrial")}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t("activate.trialNote")}</p>
        </div>

        {activateResult && (
          <div
            className="space-y-3 rounded-lg border border-success/25 bg-success/10 p-3"
            data-testid="activate-success"
          >
            <p className="text-sm font-medium text-foreground">{t("activate.activated")}</p>
            <div className="space-y-1 rounded-md bg-card/60 p-3">
              {activateResult.plan && (
                <p className="text-xs text-muted-foreground">
                  {t("activate.plan")}:{" "}
                  <span className="font-medium capitalize text-foreground">
                    {activateResult.plan}
                  </span>
                </p>
              )}
              {activateResult.expiresAt && (
                <p className="text-xs text-muted-foreground">
                  {t("activate.expires")}:{" "}
                  <span className="font-medium text-foreground">
                    {activateResult.expiresAt.toLocaleDateString()}
                  </span>
                </p>
              )}
              {activateResult.seats !== undefined && (
                <p className="text-xs text-muted-foreground">
                  {t("activate.seats")}:{" "}
                  <span className="font-medium text-foreground">{activateResult.seats}</span>
                </p>
              )}
            </div>
            <Button asChild className="w-full" data-testid="activate-go-sign-in">
              <Link href="/sign-in">{t("activate.goToSignIn")}</Link>
            </Button>
          </div>
        )}

        {trialKey && (
          <div
            className="space-y-3 rounded-lg border border-success/25 bg-success/10 p-3"
            data-testid="activate-trial-success"
          >
            <p className="text-sm font-medium text-foreground">{t("activate.trialStarted")}</p>
            <div className="rounded-md bg-card/60 p-3">
              <p className="mb-1 text-xs text-muted-foreground">{t("activate.trialKeyLabel")}</p>
              <code className="break-all font-mono text-sm text-foreground">{trialKey}</code>
            </div>
            <Button asChild className="w-full" data-testid="activate-trial-go-sign-in">
              <Link href="/sign-in">{t("activate.goToSignIn")}</Link>
            </Button>
          </div>
        )}

        {error && (
          <div
            className="rounded-md border border-destructive/20 bg-destructive/10 p-3"
            role="alert"
          >
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

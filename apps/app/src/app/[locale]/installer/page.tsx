"use client";

import { useState, useRef } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link } from "@/i18n/navigation";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { formatDateForDisplay } from "@/lib/utils/format";
import { logger } from "@/lib/utils/logger";

export default function InstallerPage() {
  const t = useTranslations();
  const locale = useLocale();
  const trpc = useTRPC();
  const [step, setStep] = useState(0);
  const instanceIdRef = useRef(crypto.randomUUID());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  const [licenseKey, setLicenseKey] = useState("");
  const [trialKey, setTrialKey] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [activateResult, setActivateResult] = useState<{
    plan?: string;
    expiresAt?: Date;
    seats?: number;
  } | null>(null);

  const [setupComplete, setSetupComplete] = useState(false);

  const systemCheckQuery = useQuery({
    ...trpc.installer.systemCheck.queryOptions(),
    retry: 2,
    retryDelay: 1500,
    staleTime: 30_000,
  });

  const setupAdminMutation = useMutation(
    trpc.installer.setupAdmin.mutationOptions({
      onSuccess: () => {
        setAdminError(null);
        setStep(3);
      },
      onError: (err) => {
        logger.error("setupAdmin failed", { component: "installer" }, err);
        setAdminError(err.message || "Failed to create admin account");
      },
    }),
  );

  const startTrialMutation = useMutation(
    trpc.license.startTrial.mutationOptions({
      onSuccess: (data) => {
        setTrialKey(data.key);
        setLicenseError(null);
      },
      onError: (err) => {
        logger.error("startTrial failed", { component: "installer" }, err);
        setLicenseError(err.message || "Failed to start trial");
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
        setLicenseError(null);
      },
      onError: (err) => {
        logger.error("activate failed", { component: "installer" }, err);
        setLicenseError(err.message || "Failed to activate license");
      },
    }),
  );

  const handleSetupAdmin = () => {
    if (!email.trim() || !password.trim() || !name.trim()) return;
    setupAdminMutation.mutate({
      email: email.trim(),
      password,
      name: name.trim(),
    });
  };

  const handleStartTrial = () => {
    startTrialMutation.mutate({ instanceId: instanceIdRef.current });
  };

  const handleActivate = () => {
    if (!licenseKey.trim()) return;
    setActivateResult(null);
    activateMutation.mutate({ licenseKey: licenseKey.trim() });
  };

  const handleComplete = () => {
    setSetupComplete(true);
  };

  const canProceedFromSystemCheck = systemCheckQuery.isSuccess && systemCheckQuery.data?.database;

  const stepTitles = [
    t("installer.systemCheck"),
    t("installer.databaseSetup"),
    t("installer.adminAccount"),
    t("installer.licenseActivation"),
    t("installer.branding"),
  ];

  return (
    <AuthShell
      maxWidth="lg"
      showBackHome={!setupComplete}
      footer={
        setupComplete ? (
          <Link
            href="/sign-in"
            className="text-sm font-medium text-primary hover:underline"
            data-testid="installer-go-sign-in"
          >
            {t("installer.goToSignIn")}
          </Link>
        ) : null
      }
    >
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("installer.title")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{stepTitles[step]}</p>
        <p className="mt-2 text-xs text-muted-foreground/90">{t("installer.secureNote")}</p>
      </div>

      <div
        className="mb-8 flex items-center justify-center gap-1.5 sm:gap-2"
        data-testid="installer-steps"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : i < step
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground",
              )}
              aria-current={i === step ? "step" : undefined}
            >
              {i < step ? "✓" : i + 1}
            </div>
            {i < 4 && (
              <div
                className={cn("mx-0.5 h-0.5 w-4 sm:w-6", i < step ? "bg-primary/40" : "bg-muted")}
              />
            )}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {step === 0 && (
          <div className="space-y-4">
            {systemCheckQuery.isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 py-8">
                <div className="flex items-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="ms-3 text-muted-foreground">{t("common.loading")}</span>
                </div>
                <p className="max-w-xs text-center text-xs text-muted-foreground">
                  {t("installer.systemCheckHint")}
                </p>
              </div>
            )}

            {systemCheckQuery.isError && (
              <div className="space-y-3">
                <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4">
                  <p className="text-sm font-medium text-destructive">
                    {t("installer.systemCheckFailed")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {systemCheckQuery.error?.message || t("common.error")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => void systemCheckQuery.refetch()}
                  disabled={systemCheckQuery.isFetching}
                  data-testid="installer-system-check-retry"
                >
                  {systemCheckQuery.isFetching ? t("common.loading") : t("common.tryAgain")}
                </Button>
              </div>
            )}

            {systemCheckQuery.data && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
                  <span className="text-sm font-medium text-foreground">
                    {t("installer.database")}
                  </span>
                  <div className="flex items-center gap-2">
                    {systemCheckQuery.data.database ? (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {t("installer.connected")}
                        </span>
                        <span className="text-lg text-success">✓</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground">
                          {t("installer.notConnected")}
                        </span>
                        <span className="text-lg text-destructive">✗</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
                  <span className="text-sm font-medium text-foreground">
                    {t("installer.diskSpace")}
                  </span>
                  <div className="flex items-center gap-2">
                    {systemCheckQuery.data.diskSpace ? (
                      <span className="text-xs text-muted-foreground">
                        {t("installer.diskAvailable", {
                          available: systemCheckQuery.data.diskSpace.available,
                          total: systemCheckQuery.data.diskSpace.total,
                        })}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {t("installer.unknown")}
                      </span>
                    )}
                    {systemCheckQuery.data.diskSpace && (
                      <span className="text-lg text-success">✓</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 p-3">
                  <span className="text-sm font-medium text-foreground">
                    {t("installer.nodeVersion")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {systemCheckQuery.data.nodeVersion}
                    </span>
                    <span className="text-lg text-success">✓</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("installer.databaseReady")}</p>
            {systemCheckQuery.data?.database ? (
              <div className="rounded-lg border border-success/25 bg-success/10 p-4">
                <p className="text-sm font-medium text-success">
                  {t("installer.databaseConnected")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("installer.databaseConnectedDesc")}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                <p className="text-sm font-medium text-destructive">
                  {t("installer.databaseNotConnected")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("installer.databaseNotConnectedDesc")}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="mb-2 text-sm text-muted-foreground">
              {t("installer.createAdminAccount")}
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="admin-name" className="text-sm font-medium text-foreground">
                  {t("installer.name")}
                </label>
                <Input
                  id="admin-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="installer-admin-name"
                  placeholder={t("installer.namePlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
                  {t("installer.email")}
                </label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="installer-admin-email"
                  placeholder={t("installer.emailPlaceholder")}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                  {t("installer.password")}
                </label>
                <Input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="installer-admin-password"
                  placeholder={t("installer.passwordPlaceholder")}
                />
              </div>
            </div>

            {adminError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{adminError}</p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="mb-2 text-sm text-muted-foreground">
              {t("installer.activateOrStartTrial")}
            </p>

            <div className="space-y-3">
              <label htmlFor="license-key" className="text-sm font-medium text-foreground">
                {t("installer.licenseKey")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="license-key"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  data-testid="installer-license-key"
                  placeholder="RM-XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 font-mono text-sm"
                />
                <Button
                  onClick={handleActivate}
                  disabled={!licenseKey.trim() || activateMutation.isPending}
                  variant="default"
                  data-testid="installer-activate"
                  className="sm:shrink-0"
                >
                  {activateMutation.isPending ? t("installer.activating") : t("installer.activate")}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("installer.orDivider")}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleStartTrial}
                disabled={startTrialMutation.isPending}
                variant="outline"
                className="w-full"
                data-testid="installer-start-trial"
              >
                {startTrialMutation.isPending
                  ? t("installer.startingTrial")
                  : t("installer.startTrial")}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                {t("installer.trialNote")}
              </p>
            </div>

            {activateResult && (
              <div className="space-y-2 rounded-lg border border-success/25 bg-success/10 p-3">
                <p className="text-sm font-medium text-foreground">
                  {t("installer.licenseActivated")}
                </p>
                <div className="space-y-1 rounded-md bg-card/60 p-3">
                  {activateResult.plan && (
                    <p className="text-xs text-muted-foreground">
                      {t("installer.plan")}:{" "}
                      <span className="font-medium capitalize text-foreground">
                        {activateResult.plan}
                      </span>
                    </p>
                  )}
                  {activateResult.expiresAt && (
                    <p className="text-xs text-muted-foreground">
                      {t("installer.expires")}:{" "}
                      <span className="font-medium text-foreground">
                        {formatDateForDisplay(activateResult.expiresAt, locale)}
                      </span>
                    </p>
                  )}
                  {activateResult.seats !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {t("installer.seats")}:{" "}
                      <span className="font-medium text-foreground">{activateResult.seats}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {trialKey && (
              <div className="space-y-2 rounded-lg border border-success/25 bg-success/10 p-3">
                <p className="text-sm font-medium text-foreground">{t("installer.trialStarted")}</p>
                <div className="rounded-md bg-card/60 p-3">
                  <p className="mb-1 text-xs text-muted-foreground">
                    {t("installer.yourTrialKey")}
                  </p>
                  <code className="break-all font-mono text-sm text-foreground">{trialKey}</code>
                </div>
              </div>
            )}

            {licenseError && (
              <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{licenseError}</p>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            {setupComplete ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
                  <span className="text-2xl text-success">✓</span>
                </div>
                <h2 className="mb-2 text-lg font-semibold text-foreground">
                  {t("installer.setupComplete")}
                </h2>
                <p className="text-sm text-muted-foreground">{t("installer.setupCompleteDesc")}</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {t("installer.brandingDescription")}
                </p>
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("installer.brandingComingSoon")}
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-between border-t border-border pt-4">
          <div>
            {step > 0 && !setupComplete && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                disabled={
                  setupAdminMutation.isPending ||
                  startTrialMutation.isPending ||
                  activateMutation.isPending
                }
                data-testid="installer-back"
              >
                {t("installer.back")}
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {step === 0 && (
              <>
                {(systemCheckQuery.isError ||
                  (systemCheckQuery.isSuccess && !systemCheckQuery.data?.database)) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void systemCheckQuery.refetch()}
                    disabled={systemCheckQuery.isFetching}
                    data-testid="installer-system-check-retry-nav"
                  >
                    {systemCheckQuery.isFetching ? t("common.loading") : t("common.tryAgain")}
                  </Button>
                )}
                <Button
                  onClick={() => setStep(1)}
                  disabled={!canProceedFromSystemCheck}
                  data-testid="installer-next-step-0"
                >
                  {t("installer.next")}
                </Button>
              </>
            )}

            {step === 1 && (
              <Button
                onClick={() => setStep(2)}
                disabled={!systemCheckQuery.data?.database}
                data-testid="installer-next-step-1"
              >
                {t("installer.next")}
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={handleSetupAdmin}
                disabled={
                  !email.trim() || !password.trim() || !name.trim() || setupAdminMutation.isPending
                }
                data-testid="installer-create-account"
              >
                {setupAdminMutation.isPending
                  ? t("installer.creating")
                  : t("installer.createAccount")}
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={() => setStep(4)}
                disabled={!trialKey && !activateResult && !setupComplete}
                data-testid="installer-next-step-3"
              >
                {t("installer.next")}
              </Button>
            )}

            {step === 4 && !setupComplete && (
              <Button onClick={handleComplete} data-testid="installer-complete">
                {t("installer.complete")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </AuthShell>
  );
}

"use client";

import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/utils/logger";

export default function InstallerPage() {
  const t = useTranslations();
  const trpc = useTRPC();
  const [step, setStep] = useState(0); // 0-4
  const instanceIdRef = useRef(crypto.randomUUID());

  // Admin account form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [adminError, setAdminError] = useState<string | null>(null);

  // License activation state
  const [licenseKey, setLicenseKey] = useState("");
  const [trialKey, setTrialKey] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [activateResult, setActivateResult] = useState<{
    plan?: string;
    expiresAt?: Date;
    seats?: number;
  } | null>(null);

  // Setup complete state
  const [setupComplete, setSetupComplete] = useState(false);

  // Step 0: System Check query
  const systemCheckQuery = useQuery(trpc.installer.systemCheck.queryOptions());

  // Step 2: Admin account mutation
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

  // Step 3: License mutations
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
    <div className="min-h-screen bg-background antialiased flex items-center justify-center">
      <div className="mx-auto max-w-lg w-full px-4">
        <h1 className="text-2xl font-semibold text-center mb-2 text-foreground">
          {t("installer.title")}
        </h1>
        <p className="text-center text-muted-foreground text-sm mb-6">{stepTitles[step]}</p>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i < step ? "✓" : i + 1}
              </div>
              {i < 4 && (
                <div className={cn("w-6 h-0.5 mx-0.5", i < step ? "bg-primary/20" : "bg-muted")} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          {/* Step 0: System Check */}
          {step === 0 && (
            <div className="space-y-4">
              {systemCheckQuery.isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="ml-3 text-muted-foreground">{t("common.loading")}</span>
                </div>
              )}

              {systemCheckQuery.isError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-sm text-destructive">
                    {t("common.error")}: {systemCheckQuery.error?.message}
                  </p>
                </div>
              )}

              {systemCheckQuery.data && (
                <div className="space-y-3">
                  {/* Database status */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium text-foreground">Database</span>
                    <div className="flex items-center gap-2">
                      {systemCheckQuery.data.database ? (
                        <>
                          <span className="text-xs text-muted-foreground">Connected</span>
                          <span className="text-green-600 text-lg">✓</span>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">Not Connected</span>
                          <span className="text-destructive text-lg">✗</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Disk space */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium text-foreground">Disk Space</span>
                    <div className="flex items-center gap-2">
                      {systemCheckQuery.data.diskSpace ? (
                        <span className="text-xs text-muted-foreground">
                          {systemCheckQuery.data.diskSpace.available}GB /{" "}
                          {systemCheckQuery.data.diskSpace.total}GB available
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Unknown</span>
                      )}
                      {systemCheckQuery.data.diskSpace && (
                        <span className="text-green-600 text-lg">✓</span>
                      )}
                    </div>
                  </div>

                  {/* Node version */}
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <span className="text-sm font-medium text-foreground">Node Version</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {systemCheckQuery.data.nodeVersion}
                      </span>
                      <span className="text-green-600 text-lg">✓</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Database Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The database connection is configured via environment variables. Your database is
                ready to use.
              </p>
              {systemCheckQuery.data?.database ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-md p-4">
                  <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                    Database Connected Successfully
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your DATABASE_URL is configured and the connection is active.
                  </p>
                </div>
              ) : (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
                  <p className="text-sm text-destructive font-medium">Database Not Connected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Please configure your DATABASE_URL environment variable.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Admin Account */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Create your administrator account to manage the system.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="admin-name" className="text-sm font-medium text-foreground">
                    Name
                  </label>
                  <input
                    id="admin-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="installer-admin-name"
                    placeholder="Admin User"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-input/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
                    Email
                  </label>
                  <input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="installer-admin-email"
                    placeholder="admin@example.com"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-input/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="installer-admin-password"
                    placeholder="Min. 8 characters"
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-input/30"
                  />
                </div>
              </div>

              {adminError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm text-destructive">{adminError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: License Activation */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Activate your license or start a free trial to continue.
              </p>

              <div className="space-y-3">
                <label htmlFor="license-key" className="text-sm font-medium text-foreground">
                  {t("installer.licenseKey")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="license-key"
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    data-testid="installer-license-key"
                    placeholder="RM-XXXX-XXXX-XXXX-XXXX"
                    className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-input/30"
                  />
                  <Button
                    onClick={handleActivate}
                    disabled={!licenseKey.trim() || activateMutation.isPending}
                    variant="default"
                    data-testid="installer-activate"
                  >
                    {activateMutation.isPending ? "Activating..." : "Activate"}
                  </Button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
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
                  {startTrialMutation.isPending ? "Starting Trial..." : t("installer.startTrial")}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Get full access for 14 days, no credit card required
                </p>
              </div>

              {activateResult && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    License Activated Successfully!
                  </p>
                  <div className="bg-muted rounded-md p-3 space-y-1">
                    {activateResult.plan && (
                      <p className="text-xs text-muted-foreground">
                        Plan:{" "}
                        <span className="text-foreground font-medium capitalize">
                          {activateResult.plan}
                        </span>
                      </p>
                    )}
                    {activateResult.expiresAt && (
                      <p className="text-xs text-muted-foreground">
                        Expires:{" "}
                        <span className="text-foreground font-medium">
                          {activateResult.expiresAt.toLocaleDateString()}
                        </span>
                      </p>
                    )}
                    {activateResult.seats !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Seats:{" "}
                        <span className="text-foreground font-medium">{activateResult.seats}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {trialKey && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Trial Started Successfully!</p>
                  <div className="bg-muted rounded-md p-3">
                    <p className="text-xs text-muted-foreground mb-1">Your trial key:</p>
                    <code className="text-sm font-mono text-foreground break-all">{trialKey}</code>
                  </div>
                </div>
              )}

              {licenseError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <p className="text-sm text-destructive">{licenseError}</p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Branding */}
          {step === 4 && (
            <div className="space-y-4">
              {setupComplete ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-green-600 text-2xl">✓</span>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Setup Complete!</h2>
                  <p className="text-sm text-muted-foreground">
                    Your Rihla Mate installation is ready. You can now log in with your admin
                    account.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Customize your travel agency branding.
                  </p>
                  <div className="bg-muted/50 border border-border rounded-md p-4">
                    <p className="text-sm text-muted-foreground">
                      Branding configuration coming soon...
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6 pt-4 border-t border-border">
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
                <Button
                  onClick={() => setStep(1)}
                  disabled={!canProceedFromSystemCheck}
                  data-testid="installer-next-step-0"
                >
                  {t("installer.next")}
                </Button>
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
                    !email.trim() ||
                    !password.trim() ||
                    !name.trim() ||
                    setupAdminMutation.isPending
                  }
                  data-testid="installer-create-account"
                >
                  {setupAdminMutation.isPending ? "Creating..." : "Create Account"}
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
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/lib/trpc/react";
import { useMutation } from "@tanstack/react-query";
import { logger } from "@/lib/utils/logger";

export default function ActivatePage() {
  const trpc = useTRPC();
  const router = useRouter();
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
        setTimeout(() => router.push("/dashboard"), 1500);
      },
      onError: (err) => {
        logger.error("startTrial failed", { component: "activate" }, err);
        setError(err.message || "Failed to start trial");
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
        setTimeout(() => router.push("/dashboard"), 1500);
      },
      onError: (err) => {
        logger.error("activate failed", { component: "activate" }, err);
        setError(err.message || "Failed to activate license");
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
    <div className="min-h-screen bg-background antialiased">
      <div className="mx-auto max-w-md mt-20 px-4">
        <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-card-foreground mb-2">Activate License</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Enter your license key to activate Rihla Mate, or start a free 14-day trial.
          </p>

          <div className="space-y-6">
            <div className="space-y-3">
              <label htmlFor="license-key" className="text-sm font-medium text-foreground">
                Enter License Key
              </label>
              <div className="flex gap-2">
                <input
                  id="license-key"
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  data-testid="activate-license-key"
                  placeholder="RM-XXXX-XXXX-XXXX-XXXX"
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent dark:bg-input/30"
                />
                <Button
                  onClick={handleActivate}
                  disabled={!licenseKey.trim() || activateMutation.isPending}
                  variant="default"
                  data-testid="activate-submit"
                >
                  {activateMutation.isPending ? "Activating..." : "Activate"}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
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
                data-testid="activate-start-trial"
              >
                {startTrialMutation.isPending ? "Starting Trial..." : "Start Free Trial"}
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

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

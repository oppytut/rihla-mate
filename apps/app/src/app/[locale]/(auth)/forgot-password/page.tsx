"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link } from "@/i18n/navigation";
import { env } from "@/env";

export default function ForgotPasswordPage() {
  const t = useTranslations();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const appBase = (env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
      const result = await authClient.requestPasswordReset({
        email,
        redirectTo: `${appBase}/reset-password`,
      });
      if (result.error) {
        setError(result.error.message || t("auth.resetFailed"));
        return;
      }
      setSent(true);
    } catch {
      setError(t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell maxWidth="sm">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {t("auth.forgotPasswordTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.forgotPasswordHelp")}</p>
      </div>

      {sent ? (
        <p className="text-center text-sm text-foreground" data-testid="forgot-password-sent">
          {t("auth.resetEmailSent")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("auth.email")}
            </label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              data-testid="forgot-password-email"
            />
          </div>

          {error && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2"
              role="alert"
            >
              <p className="text-sm text-destructive" data-testid="forgot-password-error">
                {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
            data-testid="forgot-password-submit"
          >
            {loading ? t("common.loading") : t("auth.sendResetLink")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
          data-testid="forgot-password-back"
        >
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

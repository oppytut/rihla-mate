"use client";

import { useTranslations } from "next-intl";
import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthShell } from "@/components/auth/auth-shell";
import { Link, useRouter } from "@/i18n/navigation";

function ResetPasswordForm() {
  const t = useTranslations();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token"), [searchParams]);
  const errorParam = searchParams.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(
    errorParam === "INVALID_TOKEN" ? t("auth.invalidResetToken") : null,
  );
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError(t("auth.invalidResetToken"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("auth.resetFailed"));
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) {
        setError(result.error.message || t("auth.resetFailed"));
        return;
      }
      setDone(true);
      setTimeout(() => {
        router.push("/sign-in");
        router.refresh();
      }, 1200);
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
          {t("auth.resetPasswordTitle")}
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{t("auth.resetPasswordHelp")}</p>
      </div>

      {done ? (
        <p className="text-center text-sm text-foreground" data-testid="reset-password-success">
          {t("auth.resetSuccess")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
          <div className="space-y-2">
            <label htmlFor="new-password" className="text-sm font-medium text-foreground">
              {t("auth.newPassword")}
            </label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              data-testid="reset-password-new"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
              {t("auth.confirmPassword")}
            </label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              maxLength={128}
              autoComplete="new-password"
              data-testid="reset-password-confirm"
            />
          </div>

          {error && (
            <div
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2"
              role="alert"
            >
              <p className="text-sm text-destructive" data-testid="reset-password-error">
                {error}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !token}
            data-testid="reset-password-submit"
          >
            {loading ? t("common.loading") : t("auth.resetPasswordTitle")}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
          data-testid="reset-password-back"
        >
          {t("auth.backToSignIn")}
        </Link>
      </p>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { logger } from "@/lib/utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SnapResult = Record<string, unknown>;

interface SnapCallbacks {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
}

interface SnapGlobal {
  pay: (
    token: string,
    callbacks?: {
      onSuccess?: (result: SnapResult) => void;
      onPending?: (result: SnapResult) => void;
      onError?: (result: SnapResult) => void;
      onClose?: () => void;
    },
  ) => void;
}

declare global {
  interface Window {
    snap?: SnapGlobal;
  }
}

function getSnapScriptSrc(): string {
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
  const isSandbox = !clientKey || clientKey.startsWith("SB-Mid-client-");
  return isSandbox
    ? "https://app.sandbox.midtrans.com/snap/snap.js"
    : "https://app.midtrans.com/snap/snap.js";
}

function ensureSnapScript(onReady: () => void, onError?: () => void): () => void {
  if (typeof window !== "undefined" && window.snap) {
    onReady();
    return () => {};
  }

  const existing = document.querySelector<HTMLScriptElement>("script[data-midtrans-snap]");
  if (existing) {
    if (window.snap) {
      onReady();
      return () => {};
    }
    const handleLoad = () => onReady();
    const handleError = () => onError?.();
    existing.addEventListener("load", handleLoad);
    existing.addEventListener("error", handleError);
    return () => {
      existing.removeEventListener("load", handleLoad);
      existing.removeEventListener("error", handleError);
    };
  }

  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY ?? "";
  const script = document.createElement("script");
  script.src = getSnapScriptSrc();
  script.async = true;
  script.dataset.midtransSnap = "1";
  if (clientKey) {
    script.dataset.clientKey = clientKey;
  }

  script.onload = () => onReady();
  script.onerror = () => onError?.();
  document.head.appendChild(script);

  return () => {
    script.onload = null;
    script.onerror = null;
  };
}

// ---------------------------------------------------------------------------
// SnapPayment — component
// ---------------------------------------------------------------------------

interface SnapPaymentProps {
  token: string | null;
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
}

function SnapPayment({ token, onSuccess, onPending, onError, onClose }: SnapPaymentProps) {
  const t = useTranslations();
  const [isReady, setIsReady] = useState(false);
  const onErrorRef = useRef(onError);
  const paidTokenRef = useRef<string | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    return ensureSnapScript(
      () => setIsReady(true),
      () => onErrorRef.current?.({ error: t("bookings.snap.loadError") }),
    );
  }, [t]);

  useEffect(() => {
    if (!token) return;
    if (!isReady || !window.snap) return;
    if (paidTokenRef.current === token) return;
    paidTokenRef.current = token;

    window.snap.pay(token, {
      onSuccess,
      onPending,
      onError,
      onClose,
    });
  }, [token, isReady, onSuccess, onPending, onError, onClose]);

  return null;
}

// ---------------------------------------------------------------------------
// useSnapPayment — hook
// ---------------------------------------------------------------------------

interface UseSnapPaymentReturn {
  isReady: boolean;
  pay: (token: string, callbacks?: SnapCallbacks) => void;
}

function useSnapPayment(): UseSnapPaymentReturn {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    return ensureSnapScript(
      () => setIsReady(true),
      () => logger.error("Failed to load Midtrans Snap.js"),
    );
  }, []);

  function pay(token: string, callbacks?: SnapCallbacks) {
    if (!window.snap) return;
    window.snap.pay(token, {
      onSuccess: callbacks?.onSuccess,
      onPending: callbacks?.onPending,
      onError: callbacks?.onError,
      onClose: callbacks?.onClose,
    });
  }

  return { isReady, pay };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { SnapPayment, useSnapPayment };
export type { SnapResult, SnapCallbacks, SnapGlobal };

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SNAP_SCRIPT_SRC = "https://app.sandbox.midtrans.com/snap/snap.js";

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
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const hasInjectedRef = useRef(false);

  // Inject the Snap.js script once
  useEffect(() => {
    if (hasInjectedRef.current) return;
    hasInjectedRef.current = true;

    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_SRC;
    script.async = true;
    script.dataset.clientId = "midtrans-snap";

    script.onload = () => {
      setIsReady(true);
    };

    script.onerror = () => {
      onError?.({ error: t("bookings.snap.loadError") });
    };

    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
        hasInjectedRef.current = false;
      }
    };
  }, []);

  // Trigger payment when token becomes available and Snap is ready
  useEffect(() => {
    if (!token) return;
    if (!isReady || !window.snap) return;

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
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const hasInjectedRef = useRef(false);

  // Inject the Snap.js script once
  useEffect(() => {
    if (hasInjectedRef.current) return;
    hasInjectedRef.current = true;

    const script = document.createElement("script");
    script.src = SNAP_SCRIPT_SRC;
    script.async = true;
    script.dataset.clientId = "midtrans-snap";

    script.onload = () => {
      setIsReady(true);
    };

    script.onerror = () => {
      // Snap failed to load — isReady stays false, pay() will be a no-op
      logger.error("Failed to load Midtrans Snap.js");
    };

    document.head.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current) {
        document.head.removeChild(scriptRef.current);
        scriptRef.current = null;
        hasInjectedRef.current = false;
      }
    };
  }, []);

  const pay = useCallback((token: string, callbacks?: SnapCallbacks) => {
    if (!window.snap) return;
    window.snap.pay(token, {
      onSuccess: callbacks?.onSuccess,
      onPending: callbacks?.onPending,
      onError: callbacks?.onError,
      onClose: callbacks?.onClose,
    });
  }, []);

  return { isReady, pay };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export { SnapPayment, useSnapPayment };
export type { SnapResult, SnapCallbacks, SnapGlobal };

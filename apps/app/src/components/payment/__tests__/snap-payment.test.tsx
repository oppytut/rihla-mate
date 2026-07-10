import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SnapPayment, useSnapPayment } from "../snap-payment";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "bookings.snap.loadError": "Failed to load payment gateway",
    };
    return translations[key] ?? key;
  },
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a mock Snap.js pay function that records calls */
function createMockSnap() {
  const pay = vi.fn();
  Object.defineProperty(window, "snap", {
    value: { pay },
    writable: true,
    configurable: true,
  });
  return pay;
}

/** Remove window.snap */
function clearWindowSnap() {
  delete (window as unknown as Record<string, unknown>).snap;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SnapPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowSnap();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe("rendering", () => {
    it("renders nothing to the DOM", () => {
      const { container } = render(<SnapPayment token={null} />);
      expect(container.innerHTML).toBe("");
    });

    it("injects the Midtrans Snap.js script into document head", () => {
      render(<SnapPayment token={null} />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement | null;
      expect(script).not.toBeNull();
      expect(script?.dataset.clientId).toBe("midtrans-snap");
      expect(script?.async).toBe(true);
    });

    it("injects the script only once across re-renders", () => {
      const { rerender } = render(<SnapPayment token={null} />);
      rerender(<SnapPayment token="tok-1" />);
      rerender(<SnapPayment token="tok-2" />);

      const scripts = document.querySelectorAll(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      );
      expect(scripts).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  describe("loading state", () => {
    it("does not call snap.pay when Snap.js has not loaded yet", () => {
      createMockSnap();
      render(<SnapPayment token="tok-123" />);

      expect(window.snap?.pay).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // Payment trigger
  // -----------------------------------------------------------------------

  describe("payment trigger", () => {
    it("calls snap.pay with the token and callbacks when Snap.js loads", async () => {
      const pay = createMockSnap();

      render(
        <SnapPayment token="tok-abc" onSuccess={vi.fn()} onError={vi.fn()} onClose={vi.fn()} />,
      );

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      expect(pay).toHaveBeenCalledTimes(1);
      expect(pay).toHaveBeenCalledWith("tok-abc", expect.any(Object));
      const callArgs = pay.mock.calls[0] as [string, Record<string, unknown>];
      expect(typeof callArgs[1].onSuccess).toBe("function");
      expect(typeof callArgs[1].onError).toBe("function");
      expect(typeof callArgs[1].onClose).toBe("function");
    });

    it("does not call snap.pay when token is null", async () => {
      const pay = createMockSnap();

      render(<SnapPayment token={null} />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      expect(pay).not.toHaveBeenCalled();
    });

    it("does not call snap.pay when token is an empty string", async () => {
      const pay = createMockSnap();

      render(<SnapPayment token="" />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      expect(pay).not.toHaveBeenCalled();
    });

    it("waits for snap to be ready when token is already available", () => {
      clearWindowSnap();
      render(<SnapPayment token="tok-waiting" />);
    });
  });

  // -----------------------------------------------------------------------
  // onSuccess callback
  // -----------------------------------------------------------------------

  describe("onSuccess callback", () => {
    it("calls onSuccess when payment succeeds", async () => {
      const pay = createMockSnap();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onClose = vi.fn();

      render(
        <SnapPayment
          token="tok-success"
          onSuccess={onSuccess}
          onError={onError}
          onClose={onClose}
        />,
      );

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const passedOnSuccess = callArgs[1].onSuccess;

      const result = { transaction_status: "settlement", order_id: "ORD-123" };
      passedOnSuccess(result);

      expect(onSuccess).toHaveBeenCalledWith(result);
    });
  });

  // -----------------------------------------------------------------------
  // onError callback
  // -----------------------------------------------------------------------

  describe("onError callback", () => {
    it("calls onError when payment fails", async () => {
      const pay = createMockSnap();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onClose = vi.fn();

      render(
        <SnapPayment token="tok-error" onSuccess={onSuccess} onError={onError} onClose={onClose} />,
      );

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const passedOnError = callArgs[1].onError;

      const result = { transaction_status: "deny", status_message: "Payment denied" };
      passedOnError(result);

      expect(onError).toHaveBeenCalledWith(result);
    });

    it("calls onError when Snap.js script fails to load", async () => {
      const onError = vi.fn();

      render(<SnapPayment token="tok-loadfail" onError={onError} />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;

      await act(async () => {
        script.dispatchEvent(new Event("error"));
      });

      expect(onError).toHaveBeenCalledWith({
        error: "Failed to load payment gateway",
      });
    });
  });

  // -----------------------------------------------------------------------
  // onClose callback
  // -----------------------------------------------------------------------

  describe("onClose callback", () => {
    it("calls onClose when payment modal is closed", async () => {
      const pay = createMockSnap();
      const onSuccess = vi.fn();
      const onError = vi.fn();
      const onClose = vi.fn();

      render(
        <SnapPayment token="tok-close" onSuccess={onSuccess} onError={onError} onClose={onClose} />,
      );

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, () => void>];
      const passedOnClose = callArgs[1].onClose;

      passedOnClose();

      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // onPending callback
  // -----------------------------------------------------------------------

  describe("onPending callback", () => {
    it("calls onPending when payment is pending", async () => {
      const pay = createMockSnap();
      const onPending = vi.fn();

      render(<SnapPayment token="tok-pending" onPending={onPending} />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;
      await act(async () => {
        script.dispatchEvent(new Event("load"));
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const passedOnPending = callArgs[1].onPending;

      const result = { transaction_status: "pending", order_id: "ORD-456" };
      passedOnPending(result);

      expect(onPending).toHaveBeenCalledWith(result);
    });
  });

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  describe("cleanup", () => {
    it("removes the Snap.js script from head on unmount", () => {
      const { unmount } = render(<SnapPayment token={null} />);

      const scriptBefore = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      );
      expect(scriptBefore).not.toBeNull();

      unmount();

      const scriptAfter = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      );
      expect(scriptAfter).toBeNull();
    });
  });

  // -----------------------------------------------------------------------
  // Callback stability across re-renders
  // -----------------------------------------------------------------------

  describe("callback stability", () => {
    it("uses the latest onError when script load fails", async () => {
      const onErrorV1 = vi.fn();
      const onErrorV2 = vi.fn();

      const { rerender } = render(<SnapPayment token="tok-cb" onError={onErrorV1} />);
      rerender(<SnapPayment token="tok-cb" onError={onErrorV2} />);

      const script = document.querySelector(
        'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
      ) as HTMLScriptElement;

      await act(async () => {
        script.dispatchEvent(new Event("error"));
      });

      expect(onErrorV1).not.toHaveBeenCalled();
      expect(onErrorV2).toHaveBeenCalledWith({
        error: "Failed to load payment gateway",
      });
    });
  });
});

// ---------------------------------------------------------------------------
// useSnapPayment hook tests
// ---------------------------------------------------------------------------

describe("useSnapPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowSnap();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    cleanup();
  });

  it("returns isReady=false initially", () => {
    let hookResult: { isReady: boolean } = { isReady: false };

    function TestComponent() {
      const snap = useSnapPayment();
      hookResult = snap;
      return null;
    }

    render(<TestComponent />);

    expect(hookResult.isReady).toBe(false);
  });

  it("returns isReady=true after Snap.js loads", async () => {
    let hookResult: {
      isReady: boolean;
      pay: (token: string, callbacks?: Record<string, unknown>) => void;
    } = {
      isReady: false,
      pay: vi.fn(),
    };

    function TestComponent() {
      const snap = useSnapPayment();
      hookResult = snap;
      return null;
    }

    render(<TestComponent />);

    const script = document.querySelector(
      'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
    ) as HTMLScriptElement;
    await act(async () => {
      script.dispatchEvent(new Event("load"));
    });

    expect(hookResult.isReady).toBe(true);
  });

  it("pay() calls window.snap.pay with token and callbacks", async () => {
    const payMock = createMockSnap();

    let hookResult: {
      isReady: boolean;
      pay: (token: string, callbacks?: Record<string, unknown>) => void;
    } = {
      isReady: false,
      pay: vi.fn(),
    };

    function TestComponent() {
      const snap = useSnapPayment();
      hookResult = snap;
      return null;
    }

    render(<TestComponent />);

    const script = document.querySelector(
      'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
    ) as HTMLScriptElement;
    await act(async () => {
      script.dispatchEvent(new Event("load"));
    });

    const onSuccess = vi.fn();
    hookResult.pay("tok-hook", { onSuccess });

    expect(payMock).toHaveBeenCalledWith("tok-hook", expect.any(Object));
    const callArgs = payMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(typeof callArgs[1].onSuccess).toBe("function");
  });

  it("pay() is a no-op when window.snap is not available", () => {
    clearWindowSnap();

    let hookResult: {
      pay: (token: string, callbacks?: Record<string, unknown>) => void;
    } = { pay: vi.fn() };

    function TestComponent() {
      const snap = useSnapPayment();
      hookResult = snap;
      return null;
    }

    render(<TestComponent />);

    expect(() => hookResult.pay("tok-nosnap")).not.toThrow();
  });

  it("injects Snap.js script only once", () => {
    function TestComponent() {
      useSnapPayment();
      return null;
    }

    const { rerender } = render(<TestComponent />);
    rerender(<TestComponent />);

    const scripts = document.querySelectorAll(
      'script[src="https://app.sandbox.midtrans.com/snap/snap.js"]',
    );
    expect(scripts).toHaveLength(1);
  });
});

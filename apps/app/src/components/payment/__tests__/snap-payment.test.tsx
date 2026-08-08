import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { SnapPayment, useSnapPayment } from "../snap-payment";

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

function createMockSnap() {
  const pay = vi.fn();
  Object.defineProperty(window, "snap", {
    value: { pay },
    writable: true,
    configurable: true,
  });
  return pay;
}

function clearWindowSnap() {
  delete (window as unknown as Record<string, unknown>).snap;
}

function getSnapScript(): HTMLScriptElement | null {
  return document.querySelector("script[data-midtrans-snap]");
}

describe("SnapPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowSnap();
    document.head.innerHTML = "";
    vi.stubEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", "SB-Mid-client-test");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  describe("rendering", () => {
    it("renders nothing to the DOM", () => {
      const { container } = render(<SnapPayment token={null} />);
      expect(container.innerHTML).toBe("");
    });

    it("injects the Midtrans Snap.js sandbox script when client key is sandbox", () => {
      render(<SnapPayment token={null} />);

      const script = getSnapScript();
      expect(script).not.toBeNull();
      expect(script?.src).toBe("https://app.sandbox.midtrans.com/snap/snap.js");
      expect(script?.dataset.midtransSnap).toBe("1");
      expect(script?.dataset.clientKey).toBe("SB-Mid-client-test");
      expect(script?.async).toBe(true);
    });

    it("injects production Snap.js when client key is production", () => {
      vi.stubEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", "Mid-client-prod");
      render(<SnapPayment token={null} />);

      const script = getSnapScript();
      expect(script?.src).toBe("https://app.midtrans.com/snap/snap.js");
    });

    it("reuses an existing data-midtrans-snap script without injecting another", () => {
      const existing = document.createElement("script");
      existing.src = "https://app.sandbox.midtrans.com/snap/snap.js";
      existing.dataset.midtransSnap = "1";
      document.head.appendChild(existing);

      render(<SnapPayment token={null} />);

      const scripts = document.querySelectorAll("script[data-midtrans-snap]");
      expect(scripts).toHaveLength(1);
    });

    it("injects the script only once across re-renders", () => {
      const { rerender } = render(<SnapPayment token={null} />);
      rerender(<SnapPayment token="tok-1" />);
      rerender(<SnapPayment token="tok-2" />);

      expect(document.querySelectorAll("script[data-midtrans-snap]")).toHaveLength(1);
    });
  });

  describe("loading state", () => {
    it("does not call snap.pay when Snap.js has not loaded yet", () => {
      clearWindowSnap();
      render(<SnapPayment token="tok-123" />);

      expect(window.snap?.pay).toBeUndefined();
    });
  });

  describe("payment trigger", () => {
    it("calls snap.pay with the token and callbacks when Snap.js loads", async () => {
      clearWindowSnap();
      const pay = vi.fn();

      render(
        <SnapPayment token="tok-abc" onSuccess={vi.fn()} onError={vi.fn()} onClose={vi.fn()} />,
      );

      const script = getSnapScript() as HTMLScriptElement;
      Object.defineProperty(window, "snap", {
        value: { pay },
        writable: true,
        configurable: true,
      });
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

      expect(pay).not.toHaveBeenCalled();
    });

    it("does not call snap.pay when token is an empty string", async () => {
      const pay = createMockSnap();

      render(<SnapPayment token="" />);

      expect(pay).not.toHaveBeenCalled();
    });

    it("calls snap.pay immediately when window.snap is already present", async () => {
      const pay = createMockSnap();

      await act(async () => {
        render(<SnapPayment token="tok-ready" onSuccess={vi.fn()} />);
      });

      expect(pay).toHaveBeenCalledWith("tok-ready", expect.any(Object));
    });
  });

  describe("onSuccess callback", () => {
    it("calls onSuccess when payment succeeds", async () => {
      const pay = createMockSnap();
      const onSuccess = vi.fn();

      await act(async () => {
        render(
          <SnapPayment
            token="tok-success"
            onSuccess={onSuccess}
            onError={vi.fn()}
            onClose={vi.fn()}
          />,
        );
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const result = { transaction_status: "settlement", order_id: "ORD-123" };
      callArgs[1].onSuccess(result);

      expect(onSuccess).toHaveBeenCalledWith(result);
    });
  });

  describe("onError callback", () => {
    it("calls onError when payment fails", async () => {
      const pay = createMockSnap();
      const onError = vi.fn();

      await act(async () => {
        render(
          <SnapPayment token="tok-error" onSuccess={vi.fn()} onError={onError} onClose={vi.fn()} />,
        );
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const result = { transaction_status: "deny", status_message: "Payment denied" };
      callArgs[1].onError(result);

      expect(onError).toHaveBeenCalledWith(result);
    });

    it("calls onError when Snap.js script fails to load", async () => {
      clearWindowSnap();
      const onError = vi.fn();

      render(<SnapPayment token="tok-loadfail" onError={onError} />);

      const script = getSnapScript() as HTMLScriptElement;

      await act(async () => {
        script.dispatchEvent(new Event("error"));
      });

      expect(onError).toHaveBeenCalledWith({
        error: "Failed to load payment gateway",
      });
    });
  });

  describe("onClose callback", () => {
    it("calls onClose when payment modal is closed", async () => {
      const pay = createMockSnap();
      const onClose = vi.fn();

      await act(async () => {
        render(
          <SnapPayment token="tok-close" onSuccess={vi.fn()} onError={vi.fn()} onClose={onClose} />,
        );
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, () => void>];
      callArgs[1].onClose();

      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe("onPending callback", () => {
    it("calls onPending when payment is pending", async () => {
      const pay = createMockSnap();
      const onPending = vi.fn();

      await act(async () => {
        render(<SnapPayment token="tok-pending" onPending={onPending} />);
      });

      const callArgs = pay.mock.calls[0] as [string, Record<string, (result: unknown) => void>];
      const result = { transaction_status: "pending", order_id: "ORD-456" };
      callArgs[1].onPending(result);

      expect(onPending).toHaveBeenCalledWith(result);
    });
  });

  describe("cleanup", () => {
    it("does not remove shared Snap.js script on unmount", () => {
      const { unmount } = render(<SnapPayment token={null} />);

      expect(getSnapScript()).not.toBeNull();

      unmount();

      expect(getSnapScript()).not.toBeNull();
    });
  });

  describe("callback stability", () => {
    it("uses the latest onError when script load fails", async () => {
      clearWindowSnap();
      const onErrorV1 = vi.fn();
      const onErrorV2 = vi.fn();

      const { rerender } = render(<SnapPayment token="tok-cb" onError={onErrorV1} />);
      rerender(<SnapPayment token="tok-cb" onError={onErrorV2} />);

      const script = getSnapScript() as HTMLScriptElement;

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

describe("useSnapPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearWindowSnap();
    document.head.innerHTML = "";
    vi.stubEnv("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY", "SB-Mid-client-test");
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
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

    const script = getSnapScript() as HTMLScriptElement;
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

    await act(async () => {
      render(<TestComponent />);
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

    expect(document.querySelectorAll("script[data-midtrans-snap]")).toHaveLength(1);
  });
});

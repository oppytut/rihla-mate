import { describe, it, expect } from "vitest";
import {
  formatPrice,
  formatDisplayDate,
  formatDateForDisplay,
  formatDateForStorage,
} from "../utils/format";

describe("formatPrice", () => {
  it("formats integer price in IDR with no decimals", () => {
    const result = formatPrice(1500000);
    expect(result).toContain("1.500.000");
    expect(result).toContain("Rp");
  });

  it("formats string price", () => {
    const result = formatPrice("1500000");
    expect(result).toContain("1.500.000");
    expect(result).toContain("Rp");
  });

  it("formats price in USD", () => {
    const result = formatPrice(100, "USD");
    expect(result).toContain("100");
    expect(result).toContain("US$");
  });

  it("handles zero price", () => {
    const result = formatPrice(0);
    expect(result).toContain("Rp");
    expect(result).toContain("0");
  });

  it("handles large numbers", () => {
    const result = formatPrice(1000000000);
    expect(result).toContain("Rp");
    expect(result).toContain("1.000.000.000");
  });

  it("uses IDR as default currency", () => {
    const result = formatPrice(50000);
    expect(result).toContain("Rp");
  });
});

describe("formatDisplayDate", () => {
  it("formats a date string correctly", () => {
    const result = formatDisplayDate("2026-07-15");
    expect(result).toBe("Jul 15, 2026");
  });

  it("returns empty string for empty input", () => {
    const result = formatDisplayDate("");
    expect(result).toBe("");
  });

  it("handles different months", () => {
    expect(formatDisplayDate("2026-01-01")).toBe("Jan 1, 2026");
    expect(formatDisplayDate("2026-12-31")).toBe("Dec 31, 2026");
  });

  it("handles leap year date", () => {
    const result = formatDisplayDate("2024-02-29");
    expect(result).toBe("Feb 29, 2024");
  });
});

describe("formatDateForDisplay", () => {
  it("formats a Date object correctly", () => {
    const date = new Date(2026, 6, 15);
    const result = formatDateForDisplay(date);
    expect(result).toBe("Jul 15, 2026");
  });

  it("formats January correctly", () => {
    const date = new Date(2026, 0, 1);
    const result = formatDateForDisplay(date);
    expect(result).toBe("Jan 1, 2026");
  });

  it("formats December correctly", () => {
    const date = new Date(2026, 11, 25);
    const result = formatDateForDisplay(date);
    expect(result).toBe("Dec 25, 2026");
  });
});

describe("formatDateForStorage", () => {
  it("converts Date to YYYY-MM-DD string", () => {
    const date = new Date(2026, 6, 15);
    const result = formatDateForStorage(date);
    expect(result).toBe("2026-07-15");
  });

  it("pads single-digit months with zero", () => {
    const date = new Date(2026, 0, 5);
    const result = formatDateForStorage(date);
    expect(result).toBe("2026-01-05");
  });

  it("pads single-digit days with zero", () => {
    const date = new Date(2026, 2, 9);
    const result = formatDateForStorage(date);
    expect(result).toBe("2026-03-09");
  });

  it("handles end of year", () => {
    const date = new Date(2026, 11, 31);
    const result = formatDateForStorage(date);
    expect(result).toBe("2026-12-31");
  });
});

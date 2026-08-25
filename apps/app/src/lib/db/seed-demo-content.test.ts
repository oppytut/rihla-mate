import { describe, expect, it } from "vitest";
import {
  assertDemoPagesSafe,
  DEMO_PAGES,
  DEMO_SETTINGS,
  type DemoPageSeed,
} from "./seed-demo-content";

describe("assertDemoPagesSafe", () => {
  it("accepts the shipped demo pages", () => {
    expect(() => assertDemoPagesSafe()).not.toThrow();
    expect(DEMO_PAGES.filter((p) => p.isHomepage)).toHaveLength(1);
    expect(
      DEMO_PAGES.every((p) => p.slug && p.body.trim() && p.ogImage.startsWith("https://")),
    ).toBe(true);
  });

  it("rejects reserved slugs, duplicates, and missing homepage", () => {
    const reserved: DemoPageSeed[] = [{ ...DEMO_PAGES[0], slug: "packages", isHomepage: true }];
    expect(() => assertDemoPagesSafe(reserved)).toThrow(/reserved/);

    const dup: DemoPageSeed[] = [DEMO_PAGES[0], { ...DEMO_PAGES[0], title: "Copy" }];
    expect(() => assertDemoPagesSafe(dup)).toThrow(/Duplicate/);

    const none: DemoPageSeed[] = DEMO_PAGES.map((p) => ({ ...p, isHomepage: false }));
    expect(() => assertDemoPagesSafe(none)).toThrow(/homepage/);
  });
});

describe("DEMO_SETTINGS", () => {
  it("sets bureau name without payment or email secrets", () => {
    expect(DEMO_SETTINGS.appName).toBe("Biro Demo");
    expect(DEMO_SETTINGS.currency).toBe("IDR");
    expect(Object.keys(DEMO_SETTINGS).join(" ")).not.toMatch(/midtrans|resend|secret|password/i);
  });
});

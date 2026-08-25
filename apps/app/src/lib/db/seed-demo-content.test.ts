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
    expect(
      DEMO_PAGES.map((p) => p.slug)
        .sort()
        .join(","),
    ).toBe("about,contact,faq,home");
    expect(DEMO_PAGES.some((p) => /Biro Demo|white-label|availableDates/i.test(p.body))).toBe(
      false,
    );
  });

  it("rejects reserved slugs, duplicates, and missing homepage", () => {
    const reserved: DemoPageSeed[] = [{ ...DEMO_PAGES[0], slug: "packages", isHomepage: true }];
    expect(() => assertDemoPagesSafe(reserved)).toThrow(/reserved/);

    const dup: DemoPageSeed[] = [DEMO_PAGES[0], { ...DEMO_PAGES[0], title: "Copy" }];
    expect(() => assertDemoPagesSafe(dup)).toThrow(/Duplicate/);

    const none: DemoPageSeed[] = DEMO_PAGES.map((p) => ({ ...p, isHomepage: false }));
    expect(() => assertDemoPagesSafe(none)).toThrow(/homepage/);

    const labby: DemoPageSeed[] = [{ ...DEMO_PAGES[0], body: "instalasi lab Rihla Mate CMS" }];
    expect(() => assertDemoPagesSafe(labby)).toThrow(/lab\/internal/);
  });
});

describe("DEMO_SETTINGS", () => {
  it("sets bureau name without payment or email secrets", () => {
    expect(DEMO_SETTINGS.appName).toBe("Safwah Haramain");
    expect(DEMO_SETTINGS.bookingPrefix).toBe("SFH");
    expect(DEMO_SETTINGS.currency).toBe("IDR");
    expect(DEMO_SETTINGS.contactEmail).toMatch(/@demo\.rihla\.my\.id$/);
    expect(Object.keys(DEMO_SETTINGS).join(" ")).not.toMatch(/midtrans|resend|secret|password/i);
    expect(JSON.stringify(DEMO_SETTINGS)).not.toMatch(/Biro Demo|white-label|CMS/i);
  });
});

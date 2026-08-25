import { describe, expect, it } from "vitest";
import { isReservedPublicSlug } from "./cms-pages";

describe("isReservedPublicSlug", () => {
  it("blocks app routes that must not be CMS pages", () => {
    expect(isReservedPublicSlug("packages")).toBe(true);
    expect(isReservedPublicSlug("Dashboard")).toBe(true);
    expect(isReservedPublicSlug("about-us")).toBe(false);
  });
});

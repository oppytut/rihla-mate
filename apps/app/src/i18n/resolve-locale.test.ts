import { describe, expect, it } from "vitest";
import { resolveAppLocale } from "./resolve-locale";

describe("resolveAppLocale", () => {
  it("accepts known locales", () => {
    expect(resolveAppLocale("en")).toBe("en");
    expect(resolveAppLocale("AR")).toBe("ar");
  });

  it("falls back for scanner junk", () => {
    expect(resolveAppLocale("index.php", "id")).toBe("id");
    expect(resolveAppLocale("test.hello")).toBe("id");
    expect(resolveAppLocale(undefined, undefined)).toBe("id");
  });
});

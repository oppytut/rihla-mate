import { describe, it, expect } from "vitest";
import { slugify, tryParseJson } from "../utils/slug";

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("lombok tour package")).toBe("lombok-tour-package");
  });

  it("removes special characters", () => {
    expect(slugify("Bali & Lombok Tour!")).toBe("bali-lombok-tour");
  });

  it("collapses multiple hyphens", () => {
    expect(slugify("hello   world")).toBe("hello-world");
  });

  it("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles string with only special characters", () => {
    expect(slugify("@#$%^&*()")).toBe("");
  });

  it("preserves numbers", () => {
    expect(slugify("Package 2026")).toBe("package-2026");
  });

  it("handles mixed case with numbers and hyphens", () => {
    expect(slugify("3-Day Bali Tour")).toBe("3-day-bali-tour");
  });

  it("handles accented characters by removing them", () => {
    expect(slugify("tête-à-tête")).toBe("tte-tte");
  });

  it("trims leading and trailing whitespace", () => {
    expect(slugify("  hello world  ")).toBe("hello-world");
  });
});

describe("tryParseJson", () => {
  it("returns valid for valid JSON object", () => {
    const result = tryParseJson('{"key": "value"}');
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns valid for valid JSON array", () => {
    const result = tryParseJson('["item1", "item2"]');
    expect(result.valid).toBe(true);
  });

  it("returns valid for valid JSON with nested objects", () => {
    const result = tryParseJson('[{"day": 1, "description": "Arrival"}]');
    expect(result.valid).toBe(true);
  });

  it("returns invalid for malformed JSON", () => {
    const result = tryParseJson("{invalid: json}");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid JSON format");
  });

  it("returns invalid for unclosed brackets", () => {
    const result = tryParseJson('["incomplete"');
    expect(result.valid).toBe(false);
  });

  it("returns valid for empty string", () => {
    const result = tryParseJson("");
    expect(result.valid).toBe(true);
  });

  it("returns valid for whitespace-only string", () => {
    const result = tryParseJson("   ");
    expect(result.valid).toBe(true);
  });

  it("returns valid for null value", () => {
    const result = tryParseJson("null");
    expect(result.valid).toBe(true);
  });

  it("returns valid for number value", () => {
    const result = tryParseJson("42");
    expect(result.valid).toBe(true);
  });

  it("returns invalid for trailing comma in object", () => {
    const result = tryParseJson('{"key": "value",}');
    expect(result.valid).toBe(false);
  });
});

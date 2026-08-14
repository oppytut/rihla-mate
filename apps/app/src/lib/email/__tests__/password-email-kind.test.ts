import { describe, it, expect } from "vitest";
import {
  normalizeAppLocale,
  localeFromCookieHeader,
  getPasswordEmailKind,
  getPasswordEmailLocale,
  withPasswordEmailKind,
  withPasswordEmailLocale,
  withInvitePasswordEmail,
} from "../password-email-kind";

describe("normalizeAppLocale", () => {
  it("accepts id, en, ar", () => {
    expect(normalizeAppLocale("id")).toBe("id");
    expect(normalizeAppLocale("en")).toBe("en");
    expect(normalizeAppLocale("ar")).toBe("ar");
  });

  it("falls back to id", () => {
    expect(normalizeAppLocale(undefined)).toBe("id");
    expect(normalizeAppLocale("fr")).toBe("id");
    expect(normalizeAppLocale("")).toBe("id");
  });
});

describe("localeFromCookieHeader", () => {
  it("reads locale cookie", () => {
    expect(localeFromCookieHeader("session=abc; locale=en; other=1")).toBe("en");
    expect(localeFromCookieHeader("locale=ar")).toBe("ar");
  });

  it("defaults to id when missing or invalid", () => {
    expect(localeFromCookieHeader(null)).toBe("id");
    expect(localeFromCookieHeader("sid=xyz")).toBe("id");
    expect(localeFromCookieHeader("locale=de")).toBe("id");
  });
});

describe("scoped kind and locale", () => {
  it("restores previous kind after withPasswordEmailKind", async () => {
    expect(getPasswordEmailKind()).toBe("reset");
    await withPasswordEmailKind("invite", async () => {
      expect(getPasswordEmailKind()).toBe("invite");
    });
    expect(getPasswordEmailKind()).toBe("reset");
  });

  it("scopes locale and restores", async () => {
    expect(getPasswordEmailLocale()).toBeNull();
    await withPasswordEmailLocale("en", async () => {
      expect(getPasswordEmailLocale()).toBe("en");
    });
    expect(getPasswordEmailLocale()).toBeNull();
  });

  it("withInvitePasswordEmail sets invite + cookie locale", async () => {
    await withInvitePasswordEmail("locale=ar", async () => {
      expect(getPasswordEmailKind()).toBe("invite");
      expect(getPasswordEmailLocale()).toBe("ar");
    });
    expect(getPasswordEmailKind()).toBe("reset");
    expect(getPasswordEmailLocale()).toBeNull();
  });
});

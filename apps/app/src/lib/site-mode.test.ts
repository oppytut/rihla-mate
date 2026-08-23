import { describe, expect, it } from "vitest";
import {
  hostnameFromHostHeader,
  isBureauHostname,
  isLocalDevHostname,
  isMarketingPath,
  isProductDocsPath,
  isProductHostname,
  isProductInstancePath,
  surfaceRedirectUrl,
  LAB_DEMO_ORIGIN,
  PRODUCT_ORIGIN,
  pickBureauClientMessages,
  staffSignInHrefForHost,
  stripLocalePrefix,
} from "./site-mode";

describe("site-mode", () => {
  it("parses host header", () => {
    expect(hostnameFromHostHeader("rihla.my.id:443")).toBe("rihla.my.id");
    expect(hostnameFromHostHeader("RIHLA.MY.ID")).toBe("rihla.my.id");
  });

  it("sends product hosts to lab sign-in", () => {
    expect(isProductHostname("rihla.my.id")).toBe(true);
    expect(isProductHostname("demo.rihla.my.id")).toBe(false);
    expect(staffSignInHrefForHost("rihla.my.id")).toBe(`${LAB_DEMO_ORIGIN}/sign-in`);
    expect(staffSignInHrefForHost("demo.rihla.my.id")).toBe("/sign-in");
  });

  it("treats demo and custom domains as bureau, not localhost", () => {
    expect(isBureauHostname("demo.rihla.my.id")).toBe(true);
    expect(isBureauHostname("umrah.example.com")).toBe(true);
    expect(isBureauHostname("rihla.my.id")).toBe(false);
    expect(isBureauHostname("localhost")).toBe(false);
    expect(isLocalDevHostname("127.0.0.1")).toBe(true);
  });

  it("strips locale prefix and classifies instance vs marketing paths", () => {
    expect(stripLocalePrefix("/en/sign-in", ["id", "en", "ar"])).toBe("/sign-in");
    expect(stripLocalePrefix("/id", ["id", "en", "ar"])).toBe("/");
    expect(isProductInstancePath("/dashboard/bookings")).toBe(true);
    expect(isProductInstancePath("/guide")).toBe(false);
    expect(isMarketingPath("/marketing")).toBe(true);
    expect(isMarketingPath("/packages")).toBe(false);
    expect(isProductDocsPath("/guide")).toBe(true);
    expect(isProductDocsPath("/packages")).toBe(false);
  });

  it("redirects surfaces between product and bureau origins", () => {
    const locales = ["id", "en", "ar"] as const;
    expect(surfaceRedirectUrl("rihla.my.id", "/sign-in", locales)).toBe(
      `${LAB_DEMO_ORIGIN}/sign-in`,
    );
    expect(surfaceRedirectUrl("demo.rihla.my.id", "/marketing", locales)).toBe(
      `${PRODUCT_ORIGIN}/`,
    );
    expect(surfaceRedirectUrl("demo.rihla.my.id", "/id/guide", locales)).toBe(
      `${PRODUCT_ORIGIN}/guide`,
    );
    expect(surfaceRedirectUrl("localhost", "/", locales)).toBeNull();
  });

  it("strips SaaS marketing keys from bureau client messages", () => {
    const slim = pickBureauClientMessages({
      common: { appName: "Rihla" },
      dashboard: { title: "Dash" },
      guide: { title: "Guide" },
      landing: { title: "SaaS" },
      marketing: {
        nav: {
          packages: "Paket",
          pricing: "Harga",
          features: "Fitur",
          staffSignIn: "Masuk staf",
          menu: "Menu",
          close: "Tutup",
        },
        bureau: { heroTitle: "Umrah" },
        footer: {
          copyright: "c",
          tagline: "Platform travel Umrah white-label",
          pricing: "Harga",
        },
        pricing: { sectionTitle: "Harga Sederhana dan Transparan" },
        hero: { subtitle: "White-label" },
        faq: { items: [] },
      },
    });
    expect(slim.guide).toBeUndefined();
    expect(slim.landing).toBeUndefined();
    expect(slim.dashboard).toEqual({ title: "Dash" });
    expect(slim.marketing).toEqual({
      nav: {
        packages: "Paket",
        staffSignIn: "Masuk staf",
        menu: "Menu",
        close: "Tutup",
      },
      bureau: { heroTitle: "Umrah" },
      footer: { copyright: "c" },
    });
    expect(JSON.stringify(slim)).not.toMatch(/Harga|White-label|white-label/);
  });
});

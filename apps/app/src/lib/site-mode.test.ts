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
  isBureauAuthPath,
  isBureauCatalogPath,
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
    expect(isProductDocsPath("/privacy")).toBe(true);
    expect(isProductDocsPath("/terms")).toBe(true);
    expect(isProductDocsPath("/packages")).toBe(false);
    expect(isBureauCatalogPath("/packages")).toBe(true);
    expect(isBureauCatalogPath("/packages/umrah-plus")).toBe(true);
    expect(isBureauCatalogPath("/")).toBe(false);
    expect(isBureauAuthPath("/sign-in")).toBe(true);
    expect(isBureauAuthPath("/forgot-password")).toBe(true);
    expect(isBureauAuthPath("/reset-password")).toBe(true);
    expect(isBureauAuthPath("/dashboard")).toBe(false);
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
    expect(surfaceRedirectUrl("demo.rihla.my.id", "/privacy", locales)).toBe(
      `${PRODUCT_ORIGIN}/privacy`,
    );
    expect(surfaceRedirectUrl("demo.rihla.my.id", "/en/terms", locales)).toBe(
      `${PRODUCT_ORIGIN}/terms`,
    );
    expect(surfaceRedirectUrl("localhost", "/", locales)).toBeNull();
  });

  it("strips SaaS marketing keys and staff namespaces from bureau client messages", () => {
    const messages = {
      common: { appName: "Rihla", appNameAbbr: "RM", loading: "Memuat", error: "Error" },
      dashboard: { title: "Dash", sidebar: { packages: "Harga" } },
      auth: { signIn: "Masuk" },
      guide: { title: "Guide" },
      legal: { privacy: { title: "Privasi" } },
      landing: { title: "SaaS" },
      packages: { title: "Paket" },
      validation: { required: "Wajib" },
      bookings: { title: "Booking" },
      marketing: {
        nav: {
          packages: "Paket",
          pricing: "Harga",
          features: "Fitur",
          about: "Tentang",
          staffSignIn: "Masuk staf",
          menu: "Menu",
          close: "Tutup",
        },
        bureau: {
          heroTitle: "Umrah",
          copyright: "© {year} {name}",
          poweredHint: "Situs biro",
        },
        footer: {
          copyright: "© {year} Rihla Mate. Seluruh hak cipta dilindungi.",
          tagline: "Platform travel Umrah white-label",
          pricing: "Harga",
        },
        pricing: { sectionTitle: "Harga Sederhana dan Transparan" },
        hero: { subtitle: "White-label" },
        faq: { items: [] },
      },
    };
    const slim = pickBureauClientMessages(messages);
    expect(slim.guide).toBeUndefined();
    expect(slim.legal).toBeUndefined();
    expect(slim.landing).toBeUndefined();
    expect(slim.dashboard).toBeUndefined();
    expect(slim.auth).toEqual({ signIn: "Masuk" });
    expect(slim.packages).toBeUndefined();
    expect(slim.validation).toBeUndefined();
    expect(slim.bookings).toBeUndefined();
    expect(slim.common).toEqual({
      appName: "Rihla",
      appNameAbbr: "RM",
      loading: "Memuat",
      error: "Error",
    });
    expect(slim.marketing).toEqual({
      nav: {
        packages: "Paket",
        about: "Tentang",
        staffSignIn: "Masuk staf",
        menu: "Menu",
        close: "Tutup",
      },
      bureau: { heroTitle: "Umrah", copyright: "© {year} {name}" },
    });
    expect(JSON.stringify(slim)).not.toMatch(
      /Harga|White-label|white-label|Rihla Mate|poweredHint/,
    );

    const catalog = pickBureauClientMessages(messages, { catalog: true });
    expect(catalog.packages).toEqual({ title: "Paket" });
    expect(catalog.validation).toEqual({ required: "Wajib" });
    expect(catalog.bookings).toEqual({ title: "Booking" });
    expect(catalog.common).toEqual({
      appName: "Rihla",
      appNameAbbr: "RM",
      loading: "Memuat",
      error: "Error",
    });

    const auth = pickBureauClientMessages(
      {
        ...messages,
        auth: {
          signIn: "Masuk",
          productHostHint: "Ini situs produk Rihla Mate",
          openLabDemo: "Lab",
        },
      },
      { auth: true },
    );
    expect(auth.auth).toEqual({ signIn: "Masuk" });
    expect(auth.dashboard).toBeUndefined();
    expect(JSON.stringify(auth)).not.toMatch(/Rihla Mate|productHostHint/);
  });
});

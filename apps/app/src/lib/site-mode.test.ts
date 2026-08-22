import { describe, expect, it } from "vitest";
import {
  hostnameFromHostHeader,
  isBureauHostname,
  isLocalDevHostname,
  isMarketingPath,
  isProductHostname,
  isProductInstancePath,
  LAB_DEMO_ORIGIN,
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
  });
});

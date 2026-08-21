import { describe, expect, it } from "vitest";
import {
  hostnameFromHostHeader,
  isProductHostname,
  LAB_DEMO_ORIGIN,
  staffSignInHrefForHost,
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
});

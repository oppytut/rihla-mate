import { describe, expect, it } from "vitest";
import { isKnownPackageCategory, packageCategorySlug } from "./bureau-package-category";
import { parseBureauSettingsMap, whatsappHref } from "./bureau-contact";

describe("packageCategorySlug", () => {
  it("normalizes stored i18n keys and short slugs", () => {
    expect(packageCategorySlug("economy")).toBe("economy");
    expect(packageCategorySlug("packages.category.economy")).toBe("economy");
    expect(packageCategorySlug("VIP")).toBe("vip");
    expect(isKnownPackageCategory("economy")).toBe(true);
    expect(isKnownPackageCategory("hajj")).toBe(false);
  });
});

describe("whatsappHref", () => {
  it("builds wa.me from local and international numbers", () => {
    expect(whatsappHref("+62 21 3891 2200")).toBe("https://wa.me/622138912200");
    expect(whatsappHref("081234567890")).toBe("https://wa.me/6281234567890");
    expect(whatsappHref("abc")).toBeNull();
  });
});

describe("parseBureauSettingsMap", () => {
  it("reads contact fields from settings rows", () => {
    expect(
      parseBureauSettingsMap([
        { key: "contactEmail", value: "halo@demo.rihla.my.id" },
        { key: "contactPhone", value: { value: "+62 21 3891 2200" } },
        { key: "address", value: "Senen" },
      ]),
    ).toEqual({
      email: "halo@demo.rihla.my.id",
      phone: "+62 21 3891 2200",
      address: "Senen",
    });
  });
});

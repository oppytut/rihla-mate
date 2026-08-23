import { describe, expect, it } from "vitest";
import { bureauAbbr, bureauCatalogMetadata } from "./bureau-brand";

describe("bureauAbbr", () => {
  it("uses first letters of two words", () => {
    expect(bureauAbbr("Biro Demo")).toBe("BD");
  });

  it("falls back to first two characters", () => {
    expect(bureauAbbr("Umrah")).toBe("UM");
  });
});

describe("bureauCatalogMetadata", () => {
  it("sets title and bureau applicationName", () => {
    const meta = bureauCatalogMetadata({
      bureauName: "Biro Demo",
      pageTitle: "Umrah 9 Hari",
      description: "Paket",
    });
    expect(meta.title).toBe("Umrah 9 Hari");
    expect(meta.applicationName).toBe("Biro Demo");
    expect(meta.openGraph?.siteName).toBe("Biro Demo");
    expect(meta.openGraph?.title).toBe("Umrah 9 Hari");
  });
});

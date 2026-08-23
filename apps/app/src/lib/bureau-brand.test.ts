import { describe, expect, it } from "vitest";
import { bureauAbbr } from "./bureau-brand";

describe("bureauAbbr", () => {
  it("uses first letters of two words", () => {
    expect(bureauAbbr("Biro Demo")).toBe("BD");
  });

  it("falls back to first two characters", () => {
    expect(bureauAbbr("Umrah")).toBe("UM");
  });
});

import { describe, expect, it } from "vitest";
import { asSpecRows, asStringList, readGuideSection } from "./guide-section";

describe("readGuideSection", () => {
  it("returns empty lists when optional keys are missing", () => {
    const result = readGuideSection(
      { who: { nav: "Who", title: "Who", body: "Intro", steps: ["a"], notes: ["b"] } },
      "who",
    );
    expect(result.steps).toEqual(["a"]);
    expect(result.notes).toEqual(["b"]);
    expect(result.specs).toEqual([]);
  });

  it("reads spec rows when present", () => {
    const result = readGuideSection(
      {
        server: {
          specs: [{ item: "CPU", min: "2", rec: "4" }],
        },
      },
      "server",
    );
    expect(result.specs).toEqual([{ item: "CPU", min: "2", rec: "4" }]);
  });

  it("ignores non-arrays from missing-message fallbacks", () => {
    expect(asStringList("guide.sections.who.specs (id)")).toEqual([]);
    expect(asSpecRows("guide.sections.who.specs (id)")).toEqual([]);
  });
});

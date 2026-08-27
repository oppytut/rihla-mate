import { describe, expect, it } from "vitest";
import {
  EMPTY_BUREAU_HOME_SECTIONS,
  completeGallery,
  filledGallery,
  filledTextItems,
  parseBureauHomeSections,
} from "./bureau-home-sections";

describe("parseBureauHomeSections", () => {
  it("returns empty padded structure for null", () => {
    const parsed = parseBureauHomeSections(null);
    expect(parsed.whyItems).toHaveLength(4);
    expect(parsed.howSteps).toHaveLength(3);
    expect(parsed.gallery).toHaveLength(4);
    expect(parsed.testimonials).toHaveLength(2);
    expect(parsed.whyTitle).toBe("");
  });

  it("unwraps settings { value } wrapper", () => {
    const parsed = parseBureauHomeSections({
      value: { whyTitle: "  Custom why  ", whyItems: [{ title: "A", body: "B" }] },
    });
    expect(parsed.whyTitle).toBe("Custom why");
    expect(parsed.whyItems[0]).toEqual({ title: "A", body: "B" });
    expect(parsed.whyItems).toHaveLength(4);
  });

  it("keeps extra gallery rows beyond the minimum", () => {
    const parsed = parseBureauHomeSections({
      gallery: [
        { src: "https://a.example/1.jpg", alt: "one" },
        { src: "https://a.example/2.jpg", alt: "two" },
        { src: "https://a.example/3.jpg", alt: "three" },
        { src: "https://a.example/4.jpg", alt: "four" },
        { src: "https://a.example/5.jpg", alt: "five" },
      ],
    });
    expect(parsed.gallery).toHaveLength(5);
    expect(filledGallery(parsed.gallery)).toHaveLength(5);
  });

  it("filters blank text items", () => {
    expect(filledTextItems(EMPTY_BUREAU_HOME_SECTIONS.whyItems)).toEqual([]);
    expect(filledTextItems([{ title: "x", body: "" }])).toEqual([{ title: "x", body: "" }]);
  });

  it("fills missing gallery slots from fallbacks without duplicating src", () => {
    const fallbacks = [
      { src: "https://a.example/1.jpg", alt: "one" },
      { src: "https://a.example/2.jpg", alt: "two" },
      { src: "https://a.example/3.jpg", alt: "three" },
      { src: "https://a.example/4.jpg", alt: "four" },
    ];
    const completed = completeGallery(
      [
        { src: "https://a.example/1.jpg", alt: "cms" },
        { src: "", alt: "empty" },
      ],
      fallbacks,
    );
    expect(completed).toHaveLength(4);
    expect(completed.map((item) => item.src)).toEqual([
      "https://a.example/1.jpg",
      "https://a.example/2.jpg",
      "https://a.example/3.jpg",
      "https://a.example/4.jpg",
    ]);
    expect(completed[0]?.alt).toBe("cms");
  });
});

import { describe, expect, it } from "vitest";
import { cmsAbsoluteHttpUrl, cmsPageBody, cmsSeoField, cmsText } from "./cms-content";

describe("cmsText", () => {
  it("returns trimmed string fields and ignores empty values", () => {
    expect(cmsText({ body: "  Hello  " }, "body")).toBe("Hello");
    expect(cmsText({ body: "   " }, "body")).toBeNull();
    expect(cmsText(null, "body")).toBeNull();
    expect(cmsText({ body: 1 }, "body")).toBeNull();
  });
});

describe("cmsPageBody", () => {
  it("prefers body over html", () => {
    expect(cmsPageBody({ body: "A", html: "B" })).toBe("A");
    expect(cmsPageBody({ html: "<p>Hi</p>" })).toBe("<p>Hi</p>");
    expect(cmsPageBody({})).toBeNull();
  });
});

describe("cmsSeoField", () => {
  it("reads seo strings", () => {
    expect(cmsSeoField({ title: " T " }, "title")).toBe("T");
    expect(cmsSeoField({}, "description")).toBeNull();
    expect(cmsSeoField({ ogImage: " https://cdn.example/og.jpg " }, "ogImage")).toBe(
      "https://cdn.example/og.jpg",
    );
  });
});

describe("cmsAbsoluteHttpUrl", () => {
  it("accepts http(s) and rejects relative or non-http schemes", () => {
    expect(cmsAbsoluteHttpUrl("https://images.unsplash.com/photo.jpg")).toBe(
      "https://images.unsplash.com/photo.jpg",
    );
    expect(cmsAbsoluteHttpUrl("/uploads/og.png")).toBeNull();
    expect(cmsAbsoluteHttpUrl("javascript:alert(1)")).toBeNull();
    expect(cmsAbsoluteHttpUrl("")).toBeNull();
  });
});

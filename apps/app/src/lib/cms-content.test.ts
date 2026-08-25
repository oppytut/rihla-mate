import { describe, expect, it } from "vitest";
import {
  buildCmsContent,
  buildCmsSeo,
  buildPackageI18n,
  cmsAbsoluteHttpUrl,
  cmsLocaleCopies,
  cmsLocalizedText,
  cmsPackageCopy,
  cmsPageBody,
  cmsPageTitle,
  cmsSeoField,
  cmsText,
} from "./cms-content";

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

describe("cmsLocalizedText / cmsPageBody locale", () => {
  const content = {
    body: "ID body",
    title: "ID title",
    locales: {
      en: { body: "EN body", title: "EN title" },
      ar: { body: "AR body" },
    },
  };

  it("returns locale copy and falls back to ID", () => {
    expect(cmsPageBody(content, "en")).toBe("EN body");
    expect(cmsPageBody(content, "ar")).toBe("AR body");
    expect(cmsPageBody(content, "id")).toBe("ID body");
    expect(cmsPageBody(content, "en")).not.toBe("ID body");
    expect(cmsPageTitle("row", content, "en")).toBe("EN title");
    expect(cmsPageTitle("row", content, "ar")).toBe("ID title");
    expect(cmsLocalizedText(content, "missing", "en")).toBeNull();
  });

  it("does not inherit ID body into empty EN/AR editor copies", () => {
    const copies = cmsLocaleCopies(content);
    expect(copies.id.body).toBe("ID body");
    expect(copies.en.body).toBe("EN body");
    expect(cmsLocaleCopies({ body: "only-id" }).en.body).toBe("");
    expect(cmsLocaleCopies({ body: "only-id" }).ar.body).toBe("");
  });
});

describe("buildCmsContent / buildCmsSeo / package i18n", () => {
  it("omits empty locale buckets", () => {
    expect(buildCmsContent("Hello", { en: { title: "", body: "  " } })).toEqual({ body: "Hello" });
    expect(buildCmsContent("Hello", { en: { title: "Hi", body: "EN" } }).locales).toEqual({
      en: { title: "Hi", body: "EN" },
    });
    expect(
      buildCmsSeo({
        title: "T",
        description: "D",
        ogImage: "",
        locales: { en: { title: "ET", description: "" } },
      }).locales,
    ).toEqual({ en: { title: "ET" } });
    expect(cmsSeoField({ title: "T", locales: { en: { title: "ET" } } }, "title", "en")).toBe("ET");
    expect(cmsPackageCopy("ID", "desc", { en: { title: "EN" } }, "en")).toEqual({
      title: "EN",
      description: "desc",
    });
    expect(buildPackageI18n({ en: { title: "EN", description: "" } })).toEqual({
      en: { title: "EN" },
    });
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

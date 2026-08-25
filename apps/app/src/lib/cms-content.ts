export function cmsText(content: unknown, key: string): string | null {
  if (!content || typeof content !== "object") return null;
  const value = (content as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function cmsPageBody(content: unknown): string | null {
  return cmsText(content, "body") ?? cmsText(content, "html");
}

export function cmsSeoField(seo: unknown, key: "title" | "description" | "ogImage"): string | null {
  if (!seo || typeof seo !== "object") return null;
  const value = (seo as Record<string, unknown>)[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Absolute http(s) URL only — relative paths and javascript: are rejected. */
export function cmsAbsoluteHttpUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

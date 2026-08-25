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

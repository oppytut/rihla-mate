const KNOWN = new Set(["standard", "premium", "vip", "economy", "plus"]);

export function packageCategorySlug(raw: string | null | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) return "";
  const stripped = value.replace(/^packages\.category\./i, "").toLowerCase();
  return stripped;
}

export function isKnownPackageCategory(slug: string): boolean {
  return KNOWN.has(slug);
}

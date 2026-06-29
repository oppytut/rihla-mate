export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .replace(/^-+|-+$/g, "");
}

export function tryParseJson(value: string): { valid: boolean; error?: string } {
  if (!value.trim()) return { valid: true };
  try {
    JSON.parse(value);
    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid JSON format" };
  }
}

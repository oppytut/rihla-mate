import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { settings } from "@/lib/db/schema/settings";

function settingText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "string" && inner.trim()) return inner.trim();
  }
  return null;
}

export async function getBureauDisplayName(): Promise<string | null> {
  try {
    const db = await getDb();
    const [row] = await db.select().from(settings).where(eq(settings.key, "appName")).limit(1);
    return settingText(row?.value);
  } catch {
    return null;
  }
}

export function bureauAbbr(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  const second = parts[1];
  if (second) {
    return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase();
  }
  const compact = name.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "UM";
}

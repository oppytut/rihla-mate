export type GuideSpecRow = { item: string; min: string; rec: string };

export function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function asSpecRows(value: unknown): GuideSpecRow[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row): row is GuideSpecRow => {
    if (!row || typeof row !== "object") return false;
    const rec = row as Record<string, unknown>;
    return (
      typeof rec.item === "string" && typeof rec.min === "string" && typeof rec.rec === "string"
    );
  });
}

export function readGuideSection(sections: unknown, id: string) {
  const bag = sections && typeof sections === "object" ? (sections as Record<string, unknown>) : {};
  const raw = bag[id];
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    steps: asStringList(obj.steps),
    notes: asStringList(obj.notes),
    specs: asSpecRows(obj.specs),
  };
}

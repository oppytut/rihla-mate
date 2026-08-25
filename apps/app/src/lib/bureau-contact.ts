export type BureauPublicContact = {
  email: string | null;
  phone: string | null;
  address: string | null;
};

function settingText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "string" && inner.trim()) return inner.trim();
  }
  return null;
}

export function parseBureauSettingsMap(
  rows: Array<{ key: string; value: unknown }>,
): BureauPublicContact {
  const map = new Map(rows.map((row) => [row.key, row.value]));
  return {
    email: settingText(map.get("contactEmail")),
    phone: settingText(map.get("contactPhone")),
    address: settingText(map.get("address")),
  };
}

export function whatsappHref(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

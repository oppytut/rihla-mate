export const EKONOMI_AVAILABLE_DATES = [
  "2026-07-01",
  "2026-07-15",
  "2026-08-01",
  "2026-08-15",
  "2026-09-01",
  "2026-10-01",
] as const;

export type CalendarTarget = {
  iso: string;
  dataDay: string;
  monthsAhead: number;
};

function startOfToday(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDataDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function pickFutureEkonomiDate(now = new Date()): CalendarTarget {
  const today = startOfToday(now);
  const match = EKONOMI_AVAILABLE_DATES.map(parseIsoDate).find((d) => d >= today);
  if (!match) {
    throw new Error(
      `No Ekonomi availableDates on or after ${today.toISOString().slice(0, 10)}. Update playwright-seed.ts.`,
    );
  }
  return {
    iso: `${match.getFullYear()}-${String(match.getMonth() + 1).padStart(2, "0")}-${String(match.getDate()).padStart(2, "0")}`,
    dataDay: toDataDay(match),
    monthsAhead: Math.max(0, monthsBetween(today, match)),
  };
}

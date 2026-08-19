import { normalizeAppLocale, type AppLocale } from "@/lib/email/password-email-kind";

const INTL_LOCALES: Record<AppLocale, string> = {
  id: "id-ID",
  en: "en-US",
  ar: "ar-SA",
};

function intlLocale(locale?: string, fallback: AppLocale = "id"): string {
  if (!locale) return INTL_LOCALES[fallback];
  return INTL_LOCALES[normalizeAppLocale(locale)];
}

export function formatPrice(
  price: string | number,
  currency: string = "IDR",
  locale?: string,
): string {
  const num = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat(intlLocale(locale, "id"), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatDisplayDate(dateStr: string, locale?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString(intlLocale(locale, "en"), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateForDisplay(date: Date, locale?: string): string {
  return date.toLocaleDateString(intlLocale(locale, "en"), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

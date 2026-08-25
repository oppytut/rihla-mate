export const CMS_LOCALES = ["id", "en", "ar"] as const;
export type CmsLocale = (typeof CMS_LOCALES)[number];
export const CMS_DEFAULT_LOCALE: CmsLocale = "id";

export function isCmsLocale(value: string): value is CmsLocale {
  return (CMS_LOCALES as readonly string[]).includes(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function cmsText(content: unknown, key: string): string | null {
  const rec = asRecord(content);
  if (!rec) return null;
  const value = rec[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function localeBucket(content: unknown, locale: string): Record<string, unknown> | null {
  const rec = asRecord(content);
  if (!rec) return null;
  const nested = asRecord(rec.locales);
  if (nested) {
    const fromNested = asRecord(nested[locale]);
    if (fromNested) return fromNested;
  }
  return asRecord(rec[locale]);
}

export function cmsLocalizedText(
  content: unknown,
  key: string,
  locale: string,
  fallbackKeys: string[] = [key],
): string | null {
  const loc = isCmsLocale(locale) ? locale : CMS_DEFAULT_LOCALE;
  if (loc !== CMS_DEFAULT_LOCALE) {
    const bucket = localeBucket(content, loc);
    for (const k of fallbackKeys) {
      const fromLocale = cmsText(bucket, k);
      if (fromLocale) return fromLocale;
    }
  }
  for (const k of fallbackKeys) {
    const base = cmsText(content, k);
    if (base) return base;
  }
  return null;
}

export function cmsPageBody(content: unknown, locale: string = CMS_DEFAULT_LOCALE): string | null {
  return cmsLocalizedText(content, "body", locale, ["body", "html"]);
}

export function cmsPageTitle(
  rowTitle: string | null | undefined,
  content: unknown,
  locale: string = CMS_DEFAULT_LOCALE,
): string | null {
  const loc = isCmsLocale(locale) ? locale : CMS_DEFAULT_LOCALE;
  if (loc !== CMS_DEFAULT_LOCALE) {
    const fromLocale = cmsText(localeBucket(content, loc), "title");
    if (fromLocale) return fromLocale;
  }
  const fromContent = cmsText(content, "title");
  if (fromContent) return fromContent;
  const trimmed = rowTitle?.trim();
  return trimmed || null;
}

export function cmsSeoField(
  seo: unknown,
  key: "title" | "description" | "ogImage",
  locale: string = CMS_DEFAULT_LOCALE,
): string | null {
  const loc = isCmsLocale(locale) ? locale : CMS_DEFAULT_LOCALE;
  if (loc !== CMS_DEFAULT_LOCALE && key !== "ogImage") {
    const fromLocale = cmsText(localeBucket(seo, loc), key);
    if (fromLocale) return fromLocale;
  }
  return cmsText(seo, key);
}

export type CmsLocaleCopy = { title: string; body: string };

export function cmsLocaleCopies(content: unknown): Record<CmsLocale, CmsLocaleCopy> {
  const idBody = cmsText(content, "body") ?? cmsText(content, "html") ?? "";
  const idTitle = cmsText(content, "title") ?? "";
  const copies: Record<CmsLocale, CmsLocaleCopy> = {
    id: { title: idTitle, body: idBody },
    en: { title: "", body: "" },
    ar: { title: "", body: "" },
  };
  for (const loc of ["en", "ar"] as const) {
    const bucket = localeBucket(content, loc);
    copies[loc] = {
      title: cmsText(bucket, "title") ?? "",
      body: cmsText(bucket, "body") ?? cmsText(bucket, "html") ?? "",
    };
  }
  return copies;
}

export function buildCmsContent(
  idBody: string,
  locales: Partial<Record<Exclude<CmsLocale, "id">, CmsLocaleCopy>>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { body: idBody };
  const locRec: Record<string, unknown> = {};
  for (const loc of ["en", "ar"] as const) {
    const copy = locales[loc];
    if (!copy) continue;
    const title = copy.title.trim();
    const body = copy.body.trim();
    if (!title && !body) continue;
    locRec[loc] = { ...(title ? { title } : {}), ...(body ? { body } : {}) };
  }
  if (Object.keys(locRec).length > 0) out.locales = locRec;
  return out;
}

export type CmsSeoLocaleCopy = { title: string; description: string };

export function cmsSeoCopies(seo: unknown): Record<CmsLocale, CmsSeoLocaleCopy> {
  const copies: Record<CmsLocale, CmsSeoLocaleCopy> = {
    id: {
      title: cmsText(seo, "title") ?? "",
      description: cmsText(seo, "description") ?? "",
    },
    en: { title: "", description: "" },
    ar: { title: "", description: "" },
  };
  for (const loc of ["en", "ar"] as const) {
    const bucket = localeBucket(seo, loc);
    copies[loc] = {
      title: cmsText(bucket, "title") ?? "",
      description: cmsText(bucket, "description") ?? "",
    };
  }
  return copies;
}

export function cmsPackageCopy(
  title: string,
  description: string | null | undefined,
  i18n: unknown,
  locale: string,
): { title: string; description: string | null } {
  const loc = isCmsLocale(locale) ? locale : CMS_DEFAULT_LOCALE;
  if (loc === CMS_DEFAULT_LOCALE) {
    return { title, description: description ?? null };
  }
  const bucket = localeBucket(i18n, loc);
  return {
    title: cmsText(bucket, "title") ?? title,
    description: cmsText(bucket, "description") ?? description ?? null,
  };
}

export function buildPackageI18n(
  locales: Partial<Record<Exclude<CmsLocale, "id">, { title: string; description: string }>>,
): Record<string, { title?: string; description?: string }> {
  const out: Record<string, { title?: string; description?: string }> = {};
  for (const loc of ["en", "ar"] as const) {
    const copy = locales[loc];
    if (!copy) continue;
    const title = copy.title.trim();
    const description = copy.description.trim();
    if (!title && !description) continue;
    out[loc] = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
  }
  return out;
}

export function buildCmsSeo(input: {
  title: string;
  description: string;
  ogImage: string;
  locales?: Partial<Record<Exclude<CmsLocale, "id">, { title: string; description: string }>>;
}): Record<string, unknown> {
  const seo: Record<string, unknown> = {
    title: input.title || undefined,
    description: input.description || undefined,
    ogImage: input.ogImage || undefined,
  };
  const locRec: Record<string, unknown> = {};
  for (const loc of ["en", "ar"] as const) {
    const copy = input.locales?.[loc];
    if (!copy) continue;
    const title = copy.title.trim();
    const description = copy.description.trim();
    if (!title && !description) continue;
    locRec[loc] = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
  }
  if (Object.keys(locRec).length > 0) seo.locales = locRec;
  return seo;
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

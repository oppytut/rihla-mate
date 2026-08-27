export const BUREAU_HOME_SECTIONS_KEY = "bureauHomeSections";

export type BureauTextItem = { title: string; body: string };
export type BureauGalleryItem = { src: string; alt: string };
export type BureauTestimonialItem = { quote: string; name: string };

export type BureauHomeSections = {
  whyTitle: string;
  whyLead: string;
  whyItems: BureauTextItem[];
  howTitle: string;
  howLead: string;
  howSteps: BureauTextItem[];
  galleryTitle: string;
  gallery: BureauGalleryItem[];
  testimonialsTitle: string;
  testimonials: BureauTestimonialItem[];
};

export const EMPTY_BUREAU_HOME_SECTIONS: BureauHomeSections = {
  whyTitle: "",
  whyLead: "",
  whyItems: [
    { title: "", body: "" },
    { title: "", body: "" },
    { title: "", body: "" },
    { title: "", body: "" },
  ],
  howTitle: "",
  howLead: "",
  howSteps: [
    { title: "", body: "" },
    { title: "", body: "" },
    { title: "", body: "" },
  ],
  galleryTitle: "",
  gallery: [
    { src: "", alt: "" },
    { src: "", alt: "" },
    { src: "", alt: "" },
    { src: "", alt: "" },
  ],
  testimonialsTitle: "",
  testimonials: [
    { quote: "", name: "" },
    { quote: "", name: "" },
  ],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapSetting(value: unknown): unknown {
  const rec = asRecord(value);
  if (rec && "value" in rec && Object.keys(rec).length <= 2) {
    return rec.value;
  }
  return value;
}

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function padItems<T>(items: T[], fallback: T[], min: number): T[] {
  const next = items.slice(0, Math.max(min, items.length));
  while (next.length < min) {
    next.push(fallback[next.length] ?? fallback[0]);
  }
  return next;
}

function parseTextItems(value: unknown, min: number): BureauTextItem[] {
  const fallback = EMPTY_BUREAU_HOME_SECTIONS.whyItems;
  if (!Array.isArray(value)) {
    return padItems([], fallback, min).map(() => ({ title: "", body: "" }));
  }
  const items = value.map((row) => {
    const rec = asRecord(row);
    return { title: str(rec?.title), body: str(rec?.body) };
  });
  return padItems(
    items,
    Array.from({ length: min }, () => ({ title: "", body: "" })),
    min,
  );
}

function parseGallery(value: unknown): BureauGalleryItem[] {
  const min = 4;
  if (!Array.isArray(value)) {
    return EMPTY_BUREAU_HOME_SECTIONS.gallery.map((item) => ({ ...item }));
  }
  const items = value.map((row) => {
    const rec = asRecord(row);
    return { src: str(rec?.src), alt: str(rec?.alt) };
  });
  return padItems(
    items,
    Array.from({ length: min }, () => ({ src: "", alt: "" })),
    min,
  );
}

function parseTestimonials(value: unknown): BureauTestimonialItem[] {
  const min = 2;
  if (!Array.isArray(value)) {
    return EMPTY_BUREAU_HOME_SECTIONS.testimonials.map((item) => ({ ...item }));
  }
  const items = value.map((row) => {
    const rec = asRecord(row);
    return { quote: str(rec?.quote), name: str(rec?.name) };
  });
  return padItems(
    items,
    Array.from({ length: min }, () => ({ quote: "", name: "" })),
    min,
  );
}

export function parseBureauHomeSections(value: unknown): BureauHomeSections {
  const rec = asRecord(unwrapSetting(value));
  if (!rec) {
    return {
      ...EMPTY_BUREAU_HOME_SECTIONS,
      whyItems: EMPTY_BUREAU_HOME_SECTIONS.whyItems.map((i) => ({ ...i })),
      howSteps: EMPTY_BUREAU_HOME_SECTIONS.howSteps.map((i) => ({ ...i })),
      gallery: EMPTY_BUREAU_HOME_SECTIONS.gallery.map((i) => ({ ...i })),
      testimonials: EMPTY_BUREAU_HOME_SECTIONS.testimonials.map((i) => ({ ...i })),
    };
  }
  return {
    whyTitle: str(rec.whyTitle),
    whyLead: str(rec.whyLead),
    whyItems: parseTextItems(rec.whyItems, 4),
    howTitle: str(rec.howTitle),
    howLead: str(rec.howLead),
    howSteps: parseTextItems(rec.howSteps, 3),
    galleryTitle: str(rec.galleryTitle),
    gallery: parseGallery(rec.gallery),
    testimonialsTitle: str(rec.testimonialsTitle),
    testimonials: parseTestimonials(rec.testimonials),
  };
}

export function filledTextItems(items: BureauTextItem[]): BureauTextItem[] {
  return items.filter((item) => item.title || item.body);
}

export function filledGallery(items: BureauGalleryItem[]): BureauGalleryItem[] {
  return items.filter((item) => item.src);
}

export function completeGallery(
  items: BureauGalleryItem[],
  fallbacks: readonly BureauGalleryItem[],
  min = 4,
): BureauGalleryItem[] {
  const used = new Set<string>();
  const unusedFallbacks = () => fallbacks.filter((item) => item.src && !used.has(item.src));

  const patched = items.map((item) => {
    if (item.src) {
      used.add(item.src);
      return item;
    }
    const next = unusedFallbacks()[0];
    if (!next) return item;
    used.add(next.src);
    return { src: next.src, alt: item.alt || next.alt };
  });

  const filled = filledGallery(patched);
  if (filled.length >= min) return filled;
  const extras = unusedFallbacks();
  return [...filled, ...extras].slice(0, Math.max(min, filled.length));
}

export function filledTestimonials(items: BureauTestimonialItem[]): BureauTestimonialItem[] {
  return items.filter((item) => item.quote || item.name);
}

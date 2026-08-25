import { cmsAbsoluteHttpUrl } from "@/lib/cms-content";
import { isReservedPublicSlug } from "@/lib/cms-pages";

export type DemoPageSeed = {
  slug: string;
  title: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  ogImage: string;
  isPublished: boolean;
  isHomepage: boolean;
};

export const DEMO_OG_IMAGE =
  "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80";

export const DEMO_SETTINGS: Record<string, string> = {
  appName: "Biro Demo",
  appDescription:
    "Travel Umrah white-label untuk jamaah Indonesia. Paket ekonomi, plus, dan VIP dengan mutawwif berbahasa Indonesia.",
  contactEmail: "halo@demo.rihla.my.id",
  contactPhone: "+62 21 0000 0000",
  address: "Jakarta, Indonesia",
  currency: "IDR",
  bookingPrefix: "RHL",
};

export const DEMO_PAGES: DemoPageSeed[] = [
  {
    slug: "home",
    title: "Umrah bersama Biro Demo",
    body: [
      "Assalamu'alaikum. Biro Demo mendampingi jamaah Indonesia ke Tanah Suci dengan paket jelas, mutawwif berbahasa Indonesia, dan hotel dekat Haram.",
      "",
      "Pilih paket ekonomi 9 hari, plus 12 hari, atau VIP Ramadhan. Semua termasuk visa, tiket, hotel, dan pendampingan manasik.",
      "",
      "Hubungi kami untuk jadwal keberangkatan berikutnya.",
    ].join("\n"),
    seoTitle: "Biro Demo — Paket Umrah",
    seoDescription:
      "Paket Umrah ekonomi, plus, dan VIP dari Biro Demo. Mutawwif Indonesia, hotel dekat Haram.",
    ogImage: DEMO_OG_IMAGE,
    isPublished: true,
    isHomepage: true,
  },
  {
    slug: "about",
    title: "Tentang kami",
    body: [
      "Biro Demo adalah instalasi lab Rihla Mate untuk travel agent Umrah.",
      "",
      "Kami menampilkan katalog paket, halaman CMS, dan alur booking seperti yang dipakai biro di produksi — tanpa data pelanggan sungguhan.",
    ].join("\n"),
    seoTitle: "Tentang Biro Demo",
    seoDescription: "Profil singkat Biro Demo, travel Umrah white-label.",
    ogImage: DEMO_OG_IMAGE,
    isPublished: true,
    isHomepage: false,
  },
  {
    slug: "contact",
    title: "Hubungi kami",
    body: [
      "Email: halo@demo.rihla.my.id",
      "Telepon: +62 21 0000 0000",
      "Alamat: Jakarta, Indonesia",
      "",
      "Jam operasional: Senin–Jumat 09.00–17.00 WIB.",
    ].join("\n"),
    seoTitle: "Kontak Biro Demo",
    seoDescription: "Kontak Biro Demo untuk informasi paket Umrah.",
    ogImage: DEMO_OG_IMAGE,
    isPublished: true,
    isHomepage: false,
  },
  {
    slug: "faq",
    title: "Pertanyaan umum",
    body: [
      "Apakah harga sudah termasuk visa? Ya, visa Umrah termasuk di semua paket published.",
      "",
      "Bisakah jadwal diubah? Jadwal keberangkatan mengikuti availableDates di masing-masing paket.",
      "",
      "Bagaimana cara booking? Pilih paket di halaman Paket, lalu isi data jamaah.",
    ].join("\n"),
    seoTitle: "FAQ Umrah — Biro Demo",
    seoDescription: "Jawaban singkat seputar paket, visa, dan booking Umrah Biro Demo.",
    ogImage: DEMO_OG_IMAGE,
    isPublished: true,
    isHomepage: false,
  },
];

export function assertDemoPagesSafe(pages: DemoPageSeed[] = DEMO_PAGES): void {
  const slugs = new Set<string>();
  let homepages = 0;
  for (const page of pages) {
    const slug = page.slug.trim().toLowerCase();
    if (!slug) {
      throw new Error("Demo CMS page slug is empty");
    }
    if (isReservedPublicSlug(slug)) {
      throw new Error(`Demo CMS slug "${slug}" collides with a reserved public route`);
    }
    if (slugs.has(slug)) {
      throw new Error(`Duplicate demo CMS slug "${slug}"`);
    }
    slugs.add(slug);
    if (!cmsAbsoluteHttpUrl(page.ogImage)) {
      throw new Error(`Demo CMS slug "${slug}" has invalid ogImage URL`);
    }
    if (page.isHomepage) homepages += 1;
  }
  if (homepages !== 1) {
    throw new Error(`Demo CMS seed must have exactly one homepage, got ${homepages}`);
  }
}

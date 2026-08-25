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

const OG_MAKKAH = DEMO_OG_IMAGE;
const OG_MADINAH =
  "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1600&q=80";
const OG_HOTEL =
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80";
const OG_NABAWI =
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80";

export const DEMO_SETTINGS: Record<string, string> = {
  appName: "Safwah Haramain",
  appDescription:
    "Biro perjalanan Umrah dari Jakarta. Pendampingan mutawwif berbahasa Indonesia, hotel dekat Masjidil Haram dan Masjid Nabawi, serta jadwal keberangkatan yang jelas.",
  contactEmail: "halo@demo.rihla.my.id",
  contactPhone: "+62 21 3891 2200",
  address: "Jl. Kramat Raya No. 45, Senen, Jakarta Pusat 10450",
  currency: "IDR",
  bookingPrefix: "SFH",
};

export const DEMO_PAGES: DemoPageSeed[] = [
  {
    slug: "home",
    title: "Umrah tenang, pendampingan dekat",
    body: [
      "Assalamu'alaikum warahmatullahi wabarakatuh.",
      "",
      "Safwah Haramain mendampingi jamaah dari embarkasi Jakarta ke Makkah dan Madinah. Kami merancang paket agar ibadah tidak terburu-buru: hotel walking distance, mutawwif yang menjelaskan manasik dengan bahasa sehari-hari, dan kuota keberangkatan yang kami umumkan jauh-jauh hari.",
      "",
      "Pilih Umrah Ekonomi 9 hari jika ingin hemat dan tetap nyaman, Plus 12 hari untuk keluarga yang butuh tempo lebih longgar, atau VIP Ramadhan jika ingin ibadah di bulan penuh berkah dengan layanan lebih personal.",
      "",
      "Silakan lihat katalog paket, atau hubungi kantor kami di Senen untuk konsultasi jadwal dan kuota kamar.",
    ].join("\n"),
    seoTitle: "Safwah Haramain — Paket Umrah Jakarta",
    seoDescription:
      "Biro Umrah Jakarta dengan mutawwif Indonesia, hotel dekat Haram, dan keberangkatan terjadwal. Ekonomi, plus, dan VIP Ramadhan.",
    ogImage: OG_MAKKAH,
    isPublished: true,
    isHomepage: true,
  },
  {
    slug: "about",
    title: "Tentang Safwah Haramain",
    body: [
      "Safwah Haramain berdiri sebagai biro perjalanan ibadah yang fokus pada jamaah Indonesia. Kami bukan agen wisata umum: setiap keberangkatan kami siapkan manasik di Jakarta, briefing bandara, dan pendampingan di Tanah Suci sampai kepulangan.",
      "",
      "Tim kami terdiri dari staf embarkasi, mutawwif, dan petugas hotel yang sudah terbiasa menolong jamaah lansia, keluarga dengan anak, dan jamaah yang baru pertama kali Umrah.",
      "",
      "Kantor kami di Jl. Kramat Raya, Senen, Jakarta Pusat. Datang langsung atau telepon untuk menanyakan sisa kuota, perbedaan hotel, dan apa yang termasuk di masing-masing paket.",
    ].join("\n"),
    seoTitle: "Tentang Safwah Haramain",
    seoDescription:
      "Profil biro Umrah Safwah Haramain di Jakarta Pusat: manasik, mutawwif, dan pendampingan jamaah ke Tanah Suci.",
    ogImage: OG_MADINAH,
    isPublished: true,
    isHomepage: false,
  },
  {
    slug: "contact",
    title: "Hubungi kantor kami",
    body: [
      "Kantor: Jl. Kramat Raya No. 45, Senen, Jakarta Pusat 10450",
      "Telepon / WhatsApp: +62 21 3891 2200",
      "Email: halo@demo.rihla.my.id",
      "",
      "Jam layanan: Senin–Jumat 09.00–17.00 WIB, Sabtu 09.00–13.00 WIB. Minggu dan hari libur nasional tutup, kecuali H-2 keberangkatan (tim embarkasi siaga).",
      "",
      "Untuk tanya kuota kamar atau cicilan, sebutkan nama paket dan bulan keberangkatan yang diminati agar staf kami bisa cek sisa seat.",
    ].join("\n"),
    seoTitle: "Kontak Safwah Haramain Jakarta",
    seoDescription:
      "Alamat kantor Senen, telepon, dan jam layanan Safwah Haramain untuk konsultasi paket Umrah.",
    ogImage: OG_HOTEL,
    isPublished: true,
    isHomepage: false,
  },
  {
    slug: "faq",
    title: "Pertanyaan yang sering ditanya",
    body: [
      "Apakah harga sudah termasuk visa dan tiket pesawat? Ya. Semua paket yang kami tawarkan sudah termasuk visa Umrah, tiket PP embarkasi Jakarta, hotel, bus AC, mutawwif, dan manasik. Yang belum termasuk biasanya asuransi, pengeluaran pribadi, dan kamar single.",
      "",
      "Bolehkah mengubah tanggal keberangkatan? Bisa, selama kuota di bulan pengganti masih ada dan pelunasan belum dikunci ke maskapai. Hubungi kantor paling lambat 21 hari sebelum take-off.",
      "",
      "Bagaimana cara daftar? Pilih paket di halaman Paket, isi data jamaah (paspor masih berlaku minimal 8 bulan), lalu unggah foto. Staf kami akan menghubungi untuk DP dan jadwal manasik.",
      "",
      "Apakah ada mutawwif perempuan? Ada, terutama di keberangkatan yang banyak jamaah ibu-ibu. Minta saat konsultasi agar kami pasangkan tim yang sesuai.",
    ].join("\n"),
    seoTitle: "FAQ Umrah — Safwah Haramain",
    seoDescription:
      "Visa, ubah jadwal, cara daftar, dan mutawwif perempuan di paket Umrah Safwah Haramain.",
    ogImage: OG_NABAWI,
    isPublished: true,
    isHomepage: false,
  },
];

const LAB_COPY = /white-?label|cms|lab rihla|availableDates|published\.|Biro Demo/i;

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
    const blob = `${page.title}\n${page.body}\n${page.seoTitle}\n${page.seoDescription}`;
    if (LAB_COPY.test(blob)) {
      throw new Error(`Demo CMS slug "${slug}" still contains lab/internal copy`);
    }
    if (page.isHomepage) homepages += 1;
  }
  if (homepages !== 1) {
    throw new Error(`Demo CMS seed must have exactly one homepage, got ${homepages}`);
  }
}

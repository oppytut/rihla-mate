import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { and, count, eq, ne } from "drizzle-orm";
import { Pool } from "pg";
import { packages, bookings, pages, settings } from "./schema";
import { logger } from "@/lib/utils/logger";
import { assertDemoPagesSafe, DEMO_PAGES, DEMO_SETTINGS } from "./seed-demo-content";

type PackageInsert = typeof packages.$inferInsert;
type BookingInsert = typeof bookings.$inferInsert;

const MEDIA = {
  ekonomi: {
    featured:
      "https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  plus: {
    featured:
      "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  vip: {
    featured:
      "https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
    ],
  },
} as const;

const PACKAGE_DATA: PackageInsert[] = [
  {
    title: "Umrah Ekonomi 9 Hari",
    slug: "umrah-ekonomi-9hari",
    description:
      "Paket Umrah hemat 9 hari untuk jamaah Indonesia. Penerbangan Jakarta–Jeddah, hotel dekat Haram (walking distance), mutawwif berbahasa Indonesia, dan bimbing manasik sebelum keberangkatan.",
    durationDays: 9,
    price: "28900000",
    currency: "IDR",
    itinerary: [
      {
        day: 1,
        title: "Keberangkatan Jakarta",
        description: "Berkumpul di bandara, check-in, penerbangan ke Jeddah",
      },
      {
        day: 2,
        title: "Tiba Jeddah · Transfer Makkah",
        description: "Bandara Jeddah, transfer bus ke hotel Makkah, istirahat",
      },
      {
        day: 3,
        title: "Umrah pertama",
        description: "Thawaf, sa'i, tahallul didampingi mutawwif",
      },
      {
        day: 4,
        title: "Ibadah di Masjidil Haram",
        description: "Shalat berjamaah, ziarah opsional, waktu bebas ibadah",
      },
      {
        day: 5,
        title: "Transfer Madinah",
        description: "Perjalanan darat Makkah–Madinah, check-in hotel",
      },
      {
        day: 6,
        title: "Ziarah Madinah",
        description: "Masjid Nabawi, Raudhah (jadwal), ziarah Baqi & Uhud",
      },
      {
        day: 7,
        title: "Ibadah di Nabawi",
        description: "Shalat berjamaah, waktu bebas di sekitar Haram Madinah",
      },
      {
        day: 8,
        title: "Persiapan pulang",
        description: "Belanja oleh-oleh, packing, briefing kepulangan",
      },
      {
        day: 9,
        title: "Kepulangan",
        description: "Transfer ke bandara, penerbangan kembali ke Jakarta",
      },
    ],
    inclusions: [
      "Tiket pesawat PP Jakarta–Jeddah",
      "Visa Umrah",
      "Hotel Makkah ★3 (dekat Haram)",
      "Hotel Madinah ★3 (dekat Nabawi)",
      "Transport bus AC antar kota",
      "Mutawwif berbahasa Indonesia",
      "Manasik pra-keberangkatan",
      "Air Zamzam 5L",
    ],
    exclusions: [
      "Asuransi perjalanan",
      "Pengeluaran pribadi",
      "Tips mutawwif & crew",
      "Kamar single supplement",
      "City tour opsional",
    ],
    departureCity: "Jakarta",
    availableDates: [
      "2026-07-01",
      "2026-07-15",
      "2026-08-01",
      "2026-08-15",
      "2026-09-01",
      "2026-10-01",
      "2026-11-15",
      "2026-12-10",
    ],
    featuredImage: MEDIA.ekonomi.featured,
    gallery: [...MEDIA.ekonomi.gallery],
    category: "economy",
    status: "published",
  },
  {
    title: "Umrah Plus 12 Hari",
    slug: "umrah-plus-12hari",
    description:
      "Paket Umrah 12 hari dengan hotel lebih dekat, city tour Thaif & Jeddah, dan kuota Raudhah terfasilitasi. Cocok untuk keluarga yang ingin ibadah lebih khusyuk tanpa terburu-buru.",
    durationDays: 12,
    price: "42500000",
    currency: "IDR",
    itinerary: [
      {
        day: 1,
        title: "Keberangkatan Surabaya / Jakarta",
        description: "Berkumpul di embarkasi, penerbangan ke Jeddah",
      },
      {
        day: 2,
        title: "Tiba · Makkah",
        description: "Transfer hotel Makkah, orientasi area Haram",
      },
      {
        day: 3,
        title: "Umrah & manasik lapangan",
        description: "Pelaksanaan Umrah lengkap dengan pendampingan",
      },
      {
        day: 4,
        title: "Ibadah intensif Makkah",
        description: "Shalat berjamaah, waktu ibadah bebas",
      },
      {
        day: 5,
        title: "Ziarah & Thaif",
        description: "City tour Thaif (opsional included), istirahat",
      },
      {
        day: 6,
        title: "Ibadah di Haram",
        description: "Fokus ibadah, mentoring jamaah senior",
      },
      {
        day: 7,
        title: "Transfer Madinah",
        description: "Bus AC ke Madinah, check-in hotel dekat Nabawi",
      },
      {
        day: 8,
        title: "Raudhah & ziarah",
        description: "Fasilitasi Raudhah, ziarah Baqi, Uhud, Quba",
      },
      {
        day: 9,
        title: "Ibadah Nabawi",
        description: "Shalat berjamaah, kajian singkat",
      },
      {
        day: 10,
        title: "Waktu bebas Madinah",
        description: "Ibadah & belanja oleh-oleh",
      },
      {
        day: 11,
        title: "Jeddah · free program",
        description: "Transfer Jeddah, city tour ringan, hotel transit",
      },
      {
        day: 12,
        title: "Kepulangan",
        description: "Check-out, penerbangan pulang ke Indonesia",
      },
    ],
    inclusions: [
      "Tiket pesawat PP (CGK/SUB–JED)",
      "Visa Umrah",
      "Hotel Makkah ★4 (≤500m Haram)",
      "Hotel Madinah ★4 (view/dekat Nabawi)",
      "Transport AC full program",
      "Mutawwif + asisten",
      "City tour Thaif & Jeddah",
      "Fasilitasi Raudhah",
      "Manasik + handling bandara",
      "Air Zamzam 5L",
    ],
    exclusions: [
      "Asuransi perjalanan premium",
      "Pengeluaran pribadi",
      "Tips",
      "Single room",
      "Laundry & minibar",
    ],
    departureCity: "Surabaya",
    availableDates: [
      "2026-07-01",
      "2026-07-20",
      "2026-08-05",
      "2026-08-20",
      "2026-09-05",
      "2026-10-12",
      "2026-11-20",
      "2026-12-18",
    ],
    featuredImage: MEDIA.plus.featured,
    gallery: [...MEDIA.plus.gallery],
    category: "premium",
    status: "published",
  },
  {
    title: "Umrah VIP Ramadhan",
    slug: "umrah-vip-ramadhan",
    description:
      "Paket VIP 14 hari di musim Ramadhan: hotel bintang 5 walking distance, private handling, kuota ibadah premium, dan layanan concierge jamaah. Kuota terbatas per kloter.",
    durationDays: 14,
    price: "68900000",
    currency: "IDR",
    itinerary: [
      {
        day: 1,
        title: "VIP departure",
        description: "Fast-track bandara, lounge, penerbangan premium",
      },
      {
        day: 2,
        title: "Makkah check-in",
        description: "Private transfer, hotel ★5 walking distance Haram",
      },
      {
        day: 3,
        title: "Umrah VIP",
        description: "Pendampingan personal, prioritas manasik lapangan",
      },
      {
        day: 4,
        title: "I'tikaf ringan",
        description: "Program ibadah malam Ramadhan di Haram",
      },
      {
        day: 5,
        title: "Tarawih & kajian",
        description: "Tarawih berjamaah, kajian singkat ba'da maghrib",
      },
      {
        day: 6,
        title: "Ibadah full day",
        description: "Waktu bebas ibadah, concierge on-call",
      },
      {
        day: 7,
        title: "Ziarah eksklusif",
        description: "Ziarah private dengan mutawwif senior",
      },
      {
        day: 8,
        title: "Transfer Madinah VIP",
        description: "Private van ke hotel ★5 Madinah",
      },
      {
        day: 9,
        title: "Raudhah prioritas",
        description: "Fasilitasi slot Raudhah, ziarah Nabawi",
      },
      {
        day: 10,
        title: "Ibadah Madinah",
        description: "Shalat berjamaah, waktu bebas",
      },
      {
        day: 11,
        title: "Program keluarga",
        description: "Aktivitas ringan untuk lansia & keluarga",
      },
      {
        day: 12,
        title: "Ibadah penutup",
        description: "Persiapan kepulangan spiritual",
      },
      {
        day: 13,
        title: "Jeddah transit VIP",
        description: "Hotel transit, free program, lounge access",
      },
      {
        day: 14,
        title: "Kepulangan",
        description: "Fast-track kepulangan ke Indonesia",
      },
    ],
    inclusions: [
      "Tiket pesawat premium PP",
      "Visa Umrah + handling VIP",
      "Hotel Makkah ★5 walking distance",
      "Hotel Madinah ★5 dekat Nabawi",
      "Private transfer full program",
      "Mutawwif senior 1:9",
      "Concierge 24 jam",
      "Fasilitasi Raudhah prioritas",
      "Sahur & buka puasa hotel",
      "Asuransi perjalanan",
      "Air Zamzam 10L",
    ],
    exclusions: [
      "Pengeluaran pribadi & belanja",
      "Tips di luar paket",
      "Upgrade suite",
      "Perpanjangan masa tinggal",
    ],
    departureCity: "Jakarta",
    availableDates: [
      "2026-02-15",
      "2026-02-22",
      "2026-03-01",
      "2026-03-08",
      "2027-02-10",
      "2027-02-20",
    ],
    featuredImage: MEDIA.vip.featured,
    gallery: [...MEDIA.vip.gallery],
    category: "vip",
    status: "published",
  },
];

const LEGACY_PACKAGE_SLUGS = [
  "bali-sacred-temples",
  "komodo-island-expedition",
  "yogyakarta-heritage-tour",
] as const;

type BookingSample = Omit<BookingInsert, "packageId">;

const BOOKING_DATA_BY_SLUG: Record<string, BookingSample[]> = {
  "umrah-ekonomi-9hari": [
    {
      departureDate: "2026-08-15",
      customerName: "Ayu Lestari",
      customerEmail: "ayu@example.com",
      customerPhone: "+62812345678",
      travelers: 2,
      totalPrice: "57800000",
      status: "confirmed",
      paymentRef: "PAY-20250601-001",
      notes: "Suami-istri. Minta kamar twin dekat lift.",
    },
    {
      departureDate: "2026-09-01",
      customerName: "Budi Santoso",
      customerEmail: "budi.s@example.com",
      customerPhone: "+62898765432",
      travelers: 1,
      totalPrice: "28900000",
      status: "pending",
      paymentRef: null,
      notes: null,
    },
  ],
  "umrah-plus-12hari": [
    {
      departureDate: "2026-08-05",
      customerName: "Clara Wijaya",
      customerEmail: "clara.w@example.com",
      customerPhone: "+62811122233",
      travelers: 4,
      totalPrice: "170000000",
      status: "confirmed",
      paymentRef: "PAY-20250605-002",
      notes: "Keluarga 2 dewasa + 2 remaja. Menu vegetarian diminta.",
    },
    {
      departureDate: "2026-08-20",
      customerName: "Dian Permata",
      customerEmail: null,
      customerPhone: "+62855566677",
      travelers: 3,
      totalPrice: "127500000",
      status: "completed",
      paymentRef: "PAY-20250520-003",
      notes: "Grup pengajian RT. Butuh kursi roda di bandara.",
    },
  ],
  "umrah-vip-ramadhan": [
    {
      departureDate: "2026-02-22",
      customerName: "Eko Prasetyo",
      customerEmail: "eko.p@example.com",
      customerPhone: null,
      travelers: 2,
      totalPrice: "137800000",
      status: "cancelled",
      paymentRef: "PAY-20250610-004",
      notes: "Dibatalkan karena reschedule penerbangan.",
    },
  ],
};

function resolveConnectionUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim();
  return unpooled || databaseUrl;
}

function shouldUseNeon(connectionUrl: string): boolean {
  if (process.env.SEED_USE_NEON === "1") return true;
  if (process.env.SEED_DRIVER === "pg") return false;
  if (process.env.DATABASE_URL_UNPOOLED?.trim()) return true;
  return connectionUrl.includes("neon.tech") || connectionUrl.includes("neon");
}

async function runSeed(
  db: ReturnType<typeof drizzlePg> | ReturnType<typeof drizzleNeon>,
): Promise<void> {
  logger.info("Cleaning legacy leisure demo packages...", { component: "seed" });
  for (const slug of LEGACY_PACKAGE_SLUGS) {
    const [row] = await db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.slug, slug))
      .limit(1);
    if (!row) continue;
    await db.delete(bookings).where(eq(bookings.packageId, row.id));
    await db.delete(packages).where(eq(packages.id, row.id));
    logger.info(`  removed legacy package ${slug}`, { component: "seed" });
  }

  logger.info("Upserting Umrah demo packages...", { component: "seed" });

  const upserted: Array<{ id: string; slug: string; title: string }> = [];
  for (const pkg of PACKAGE_DATA) {
    const [row] = await db
      .insert(packages)
      .values(pkg)
      .onConflictDoUpdate({
        target: packages.slug,
        set: {
          title: pkg.title,
          description: pkg.description,
          durationDays: pkg.durationDays,
          price: pkg.price,
          currency: pkg.currency,
          itinerary: pkg.itinerary,
          inclusions: pkg.inclusions,
          exclusions: pkg.exclusions,
          departureCity: pkg.departureCity,
          availableDates: pkg.availableDates,
          featuredImage: pkg.featuredImage,
          gallery: pkg.gallery,
          category: pkg.category,
          status: pkg.status,
          updatedAt: new Date(),
        },
      })
      .returning();
    upserted.push({ id: row.id, slug: row.slug, title: row.title });
  }

  logger.info(`Seeded ${upserted.length} packages.`, { component: "seed" });
  for (const row of upserted) {
    logger.info(`  ${row.title} (${row.slug})`, { component: "seed" });
  }

  assertDemoPagesSafe();
  logger.info("Upserting demo CMS pages...", { component: "seed" });
  const now = new Date();
  for (const page of DEMO_PAGES) {
    const content = { body: page.body };
    const seo = { title: page.seoTitle, description: page.seoDescription };
    await db
      .insert(pages)
      .values({
        templateId: "default",
        slug: page.slug,
        title: page.title,
        content,
        seo,
        isPublished: page.isPublished,
        isHomepage: page.isHomepage,
        publishedAt: page.isPublished ? now : null,
      })
      .onConflictDoUpdate({
        target: pages.slug,
        set: {
          templateId: "default",
          title: page.title,
          content,
          seo,
          isPublished: page.isPublished,
          isHomepage: page.isHomepage,
          publishedAt: page.isPublished ? now : null,
          updatedAt: now,
        },
      });
    logger.info(`  page ${page.slug}`, { component: "seed" });
  }

  const homepageSlug = DEMO_PAGES.find((p) => p.isHomepage)?.slug;
  if (homepageSlug) {
    await db
      .update(pages)
      .set({ isHomepage: false, updatedAt: now })
      .where(and(eq(pages.isHomepage, true), ne(pages.slug, homepageSlug)));
  }

  logger.info("Upserting demo settings (no secrets)...", { component: "seed" });
  for (const [key, value] of Object.entries(DEMO_SETTINGS)) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value, updatedAt: now },
      });
    logger.info(`  setting ${key}`, { component: "seed" });
  }

  const includeBookings = process.env.SEED_INCLUDE_BOOKINGS === "1";
  if (!includeBookings) {
    logger.info("Skipping bookings (set SEED_INCLUDE_BOOKINGS=1 to include).", {
      component: "seed",
    });
    logger.info("Seed complete.", { component: "seed" });
    return;
  }

  const [{ cnt }] = await db.select({ cnt: count() }).from(bookings);
  if (Number(cnt) > 0) {
    logger.info(`Bookings table already has ${cnt} rows — skipping sample bookings.`, {
      component: "seed",
    });
    logger.info("Seed complete.", { component: "seed" });
    return;
  }

  const pkgMap = new Map<string, string>();
  for (const slug of Object.keys(BOOKING_DATA_BY_SLUG)) {
    const [row] = await db
      .select({ id: packages.id })
      .from(packages)
      .where(eq(packages.slug, slug));
    if (row) {
      pkgMap.set(slug, row.id);
    }
  }

  let totalBookings = 0;
  for (const [slug, bookingList] of Object.entries(BOOKING_DATA_BY_SLUG)) {
    const packageId = pkgMap.get(slug);
    if (!packageId) {
      logger.warn(`Package "${slug}" not found — skipping its bookings.`, { component: "seed" });
      continue;
    }
    const rows: BookingInsert[] = bookingList.map((b) => ({ ...b, packageId }));
    const inserted = await db.insert(bookings).values(rows).returning();
    for (const b of inserted) {
      logger.info(`  ${b.customerName}: ${b.status}`, { component: "seed" });
    }
    totalBookings += inserted.length;
  }
  logger.info(`Inserted ${totalBookings} bookings.`, { component: "seed" });
  logger.info("Seed complete.", { component: "seed" });
}

async function main(): Promise<void> {
  const connectionUrl = resolveConnectionUrl();
  const useNeon = shouldUseNeon(connectionUrl);

  logger.info(`Seeding database (driver: ${useNeon ? "neon-http" : "node-postgres"})...`, {
    component: "seed",
  });

  if (useNeon) {
    const client = neon(connectionUrl);
    const db = drizzleNeon(client, { schema: { packages, bookings, pages, settings } });
    await runSeed(db);
  } else {
    const pool = new Pool({ connectionString: connectionUrl });
    const db = drizzlePg(pool, { schema: { packages, bookings, pages, settings } });
    try {
      await runSeed(db);
    } finally {
      await pool.end();
    }
  }
}

const isMainModule = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMainModule) {
  main().catch((err) => {
    logger.error("Seed failed", { component: "seed" }, err);
    process.exit(1);
  });
}

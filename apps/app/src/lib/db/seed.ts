import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { count, eq } from "drizzle-orm";
import { Pool } from "pg";
import { packages, bookings } from "./schema";
import { logger } from "@/lib/utils/logger";

type PackageInsert = typeof packages.$inferInsert;
type BookingInsert = typeof bookings.$inferInsert;

const PACKAGE_DATA: PackageInsert[] = [
  {
    title: "Bali Sacred Temples",
    slug: "bali-sacred-temples",
    description:
      "Journey through Bali's most revered temples — Uluwatu perched on cliffs, Tanah Lot surrounded by sea at sunset.",
    durationDays: 3,
    price: "2750000",
    currency: "IDR",
    itinerary: [
      {
        day: 1,
        title: "Arrival & Uluwatu",
        description: "Airport pickup, Uluwatu Temple at sunset, Kecak fire dance",
      },
      {
        day: 2,
        title: "Tanah Lot & Tirta Empul",
        description: "Morning at Tanah Lot, afternoon purification at Tirta Empul",
      },
      {
        day: 3,
        title: "Besakih & Departure",
        description: "Besakih Mother Temple, transfer to airport",
      },
    ],
    inclusions: [
      "Private car with driver",
      "English-speaking guide",
      "Temple entrance fees",
      "2 nights hotel (4★)",
    ],
    exclusions: ["International flights", "Travel insurance", "Personal expenses", "Tips"],
    departureCity: "Denpasar",
    availableDates: [
      "2025-07-01",
      "2025-07-15",
      "2025-08-01",
      "2025-08-15",
      "2025-09-01",
      "2026-07-01",
      "2026-07-15",
      "2026-08-01",
      "2026-08-15",
      "2026-09-01",
    ],
    featuredImage: null,
    gallery: [],
    category: "culture",
    status: "published",
  },
  {
    title: "Komodo Island Expedition",
    slug: "komodo-island-expedition",
    description:
      "Sail through the Komodo archipelago on a liveaboard. Trek alongside the legendary Komodo dragons.",
    durationDays: 5,
    price: "6800000",
    currency: "IDR",
    itinerary: [
      {
        day: 1,
        title: "Labuan Bajo & Embarkation",
        description: "Airport pickup, board liveaboard",
      },
      { day: 2, title: "Rinca Island Trek", description: "Komodo dragon trekking, snorkeling" },
      { day: 3, title: "Komodo Island & Pink Beach", description: "Dragon trekking, Pink Beach" },
      {
        day: 4,
        title: "Padar Island & Manta Point",
        description: "Sunrise hike, manta ray snorkeling",
      },
      { day: 5, title: "Disembarkation", description: "Transfer to Labuan Bajo airport" },
    ],
    inclusions: [
      "Liveaboard accommodation",
      "All meals",
      "Snorkeling gear",
      "Park entrance fees",
      "Guide",
    ],
    exclusions: ["Flights to Labuan Bajo", "Alcoholic beverages", "Travel insurance", "Tips"],
    departureCity: "Labuan Bajo",
    availableDates: [
      "2025-07-01",
      "2025-07-20",
      "2025-08-05",
      "2025-08-20",
      "2025-09-05",
      "2026-07-01",
      "2026-07-20",
      "2026-08-05",
      "2026-08-20",
      "2026-09-05",
    ],
    featuredImage: null,
    gallery: [],
    category: "adventure",
    status: "published",
  },
  {
    title: "Yogyakarta Heritage Tour",
    slug: "yogyakarta-heritage-tour",
    description:
      "Discover the cultural heart of Java. Explore Borobudur at sunrise and Prambanan's towering spires.",
    durationDays: 4,
    price: "3200000",
    currency: "IDR",
    itinerary: [
      { day: 1, title: "Arrival & Malioboro", description: "Airport pickup, Malioboro Street" },
      { day: 2, title: "Borobudur Sunrise", description: "Dawn at Borobudur, batik workshop" },
      { day: 3, title: "Prambanan & Kraton", description: "Prambanan temple, Sultan's Palace" },
      {
        day: 4,
        title: "Kotagede & Departure",
        description: "Silver craft village, transfer to airport",
      },
    ],
    inclusions: [
      "Private car with driver",
      "English-speaking guide",
      "Temple entrance fees",
      "Batik workshop",
      "3 nights hotel (3★)",
    ],
    exclusions: ["Flights to Yogyakarta", "Travel insurance", "Personal expenses", "Tips"],
    departureCity: "Yogyakarta",
    availableDates: [
      "2025-07-01",
      "2025-07-10",
      "2025-07-25",
      "2025-08-10",
      "2025-08-25",
      "2026-07-01",
      "2026-07-10",
      "2026-07-25",
      "2026-08-10",
      "2026-08-25",
    ],
    featuredImage: null,
    gallery: [],
    category: "culture",
    status: "published",
  },
];

type BookingSample = Omit<BookingInsert, "packageId">;

const BOOKING_DATA_BY_SLUG: Record<string, BookingSample[]> = {
  "bali-sacred-temples": [
    {
      departureDate: "2025-07-15",
      customerName: "Ayu Lestari",
      customerEmail: "ayu@example.com",
      customerPhone: "+62812345678",
      travelers: 2,
      totalPrice: "5500000",
      status: "confirmed",
      paymentRef: "PAY-20250601-001",
      notes: "Honeymoon package. Request flower decoration.",
    },
    {
      departureDate: "2025-08-01",
      customerName: "Budi Santoso",
      customerEmail: "budi.s@example.com",
      customerPhone: "+62898765432",
      travelers: 1,
      totalPrice: "2750000",
      status: "pending",
      paymentRef: null,
      notes: null,
    },
  ],
  "komodo-island-expedition": [
    {
      departureDate: "2025-07-20",
      customerName: "Clara Wijaya",
      customerEmail: "clara.w@example.com",
      customerPhone: "+62811122233",
      travelers: 4,
      totalPrice: "27200000",
      status: "confirmed",
      paymentRef: "PAY-20250605-002",
      notes: "Family trip with 2 teenagers. Vegetarian meals requested.",
    },
    {
      departureDate: "2025-08-05",
      customerName: "Dian Permata",
      customerEmail: null,
      customerPhone: "+62855566677",
      travelers: 3,
      totalPrice: "20400000",
      status: "completed",
      paymentRef: "PAY-20250520-003",
      notes: "Group of diving enthusiasts.",
    },
  ],
  "yogyakarta-heritage-tour": [
    {
      departureDate: "2025-07-10",
      customerName: "Eko Prasetyo",
      customerEmail: "eko.p@example.com",
      customerPhone: null,
      travelers: 2,
      totalPrice: "6400000",
      status: "cancelled",
      paymentRef: "PAY-20250610-004",
      notes: "Cancelled due to flight reschedule.",
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
  logger.info("Upserting demo packages...", { component: "seed" });

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
    const db = drizzleNeon(client, { schema: { packages, bookings } });
    await runSeed(db);
  } else {
    const pool = new Pool({ connectionString: connectionUrl });
    const db = drizzlePg(pool, { schema: { packages, bookings } });
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

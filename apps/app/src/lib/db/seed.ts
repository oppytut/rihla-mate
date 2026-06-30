import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { packages, bookings } from "./schema";
import { logger } from "@/lib/utils/logger";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema: { packages, bookings } });

async function main() {
  logger.info("Seeding database...", { component: "seed" });

  // Clear existing data (order matters for FK constraints)
  logger.info("Truncating bookings...", { component: "seed" });
  await db.delete(bookings);
  logger.info("Truncating packages...", { component: "seed" });
  await db.delete(packages);

  const packageData = [
    {
      title: "Bali Sacred Temples",
      slug: "bali-sacred-temples",
      description:
        "Journey through Bali's most revered temples — Uluwatu perched on cliffs, Tanah Lot surrounded by sea at sunset.",
      durationDays: 3,
      price: "2750000",
      currency: "IDR",
      itinerary: JSON.stringify([
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
      ]),
      inclusions: JSON.stringify([
        "Private car with driver",
        "English-speaking guide",
        "Temple entrance fees",
        "2 nights hotel (4★)",
      ]),
      exclusions: JSON.stringify([
        "International flights",
        "Travel insurance",
        "Personal expenses",
        "Tips",
      ]),
      departureCity: "Denpasar",
      availableDates: JSON.stringify([
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
      ]),
      featuredImage: null,
      gallery: JSON.stringify([]),
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
      itinerary: JSON.stringify([
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
      ]),
      inclusions: JSON.stringify([
        "Liveaboard accommodation",
        "All meals",
        "Snorkeling gear",
        "Park entrance fees",
        "Guide",
      ]),
      exclusions: JSON.stringify([
        "Flights to Labuan Bajo",
        "Alcoholic beverages",
        "Travel insurance",
        "Tips",
      ]),
      departureCity: "Labuan Bajo",
      availableDates: JSON.stringify([
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
      ]),
      featuredImage: null,
      gallery: JSON.stringify([]),
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
      itinerary: JSON.stringify([
        { day: 1, title: "Arrival & Malioboro", description: "Airport pickup, Malioboro Street" },
        { day: 2, title: "Borobudur Sunrise", description: "Dawn at Borobudur, batik workshop" },
        { day: 3, title: "Prambanan & Kraton", description: "Prambanan temple, Sultan's Palace" },
        {
          day: 4,
          title: "Kotagede & Departure",
          description: "Silver craft village, transfer to airport",
        },
      ]),
      inclusions: JSON.stringify([
        "Private car with driver",
        "English-speaking guide",
        "Temple entrance fees",
        "Batik workshop",
        "3 nights hotel (3★)",
      ]),
      exclusions: JSON.stringify([
        "Flights to Yogyakarta",
        "Travel insurance",
        "Personal expenses",
        "Tips",
      ]),
      departureCity: "Yogyakarta",
      availableDates: JSON.stringify([
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
      ]),
      featuredImage: null,
      gallery: JSON.stringify([]),
      category: "culture",
      status: "published",
    },
  ];

  logger.info("Inserting packages...", { component: "seed" });
  const insertedPackages = await db
    .insert(packages)
    .values(packageData)
    .returning({ id: packages.id, title: packages.title });
  logger.info(`Inserted ${insertedPackages.length} packages.`, { component: "seed" });

  const [pkgBali, pkgKomodo, pkgJogja] = insertedPackages;

  const bookingData = [
    {
      packageId: pkgBali.id,
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
      packageId: pkgBali.id,
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
    {
      packageId: pkgKomodo.id,
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
      packageId: pkgKomodo.id,
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
    {
      packageId: pkgJogja.id,
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
  ];

  logger.info("Inserting bookings...", { component: "seed" });
  const insertedBookings = await db
    .insert(bookings)
    .values(bookingData)
    .returning({ id: bookings.id, customerName: bookings.customerName, status: bookings.status });
  logger.info(`Inserted ${insertedBookings.length} bookings.`, { component: "seed" });
  for (const b of insertedBookings) {
    logger.info(`  ${b.customerName}: ${b.status}`, { component: "seed" });
  }

  logger.info("Seed complete.", { component: "seed" });
  await pool.end();
}

const isMainModule = process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js");
if (isMainModule) {
  main().catch((err) => {
    logger.error("Seed failed", { component: "seed" }, err);
    process.exit(1);
  });
}

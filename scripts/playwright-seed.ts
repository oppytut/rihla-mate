import { Pool } from "pg";
import { randomUUID } from "crypto";
import { hashPassword } from "@better-auth/utils/password";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://rihlamate:rihlamate_dev@localhost:5432/rihlamate_dev";

const pool = new Pool({ connectionString: DATABASE_URL });

export async function main() {
  const userId = randomUUID();
  const email = "playwright@rihlamate.test";
  const password = "testpass123";
  const now = new Date();
  const sessionToken = randomUUID();
  const sessionExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Generate a proper scrypt hash matching Better Auth's algorithm
  // @better-auth/utils/password uses: scrypt with N=16384, r=16, p=1, dkLen=64
  // Format: <16-byte-hex-salt>:<64-byte-hex-key> (32 hex chars : 128 hex chars)
  const passwordHash = await hashPassword(password);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clean up all previous test data to prevent duplicate booking conflicts
    await client.query(
      "DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [email],
    );
    await client.query(
      "DELETE FROM accounts WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [email],
    );
    await client.query("DELETE FROM verifications WHERE identifier = $1", [email]);
    await client.query("DELETE FROM bookings");
    await client.query("DELETE FROM users WHERE email = $1", [email]);

    // Insert user (matching Better Auth users table)
    await client.query(
      `INSERT INTO users (id, email, name, email_verified, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, email, "Playwright Admin", true, "admin", now, now],
    );

    // Insert account with scrypt password hash for "testpass123"
    // Uses @better-auth/utils/password hashPassword() which produces:
    //   scrypt(N=16384, r=16, p=1, dkLen=64) with NFKC normalization
    //   format: <salt-hex>:<key-hex> = 32 hex chars : 128 hex chars

    await client.query(
      `INSERT INTO accounts (id, user_id, provider_id, account_id, password, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [randomUUID(), userId, "credential", email, passwordHash, now, now],
    );

    await client.query(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [randomUUID(), userId, sessionToken, sessionExpires, now, now],
    );

    await client.query("COMMIT");

    // Seed 3 packages with static UUIDs so booking tests always have
    // package options in the dropdown. The e2e/smoke CI steps run
    // src/lib/db/seed.ts before Playwright, but the globalSetup also
    // runs this script which only cleaned up user/bookings — adding
    // packages here guarantees they exist regardless of ordering.
    const pkgBaliId = "00000000-0000-0000-0000-000000000001";
    const pkgKomodoId = "00000000-0000-0000-0000-000000000002";
    const pkgJogjaId = "00000000-0000-0000-0000-000000000003";

    await client.query("BEGIN");
    await client.query("DELETE FROM bookings WHERE package_id = $1", [pkgBaliId]);
    await client.query("DELETE FROM bookings WHERE package_id = $1", [pkgKomodoId]);
    await client.query("DELETE FROM bookings WHERE package_id = $1", [pkgJogjaId]);
    await client.query("DELETE FROM packages WHERE id = $1", [pkgBaliId]);
    await client.query("DELETE FROM packages WHERE id = $1", [pkgKomodoId]);
    await client.query("DELETE FROM packages WHERE id = $1", [pkgJogjaId]);

    const packageInserts = [
      {
        id: pkgBaliId,
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
          "2026-07-01",
          "2026-07-15",
          "2026-08-01",
          "2026-08-15",
          "2026-09-01",
        ]),
        category: "culture",
        status: "published",
      },
      {
        id: pkgKomodoId,
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
          {
            day: 3,
            title: "Komodo Island & Pink Beach",
            description: "Dragon trekking, Pink Beach",
          },
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
          "2026-07-01",
          "2026-07-20",
          "2026-08-05",
          "2026-08-20",
          "2026-09-05",
        ]),
        category: "adventure",
        status: "published",
      },
      {
        id: pkgJogjaId,
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
          "2026-07-01",
          "2026-07-10",
          "2026-07-25",
          "2026-08-10",
          "2026-08-25",
        ]),
        category: "culture",
        status: "published",
      },
    ];

    for (const pkg of packageInserts) {
      await client.query(
        `INSERT INTO packages (id, title, slug, description, duration_days, price, currency,
          itinerary, inclusions, exclusions, departure_city, available_dates, category, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          pkg.id,
          pkg.title,
          pkg.slug,
          pkg.description,
          pkg.durationDays,
          pkg.price,
          pkg.currency,
          pkg.itinerary,
          pkg.inclusions,
          pkg.exclusions,
          pkg.departureCity,
          pkg.availableDates,
          pkg.category,
          pkg.status,
          now,
          now,
        ],
      );
    }
    await client.query("COMMIT");

    // Seed a license key so proxy.ts checkLicense() passes in CI.
    // Without this, getActiveLicenseCount() returns 0 and all dashboard
    // routes redirect to /activate — causing performance tests to timeout.
    await client.query("BEGIN");
    await client.query("DELETE FROM license_keys WHERE key = $1", ["CI-TEST-LICENSE-KEY"]);
    await client.query(
      `INSERT INTO license_keys (key, type, seats, issued_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      ["CI-TEST-LICENSE-KEY", "pro", 10, now, new Date("2030-12-31T00:00:00Z")],
    );
    await client.query("COMMIT");

    // Write token to a JSON file consumed by globalSetup for storageState.
    const { writeFileSync } = await import("fs");
    writeFileSync(
      ".playwright-auth.json",
      JSON.stringify({
        sessionToken,
        email,
        password,
        packages: {
          bali: pkgBaliId,
          komodo: pkgKomodoId,
          jogja: pkgJogjaId,
        },
      }),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Only run when executed directly (not imported)
const isMain = require.main === module || process.argv[1]?.endsWith("playwright-seed.ts");
if (isMain) {
  main().catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}

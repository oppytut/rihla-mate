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

    // Static UUIDs so booking tests always have package options in the dropdown.
    // Keep 0001..0003 stable across leisure→Umrah renames so existing fixtures stay valid.
    const pkgEkonomiId = "00000000-0000-0000-0000-000000000001";
    const pkgPlusId = "00000000-0000-0000-0000-000000000002";
    const pkgVipId = "00000000-0000-0000-0000-000000000003";

    const MEDIA = {
      ekonomi: {
        featured:
          "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1546412414-e1885259563a?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        ],
      },
      plus: {
        featured:
          "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
        ],
      },
      vip: {
        featured:
          "https://images.unsplash.com/photo-1646424857576-2a66db82a65c?auto=format&fit=crop&w=1600&q=80",
        gallery: [
          "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
          "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1200&q=80",
        ],
      },
    } as const;

    const umrahSlugs = ["umrah-ekonomi-9hari", "umrah-plus-12hari", "umrah-vip-ramadhan"] as const;
    const legacySlugs = [
      "bali-sacred-temples",
      "komodo-island-expedition",
      "yogyakarta-heritage-tour",
    ] as const;

    await client.query("BEGIN");
    for (const slug of [...legacySlugs, ...umrahSlugs]) {
      await client.query(
        "DELETE FROM bookings WHERE package_id IN (SELECT id FROM packages WHERE slug = $1)",
        [slug],
      );
      await client.query("DELETE FROM packages WHERE slug = $1", [slug]);
    }
    for (const id of [pkgEkonomiId, pkgPlusId, pkgVipId]) {
      await client.query("DELETE FROM bookings WHERE package_id = $1", [id]);
      await client.query("DELETE FROM packages WHERE id = $1", [id]);
    }

    const packageInserts = [
      {
        id: pkgEkonomiId,
        title: "Umrah Ekonomi 9 Hari",
        slug: "umrah-ekonomi-9hari",
        description:
          "Paket Umrah hemat 9 hari untuk jamaah Indonesia. Penerbangan Jakarta–Jeddah, hotel dekat Haram, mutawwif berbahasa Indonesia.",
        durationDays: 9,
        price: "28900000",
        currency: "IDR",
        itinerary: JSON.stringify([
          {
            day: 1,
            title: "Keberangkatan Jakarta",
            description: "Berkumpul di bandara, penerbangan ke Jeddah",
          },
          {
            day: 2,
            title: "Tiba Jeddah · Transfer Makkah",
            description: "Transfer bus ke hotel Makkah",
          },
          {
            day: 3,
            title: "Umrah pertama",
            description: "Thawaf, sa'i, tahallul didampingi mutawwif",
          },
          {
            day: 4,
            title: "Ibadah di Masjidil Haram",
            description: "Shalat berjamaah, waktu bebas ibadah",
          },
          { day: 5, title: "Transfer Madinah", description: "Perjalanan darat Makkah–Madinah" },
          { day: 6, title: "Ziarah Madinah", description: "Masjid Nabawi, Raudhah, Baqi & Uhud" },
          { day: 7, title: "Ibadah di Nabawi", description: "Shalat berjamaah, waktu bebas" },
          { day: 8, title: "Persiapan pulang", description: "Belanja oleh-oleh, packing" },
          { day: 9, title: "Kepulangan", description: "Transfer bandara, penerbangan ke Jakarta" },
        ]),
        inclusions: JSON.stringify([
          "Tiket pesawat PP Jakarta–Jeddah",
          "Visa Umrah",
          "Hotel Makkah ★3 (dekat Haram)",
          "Hotel Madinah ★3 (dekat Nabawi)",
          "Transport bus AC",
          "Mutawwif berbahasa Indonesia",
        ]),
        exclusions: JSON.stringify([
          "Asuransi perjalanan",
          "Pengeluaran pribadi",
          "Tips mutawwif & crew",
          "Kamar single supplement",
        ]),
        departureCity: "Jakarta",
        availableDates: JSON.stringify([
          "2026-07-01",
          "2026-07-15",
          "2026-08-01",
          "2026-08-15",
          "2026-09-01",
          "2026-10-01",
          "2027-07-01",
          "2027-07-15",
          "2027-08-01",
          "2027-08-15",
          "2027-09-01",
          "2027-10-01",
        ]),
        featuredImage: MEDIA.ekonomi.featured,
        gallery: JSON.stringify([...MEDIA.ekonomi.gallery]),
        category: "economy",
        status: "published",
      },
      {
        id: pkgPlusId,
        title: "Umrah Plus 12 Hari",
        slug: "umrah-plus-12hari",
        description:
          "Paket Umrah 12 hari dengan hotel lebih dekat, city tour Thaif & Jeddah, dan kuota Raudhah terfasilitasi.",
        durationDays: 12,
        price: "42500000",
        currency: "IDR",
        itinerary: JSON.stringify([
          {
            day: 1,
            title: "Keberangkatan",
            description: "Berkumpul di embarkasi, penerbangan ke Jeddah",
          },
          { day: 2, title: "Tiba · Makkah", description: "Transfer hotel Makkah, orientasi Haram" },
          { day: 3, title: "Umrah & manasik lapangan", description: "Pelaksanaan Umrah lengkap" },
          {
            day: 4,
            title: "Ibadah intensif Makkah",
            description: "Shalat berjamaah, waktu ibadah bebas",
          },
          { day: 5, title: "Ziarah & Thaif", description: "City tour Thaif" },
          { day: 6, title: "Ibadah di Haram", description: "Fokus ibadah" },
          { day: 7, title: "Transfer Madinah", description: "Bus AC ke Madinah" },
          {
            day: 8,
            title: "Raudhah & ziarah",
            description: "Fasilitasi Raudhah, Baqi, Uhud, Quba",
          },
          { day: 9, title: "Ibadah Nabawi", description: "Shalat berjamaah, kajian singkat" },
          { day: 10, title: "Waktu bebas Madinah", description: "Ibadah & belanja" },
          {
            day: 11,
            title: "Jeddah · free program",
            description: "City tour ringan, hotel transit",
          },
          { day: 12, title: "Kepulangan", description: "Penerbangan pulang ke Indonesia" },
        ]),
        inclusions: JSON.stringify([
          "Tiket pesawat PP (CGK/SUB–JED)",
          "Visa Umrah",
          "Hotel Makkah ★4 (≤500m Haram)",
          "Hotel Madinah ★4",
          "Transport AC full program",
          "Mutawwif + asisten",
          "City tour Thaif & Jeddah",
          "Fasilitasi Raudhah",
        ]),
        exclusions: JSON.stringify([
          "Asuransi perjalanan premium",
          "Pengeluaran pribadi",
          "Tips",
          "Single room",
        ]),
        departureCity: "Surabaya",
        availableDates: JSON.stringify([
          "2026-07-01",
          "2026-07-20",
          "2026-08-05",
          "2026-08-20",
          "2026-09-05",
          "2026-10-12",
          "2027-07-01",
          "2027-07-20",
          "2027-08-05",
          "2027-08-20",
          "2027-09-05",
          "2027-10-12",
        ]),
        featuredImage: MEDIA.plus.featured,
        gallery: JSON.stringify([...MEDIA.plus.gallery]),
        category: "premium",
        status: "published",
      },
      {
        id: pkgVipId,
        title: "Umrah VIP Ramadhan",
        slug: "umrah-vip-ramadhan",
        description:
          "Paket VIP 14 hari di musim Ramadhan: hotel bintang 5 walking distance, private handling, dan concierge jamaah.",
        durationDays: 14,
        price: "68900000",
        currency: "IDR",
        itinerary: JSON.stringify([
          { day: 1, title: "VIP departure", description: "Fast-track bandara, lounge" },
          { day: 2, title: "Makkah check-in", description: "Private transfer, hotel ★5" },
          { day: 3, title: "Umrah VIP", description: "Pendampingan personal" },
          { day: 4, title: "I'tikaf ringan", description: "Program ibadah malam Ramadhan" },
          { day: 5, title: "Tarawih & kajian", description: "Tarawih berjamaah" },
          { day: 6, title: "Ibadah full day", description: "Waktu bebas, concierge on-call" },
          { day: 7, title: "Ziarah eksklusif", description: "Ziarah private" },
          { day: 8, title: "Transfer Madinah VIP", description: "Private van ke hotel ★5" },
          { day: 9, title: "Raudhah prioritas", description: "Fasilitasi slot Raudhah" },
          { day: 10, title: "Ibadah Madinah", description: "Shalat berjamaah" },
          { day: 11, title: "Program keluarga", description: "Aktivitas ringan lansia & keluarga" },
          { day: 12, title: "Ibadah penutup", description: "Persiapan kepulangan spiritual" },
          { day: 13, title: "Jeddah transit VIP", description: "Hotel transit, lounge access" },
          { day: 14, title: "Kepulangan", description: "Fast-track kepulangan" },
        ]),
        inclusions: JSON.stringify([
          "Tiket pesawat premium PP",
          "Visa Umrah + handling VIP",
          "Hotel Makkah ★5 walking distance",
          "Hotel Madinah ★5",
          "Private transfer full program",
          "Mutawwif senior 1:9",
          "Concierge 24 jam",
          "Fasilitasi Raudhah prioritas",
          "Asuransi perjalanan",
        ]),
        exclusions: JSON.stringify([
          "Pengeluaran pribadi & belanja",
          "Tips di luar paket",
          "Upgrade suite",
          "Perpanjangan masa tinggal",
        ]),
        departureCity: "Jakarta",
        availableDates: JSON.stringify([
          "2026-02-15",
          "2026-02-22",
          "2026-03-01",
          "2026-03-08",
          "2027-02-10",
          "2027-02-20",
        ]),
        featuredImage: MEDIA.vip.featured,
        gallery: JSON.stringify([...MEDIA.vip.gallery]),
        category: "vip",
        status: "published",
      },
    ];

    for (const pkg of packageInserts) {
      await client.query(
        `INSERT INTO packages (id, title, slug, description, duration_days, price, currency,
          itinerary, inclusions, exclusions, departure_city, available_dates,
          featured_image, gallery, category, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
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
          pkg.featuredImage,
          pkg.gallery,
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

    // Seed landing pages so pages.spec.ts has data to render.
    // Without this, pages.length === 0 → empty state → pages-page-info not rendered.
    const landingPageIds = [
      "00000000-0000-0000-0000-100000000001",
      "00000000-0000-0000-0000-100000000002",
      "00000000-0000-0000-0000-100000000003",
      "00000000-0000-0000-0000-100000000004",
    ];

    await client.query("BEGIN");
    await client.query("DELETE FROM landing_pages WHERE slug = $1", ["home"]);
    await client.query("DELETE FROM landing_pages WHERE slug = $1", ["about-us"]);
    await client.query("DELETE FROM landing_pages WHERE slug = $1", ["umrah-packages"]);
    await client.query("DELETE FROM landing_pages WHERE slug = $1", ["contact"]);
    for (const id of landingPageIds) {
      await client.query("DELETE FROM landing_pages WHERE id = $1", [id]);
    }

    const landingPageInserts = [
      {
        id: landingPageIds[0],
        templateId: "default",
        slug: "home",
        title: "Home",
        content: JSON.stringify({
          heroTitle: "Welcome to Rihla Mate",
          heroSubtitle: "Your journey begins here",
        }),
        seo: JSON.stringify({ title: "Home - Rihla Mate", description: "Landing page home" }),
        isPublished: true,
        isHomepage: true,
        publishedAt: now,
      },
      {
        id: landingPageIds[1],
        templateId: "default",
        slug: "about-us",
        title: "About Us",
        content: JSON.stringify({
          heroTitle: "About Rihla Mate",
          heroSubtitle: "Learn more about us",
        }),
        seo: JSON.stringify({
          title: "About Us - Rihla Mate",
          description: "About Rihla Mate travel platform",
        }),
        isPublished: true,
        isHomepage: false,
        publishedAt: now,
      },
      {
        id: landingPageIds[2],
        templateId: "default",
        slug: "umrah-packages",
        title: "Umrah Packages",
        content: JSON.stringify({
          heroTitle: "Umrah Packages",
          heroSubtitle: "Find your perfect Umrah journey",
        }),
        seo: JSON.stringify({
          title: "Umrah Packages - Rihla Mate",
          description: "Browse our Umrah packages",
        }),
        isPublished: true,
        isHomepage: false,
        publishedAt: now,
      },
      {
        id: landingPageIds[3],
        templateId: "default",
        slug: "contact",
        title: "Contact",
        content: JSON.stringify({
          heroTitle: "Contact Us",
          heroSubtitle: "Get in touch with us",
        }),
        seo: JSON.stringify({
          title: "Contact - Rihla Mate",
          description: "Contact Rihla Mate",
        }),
        isPublished: false,
        isHomepage: false,
        publishedAt: null,
      },
    ];

    for (const lp of landingPageInserts) {
      await client.query(
        `INSERT INTO landing_pages (id, template_id, slug, title, content, seo,
          is_published, is_homepage, published_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          lp.id,
          lp.templateId,
          lp.slug,
          lp.title,
          lp.content,
          lp.seo,
          lp.isPublished,
          lp.isHomepage,
          lp.publishedAt,
          now,
          now,
        ],
      );
    }
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
          ekonomi: pkgEkonomiId,
          plus: pkgPlusId,
          vip: pkgVipId,
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

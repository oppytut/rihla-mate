# Seed ops: local, Neon, dan e2e

Panduan operator untuk mengisi data demo **tanpa** Hyperdrive, **tanpa** secrets di repo, dan **tanpa** full wipe booking (kecuali Playwright CI seed).

## Ringkasan tool

| Tool                                | Perintah                                             | Apa yang diubah                                                                                                                                                                                                         | Keamanan                      |
| ----------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Catalog packages (+ CMS + settings) | `pnpm db:seed:catalog` / `pnpm db:seed:catalog:neon` | Upsert paket Umrah by slug; upsert halaman CMS (`home`, `about`, `contact`, `faq`) + settings biro (tanpa secret); hapus legacy leisure slug; booking hanya jika `SEED_INCLUDE_BOOKINGS=1` **dan** tabel booking kosong | Butuh `DATABASE_URL`          |
| E2e admin user                      | `pnpm db:seed:e2e-admin`                             | User + credential Better Auth (role admin); optional license key                                                                                                                                                        | **Wajib** `E2E_ADMIN_SEED=1`  |
| Full Playwright CI seed             | `pnpm tsx scripts/playwright-seed.ts`                | Admin, packages, landing pages, license; **DELETE bookings**                                                                                                                                                            | Hanya CI / local e2e Postgres |

Tidak ada script yang memakai Workers bindings atau Hyperdrive. Koneksi = Postgres TCP (`pg`) atau Neon HTTP (`@neondatabase/serverless`) lewat URL.

## Env

| Variable                                                    | Dipakai oleh                     | Catatan                                                      |
| ----------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                                              | semua seed                       | Wajib (kecuali default local di `playwright-seed` saja)      |
| `DATABASE_URL_UNPOOLED`                                     | catalog, migrate, e2e-admin      | Dipakai jika non-empty (string kosong dari CI = unset)       |
| `SEED_USE_NEON=1`                                           | catalog (`db:seed:catalog:neon`) | Paksa driver neon-http                                       |
| `SEED_DRIVER=pg`                                            | catalog                          | Paksa `node-postgres`                                        |
| `SEED_INCLUDE_BOOKINGS=1`                                   | catalog                          | Sample bookings hanya jika tabel bookings masih kosong       |
| `E2E_ADMIN_SEED=1`                                          | e2e-admin                        | Gate hard — tanpa ini script exit 1                          |
| `E2E_ADMIN_SEED_LICENSE=1`                                  | e2e-admin                        | Upsert `CI-TEST-LICENSE-KEY`                                 |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` / `E2E_ADMIN_NAME` | e2e-admin                        | Override default `playwright@rihlamate.test` / `testpass123` |

Jangan commit `.env` atau connection string.

## Alur yang disarankan

### A. Local Docker Postgres (dev)

```bash
# migrasi (drizzle-kit di apps/app)
pnpm db:migrate

# paket demo (driver pg otomatis untuk localhost)
pnpm db:seed:catalog

# admin e2e (opsional)
E2E_ADMIN_SEED=1 DATABASE_URL=postgres://rihlamate:rihlamate_dev@localhost:5432/rihlamate_dev \
  pnpm db:seed:e2e-admin
```

### B. Neon (staging / shared DB untuk QA)

```bash
# migrasi HTTP (dari apps/app)
pnpm -C apps/app db:migrate:neon

# catalog lewat neon-http
DATABASE_URL='postgresql://…@….neon.tech/…?sslmode=require' \
  pnpm db:seed:catalog:neon

# atau biarkan auto-detect neon host:
DATABASE_URL='…neon.tech…' pnpm db:seed:catalog

# admin untuk login dashboard
E2E_ADMIN_SEED=1 DATABASE_URL='…' pnpm db:seed:e2e-admin
```

Prefer `DATABASE_URL_UNPOOLED` untuk migrate/seed jika pooler Neon bermasalah.

### C. Playwright E2E (CI / local full)

Workflow CI menjalankan `pnpm tsx scripts/playwright-seed.ts` setelah migrate. Script itu **menghapus semua bookings** dan me-reset user e2e — **jangan** jalankan ke Neon production.

```bash
# local e2e DB only
DATABASE_URL=postgres://rihlamate:rihlamate_dev@localhost:5432/rihlamate_dev \
  pnpm tsx scripts/playwright-seed.ts
```

## Idempotensi catalog

Jalankan berulang kali aman:

- Paket: `INSERT … ON CONFLICT (slug) DO UPDATE`.
- Halaman CMS: `ON CONFLICT (slug) DO UPDATE` (title, `{ body }`, SEO, published/homepage). Homepage lain di-unset agar hanya `home` yang `isHomepage`.
- Settings: `ON CONFLICT (key) DO UPDATE` untuk kunci non-secret (`appName`, kontak, `currency`, `bookingPrefix`). **Tidak** menulis Midtrans/Resend/password.
- Bookings: hanya insert jika `SEED_INCLUDE_BOOKINGS=1` **dan** tabel masih kosong.

## Apa yang tidak dilakukan script catalog

- Tidak menghapus bookings yang sudah ada (kecuali paket legacy leisure yang dihapus beserta booking-nya).
- Tidak membuat user admin (pakai `db:seed:e2e-admin`).
- Tidak menulis file `.playwright-auth.json` (itu domain Playwright seed).
- Tidak deploy Workers / wrangler.
- Tidak menyimpan API key pembayaran/email.

## Troubleshooting singkat

| Gejala                                  | Cek                                                              |
| --------------------------------------- | ---------------------------------------------------------------- |
| `Refusing to run: set E2E_ADMIN_SEED=1` | Export gate sebelum `db:seed:e2e-admin`                          |
| `DATABASE_URL is required`              | Export URL; unpooled empty string diabaikan                      |
| Login gagal setelah admin seed          | Password di-hash ulang; session lama dihapus — sign-in fresh     |
| Dashboard redirect `/activate`          | License: `E2E_ADMIN_SEED_LICENSE=1` atau aktivasi normal         |
| Paket kosong di public site             | Jalankan `db:seed:catalog` / `:neon`                             |
| `/about` 404 / home tanpa body CMS      | Catalog seed juga mengisi halaman CMS; jalankan ulang            |
| Bookings sample tidak muncul            | Set `SEED_INCLUDE_BOOKINGS=1` dan pastikan tabel bookings kosong |

## Referensi kode

- Catalog: `apps/app/src/lib/db/seed.ts`
- Migrate Neon: `apps/app/src/lib/db/migrate.ts`
- E2e admin: `scripts/neon-e2e-admin-seed.ts`
- Full Playwright: `scripts/playwright-seed.ts`

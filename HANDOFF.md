# Handoff — Rihla Mate

**Tanggal**: 2026-06-30
**Status**: Batch 3 selesai, Midtrans payment integration done

---

## Ringkasan Batch 1

### Yang Sudah Jadi

| #   | Komponen                                                                                                         | Status               |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | `packages/shared/` — shared types (LicensePayload, API types, plan features)                                     | `tsc --noEmit` clean |
| 2   | `Dockerfile` + `docker-compose.yml` + `docker-compose.dev.yml` + `.env.example` + `install.sh`                   | Siap                 |
| 3   | `license-server/` — Hono REST API, Drizzle + Ed25519 signing, 6 tabel DB, keygen CLI, middleware auth/rate-limit | `tsc --noEmit` clean |
| 4   | Monorepo scaffold — pnpm workspaces + Turborepo + Next.js 16 (`apps/app/`), 7 skema DB, `env.ts`                 | `tsc --noEmit` clean |
| 5   | Dokumentasi — `install.md` (610 baris), `license.md` (629 baris), `architecture.md` (968 baris)                  | Bahasa Indonesia     |

### Fix Verifikasi (sudah selesai)

- `license-server/` sekarang import dari `@rihla-mate/shared` (workspace dependency), duplikat `LicensePayload` dihapus
- `turbo.json`: `pipeline` → `tasks` (Turborepo v2)
- `docker-compose.yml` & `docker-compose.dev.yml`: hapus `version: "3.8"` (obsolete)

### Verifikasi Final

```
pnpm run check  →  2 successful (shared, app), 0 failures
```

---

## Arsitektur Kunci

- **Monorepo**: pnpm workspaces + Turborepo
- **App**: Next.js 16 (standalone output), port 3000
- **License Server**: Hono, port 3001
- **DB**: PostgreSQL 16 (Drizzle ORM)
- **Auth**: Better Auth (belum setup)
- **Payment**: Midtrans Snap (terintegrasi, lihat Batch 3)
- **Storage**: S3-compatible / local

### Format License Key

```
RML1.<base64url(payload)>.<base64url(Ed25519 signature)>
```

### ID Prefixes

`lic_`, `cust_`, `act_`, `chk_`

---

## File Penting

| File                                   | Isi                                                                                                         |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `packages/shared/src/license-types.ts` | Semua tipe shared: LicensePayload, LicenseState, TrialState, PLAN_FEATURES, PLAN_LIMITS, API response types |
| `packages/shared/src/index.ts`         | Barrel export                                                                                               |
| `license-server/src/lib/signing.ts`    | Ed25519 sign/verify, import LicensePayload dari shared                                                      |
| `license-server/src/lib/keygen.ts`     | Generate license key, terima LicensePayload langsung                                                        |
| `license-server/src/routes/`           | activate, checkin, health, revoke — semua pakai tipe dari shared                                            |
| `turbo.json`                           | Tasks: build, dev, lint, check, db:generate, db:migrate                                                     |
| `docker-compose.yml`                   | 3 service: app (3000), db (postgres:16-alpine), watchtower                                                  |

---

## Batch 3 — Midtrans Payment Integration

### Yang Sudah Jadi

| #   | Komponen                                                                                                                                                                               | Status                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 1   | `apps/app/src/lib/payment/midtrans.ts` — `createSnapTransaction`, `verifyWebhookSignature`, `getTransactionStatus`, `isMidtransConfigured`                                             | `tsc --noEmit` clean, 40 unit tests pass         |
| 2   | `apps/app/src/app/api/midtrans/webhook/route.ts` — POST handler: baca raw body, verifikasi SHA512, update booking status                                                               | Terintegrasi                                     |
| 3   | `apps/app/src/lib/trpc/routers/midtrans.ts` — `createTransaction` mutation (protectedProcedure)                                                                                        | Terintegrasi                                     |
| 4   | `apps/app/src/types/midtrans-client.d.ts` — Type declarations untuk package CommonJS                                                                                                   | `tsc --noEmit` clean                             |
| 5   | DB schema `bookings.ts` — 6 kolom Midtrans: `midtrans_order_id`, `midtrans_transaction_id`, `payment_method`, `payment_channel`, `gross_amount`, `transaction_status` (semua nullable) | Migrasi: `drizzle/0004_wooden_quentin_quire.sql` |
| 6   | Middleware `apps/app/src/middleware.ts` — `/api/midtrans` ditambah ke `PUBLIC_PREFIXES`                                                                                                | Webhook bisa diakses tanpa auth                  |
| 7   | Layout `apps/app/src/app/layout.tsx` — Midtrans Snap script (auto-detect sandbox/production)                                                                                           | Client-side Snap popup siap                      |
| 8   | `apps/app/src/lib/__tests__/midtrans.test.ts` — 40 unit tests, semua pass                                                                                                              | ✅                                               |

### Alur Pembayaran

```
Client minta Snap token via tRPC
  → Server generate pakai midtrans-client Snap API
    → Client buka Snap popup
      → Midtrans panggil webhook
        → Server verifikasi SHA512 signature + update booking status
```

### Konfigurasi Env

| Variabel                          | Scope  | Wajib?                                  |
| --------------------------------- | ------ | --------------------------------------- |
| `MIDTRANS_SERVER_KEY`             | Server | Optional (return error kalau tidak ada) |
| `MIDTRANS_CLIENT_KEY`             | Server | Optional                                |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Client | Optional                                |

### Catatan Teknis

- **midtrans-client**: CommonJS package, type manual di `src/types/midtrans-client.d.ts`
- **Webhook signature**: `SHA512(order_id + status_code + gross_amount + ServerKey)` — raw body dibaca via `req.text()`, diverifikasi pakai `crypto.timingSafeEqual`
- **Snap script**: Auto-deteksi sandbox/production dari prefix client key (`Mid-server-`)

### Test Coverage

- 40 unit tests — `createSnapTransaction` (success, error, not configured), `verifyWebhookSignature` (valid, invalid, missing key), `getTransactionStatus` (success, error), `isMidtransConfigured`, `midtransRouter.createTransaction` (success, error, not configured), webhook handler (valid signature, invalid signature, missing server key)
- Full suite: 391 tests pass, 0 failures

---

## Batch 2 — Rencana

1. **License module di app** — `store.ts`, `checkin.ts`, `trial.ts`, `guard.ts`, `middleware.ts`
2. **Better Auth setup** — `auth.ts`, schema user/session/account, middleware integrasi
3. **Tailwind + shadcn/ui** — `tailwind.config.ts`, `globals.css`, `components.json`, theme
4. **tRPC router scaffold** — `trpc/` directory, root router, context

---

## Perintah Cepat

```bash
pnpm install          # Install semua deps
pnpm dev              # Jalankan dev (app + license-server)
pnpm run check        # tsc --noEmit semua package
pnpm run db:generate  # Generate Drizzle migrations
pnpm run db:migrate   # Jalankan migrasi
```

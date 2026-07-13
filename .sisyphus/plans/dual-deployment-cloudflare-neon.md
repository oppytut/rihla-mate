# Rihla Mate — Dual Deployment: VPS + Cloudflare Full + Neon

> **Version**: 2.0 | **Date**: 2026-07-12 | **Status**: Draft (Revised after Momus review)
> **Model**: Satu codebase, runtime detection, deploy ke VPS (Docker) atau Cloudflare (Workers + Pages + R2 + Hyperdrive + Neon)

---

## Executive Summary

Rihla Mate saat ini hanya mendukung deployment VPS via Docker Compose. Plan ini menambahkan dukungan deployment ke Cloudflare full platform + Neon tanpa memecah codebase menjadi dua branch. Menggunakan runtime detection (`DEPLOYMENT_TARGET` env var) dan abstraksi driver untuk komponen yang berbeda antara VPS dan Cloudflare.

**Catatan**: Sebagian setup Cloudflare sudah ada di codebase:

- `@opennextjs/cloudflare` v1.20.1 — sudah di devDependencies
- `wrangler` v4.110.0 — sudah di devDependencies
- `open-next.config.ts` — sudah ada dengan R2 cache + KV tag cache + queue "direct"
- `wrangler.jsonc` — sudah ada dengan binding R2 + Images, tapi tanpa Hyperdrive + Queues
- `turbo.json` — sudah ada task `build:cf` dan `preview:cf`
- Script `build:cf`, `deploy:cf`, `preview:cf` — sudah ada di package.json

---

## Analisis Kesenjangan (Gap Analysis)

### Komponen yang Sudah Cloudflare-Compatible (Zero Changes)

| Komponen                    | Alasan                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------- |
| tRPC route handler          | Sudah pakai `fetchRequestHandler` (Workers-compatible)                                 |
| tRPC context                | `createTRPCContext` hanya pakai `auth.api.getSession()` + `db` — tidak ada Node.js API |
| Drizzle schema (12 file)    | Semua pakai `varchar()` bukan `pgEnum()` — sudah Neon-compatible                       |
| Storage (S3)                | Sudah S3-compatible, tinggal arahkan `S3_ENDPOINT` ke R2                               |
| License verify (checkin.ts) | `verifyLicenseWithServer()` sudah pakai `fetch()` — Workers-compatible                 |
| next.config.ts              | Minimal config, tidak ada yang konflik dengan OpenNext                                 |
| packages/shared             | Hanya type definitions, zero runtime dependencies                                      |
| Tailwind CSS v4 + shadcn/ui | CSS-only, tidak ada Node.js dependency                                                 |
| next-intl                   | Sudah mendukung Edge runtime                                                           |
| open-next.config.ts         | Sudah ada, tinggal verifikasi                                                          |

### Komponen yang Perlu Diadaptasi (8 File)

| #   | File                  | Masalah                                                                  | Solusi                                                                                |
| --- | --------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | `db/client.ts`        | Hard dependency ke `drizzle-orm/node-postgres` + `pg.Pool`               | Abstraksi dual driver: `node-postgres` (VPS) vs `neon-serverless` (Cloudflare)        |
| 2   | `auth.ts`             | `drizzleAdapter(pg)` + `nextCookies()` — tidak compatible dengan Workers | **RISIKO TERTINGGI** — perlu verifikasi better-auth Workers compatibility di Fase 1.5 |
| 3   | `instrumentation.ts`  | `setInterval` + `process.on(SIGTERM)` — tidak ada di Workers             | Abstraksi background jobs: `setInterval` (VPS) vs Cloudflare Cron Triggers            |
| 4   | `payment/midtrans.ts` | `node:crypto` + `midtrans-client` — Node.js SDK                          | Ganti ke Web Crypto API + Midtrans REST API (`fetch()`)                               |
| 5   | `trpc/rate-limit.ts`  | `net.isIP()` dari `node:net` — tidak ada di Workers                      | Ganti ke regex IP validation                                                          |
| 6   | `email/booking.ts`    | `new Resend()` — Node.js SDK                                             | Ganti ke Resend REST API (`fetch()`)                                                  |
| 7   | `license/store.ts`    | `NodePgDatabase` type import                                             | Ganti ke generic Drizzle type                                                         |
| 8   | `license/checkin.ts`  | `scheduleCheckIn()` pakai `setInterval`                                  | Abstraksi scheduler (pakai package yang sama dengan instrumentation)                  |

---

## Arsitektur Target

```
rihla-mate/
├── apps/app/                          # Next.js app
│   ├── src/
│   │   ├── lib/
│   │   │   ├── db/
│   │   │   │   ├── client.ts          # [REFACTOR] Dual driver abstraction
│   │   │   │   ├── client-vps.ts      # [NEW] node-postgres driver
│   │   │   │   ├── client-cf.ts       # [NEW] neon-serverless driver
│   │   │   │   └── schema/            # [NO CHANGE] 12 file schema
│   │   │   ├── auth.ts                # [REFACTOR] Runtime-aware adapter (Fase 7)
│   │   │   ├── payment/
│   │   │   │   └── midtrans.ts        # [REFACTOR] Web Crypto + REST API
│   │   │   ├── email/
│   │   │   │   └── booking.ts         # [REFACTOR] Resend REST API
│   │   │   ├── trpc/
│   │   │   │   └── rate-limit.ts      # [REFACTOR] Regex IP validation
│   │   │   ├── license/
│   │   │   │   ├── store.ts           # [REFACTOR] Generic Drizzle type
│   │   │   │   └── checkin.ts         # [REFACTOR] Abstract scheduler
│   │   │   └── background/
│   │   │       ├── scheduler.ts       # [NEW] Abstract scheduler interface
│   │   │       ├── scheduler-vps.ts   # [NEW] setInterval implementation
│   │   │       └── scheduler-cf.ts    # [NEW] Cron Trigger stub (no-op runtime)
│   │   ├── instrumentation.ts         # [REFACTOR] Use abstract scheduler
│   │   └── env.ts                     # [REFACTOR] Add DEPLOYMENT_TARGET
│   ├── next.config.ts                 # [REFACTOR] Add OpenNext plugin (conditional)
│   ├── wrangler.jsonc                 # [REFACTOR] Add Hyperdrive + Queues bindings
│   └── open-next.config.ts            # [EXISTS] Verifikasi saja
├── packages/shared/                   # [NO CHANGE]
├── docker-compose.yml                 # [NO CHANGE] VPS deployment
└── turbo.json                         # [REFACTOR] Add DEPLOYMENT_TARGET
```

---

## Rencana Implementasi (8 Fase — Diurut Ulang)

### Urutan Baru (setelah Momus Review)

```
Fase 0 (Environment) ──┬── Fase 1 (DB Driver) ── Fase 1.5 (AUTH SPIKE)
                        │
                        │   ⚠️  GATE: Jika better-auth TIDAK kompatibel → STOP, replan
                        │   ✅ Jika better-auth kompatibel → lanjut
                        │
                        ├── Fase 2 (License Type)
                        ├── Fase 3 (Background Jobs)
                        ├── Fase 4 (Midtrans)       ──┐
                        ├── Fase 5 (Resend)         ──┤ PARALEL
                        └── Fase 6 (Rate Limit)     ──┘
                                                    │
                        Fase 7 (Auth Adaptation) ◄───┘
                                                    │
                        Fase 8 (Verify CF Setup) ◄──┘
```

---

### Fase 0: Environment & Config

**Durasi**: ~20 menit | **Dependencies**: Tidak ada

1. Tambah `DEPLOYMENT_TARGET` ke `env.ts` (`z.enum(["vps", "cloudflare"]).default("vps")`)
2. Tambah `DEPLOYMENT_TARGET` ke `turbo.json` globalPassThroughEnv
3. Update `wrangler.jsonc` — tambah `DEPLOYMENT_TARGET=cloudflare` di vars, tambah Hyperdrive + Queues bindings
4. `getDeploymentTarget()` utility inline di `apps/app` (bukan di `packages/shared` — shared hanya type)

**Deliverable**: `DEPLOYMENT_TARGET` env var berfungsi, default "vps" untuk backward compatibility.

---

### Fase 1: Database Driver Abstraction

**Durasi**: ~45 menit | **Dependencies**: Fase 0

1. Buat `db/client-vps.ts` — pindahkan kode existing `client.ts` (node-postgres + Pool)
2. Buat `db/client-cf.ts` — implementasi dengan `@neondatabase/serverless` + `drizzle-orm/neon-serverless`
3. Refactor `db/client.ts` — conditional export berdasarkan `DEPLOYMENT_TARGET`
4. Install `@neondatabase/serverless`

**Deliverable**: `db/client.ts` mengekspor `db` yang bekerja di kedua runtime.

---

### ⚠️ Fase 1.5: Auth Feasibility Spike (GATE)

**Durasi**: ~45 menit | **Dependencies**: Fase 1

**INI ADALAH GATE. Jika better-auth tidak kompatibel dengan Workers, seluruh rencana perlu di-replan.**

1. Riset: cek better-auth GitHub issues, docs, dan changelog untuk Workers/Edge runtime support
2. Cek apakah `drizzleAdapter` mendukung `neon-http` provider
3. Cek apakah ada `nextCookies()` alternatif untuk Cloudflare Workers
4. Coba build `build:cf` dengan better-auth + neon driver — apakah ada error?
5. Jika better-auth TIDAK kompatibel:
   - **STOP** — laporkan ke user untuk replan (opsi: `nodejs_compat` flag, custom auth, atau branch terpisah)
6. Jika better-auth kompatibel:
   - Lanjut ke Fase 2-8

**Deliverable**: Keputusan GO/NO-GO untuk Cloudflare deployment.

---

### Fase 2: License Store Type Fix

**Durasi**: ~15 menit | **Dependencies**: Fase 1

1. Refactor `license/store.ts` — ganti `NodePgDatabase` type ke generic type
2. Gunakan `Parameters<typeof db.select>[0]` pattern atau `$inferSelect` untuk type inference

**Deliverable**: `store.ts` tidak lagi mengimpor dari `drizzle-orm/node-postgres`.

---

### Fase 3: Background Jobs Abstraction

**Durasi**: ~45 menit | **Dependencies**: Fase 0

1. Buat `lib/background/scheduler.ts` — interface `Scheduler` dengan `schedule(fn, intervalMs)` → `{ stop() }`
2. Buat `lib/background/scheduler-vps.ts` — implementasi `setTimeout` rekursif (pindahkan dari instrumentation.ts)
3. Buat `lib/background/scheduler-cf.ts` — **no-op stub** untuk Workers (Cron Triggers invoke worker secara independen via `wrangler.jsonc`)
4. Refactor `instrumentation.ts` — gunakan abstract scheduler, hapus `process.on`
5. Refactor `license/checkin.ts` — `scheduleCheckIn()` gunakan abstract scheduler

**Catatan**: Cloudflare Cron Triggers bekerja di level Worker (didefinisikan di `wrangler.jsonc`), bukan in-process scheduler. `scheduler-cf.ts` akan menjadi no-op stub yang mencatat bahwa scheduling harus dikonfigurasi via `wrangler.jsonc` cron triggers.

**Deliverable**: Background jobs berjalan di VPS via `setTimeout`, siap dikonfigurasi di CF via Cron Triggers.

---

### Fase 4: Payment (Midtrans) Refactor (PARALEL)

**Durasi**: ~45 menit | **Dependencies**: Tidak ada (independent)

1. Hapus `import midtransClient from "midtrans-client"`
2. Ganti `snap.createTransaction()` dengan `fetch()` ke Midtrans Snap API (`POST https://app.midtrans.com/snap/v1/transactions`)
3. Ganti `coreApi.transaction.status()` dengan `fetch()` ke Midtrans Core API (`GET https://api.midtrans.com/v2/{orderId}/status`)
4. Ganti `node:crypto` → Web Crypto API:
   - `crypto.createHash("sha512")` → `crypto.subtle.digest("SHA-512")` + hex encoding
   - `crypto.timingSafeEqual` → **TIDAK ADA di Web Crypto** — implementasi manual constant-time comparison dengan bitwise XOR
   - `Buffer.from()` → `new TextEncoder().encode()`
5. Remove `midtrans-client` dari dependencies

**Deliverable**: Midtrans payment berfungsi tanpa `node:crypto` dan `midtrans-client`.

---

### Fase 5: Email (Resend) Refactor (PARALEL)

**Durasi**: ~30 menit | **Dependencies**: Tidak ada (independent)

1. Hapus `import { Resend } from "resend"`
2. Ganti `resend.emails.send()` dengan `fetch()` ke Resend REST API (`POST https://api.resend.com/emails`)
3. Remove `resend` dari dependencies

**Deliverable**: Email booking confirmation berfungsi via Resend REST API.

---

### Fase 6: Rate Limit IP Validation Fix (PARALEL)

**Durasi**: ~15 menit | **Dependencies**: Tidak ada (independent)

1. Ganti `net.isIP(ip)` dengan regex IPv4/IPv6 validation
2. Hapus `import net from "node:net"`

**Deliverable**: Rate limiting berfungsi tanpa `node:net`.

---

### Fase 7: Auth (better-auth) Adaptation

**Durasi**: ~60 menit | **Dependencies**: Fase 1 + Fase 1.5 (GO)

1. Conditional adapter: `drizzleAdapter(db, { provider: "pg" })` untuk VPS, provider yang sesuai untuk Cloudflare (ditentukan di Fase 1.5)
2. Conditional cookies plugin: `nextCookies()` untuk VPS, custom cookies handler untuk Cloudflare
3. Jika better-auth sudah mendukung Workers native, adaptasi minimal
4. Jika perlu `nodejs_compat`, verifikasi apakah cukup

**Deliverable**: Auth berfungsi di kedua deployment target.

---

### Fase 8: Verifikasi OpenNext + Cloudflare Setup

**Durasi**: ~30 menit | **Dependencies**: Fase 0-7

Karena setup dasar sudah ada, fokus pada verifikasi:

1. Update `wrangler.jsonc` — tambah Hyperdrive binding (`HYPERDRIVE`), Queue binding, Cron Triggers
2. Verifikasi `open-next.config.ts` — pastikan kompatibel dengan versi `@opennextjs/cloudflare` v1.20.1
3. Test build: `pnpm build:cf` — pastikan sukses
4. Test local: `pnpm preview:cf` — pastikan app bisa jalan di wrangler dev
5. Verifikasi semua fitur: auth, tRPC, payment, email, storage, license check-in

**Deliverable**: `pnpm build:cf` sukses, app bisa jalan di wrangler dev.

---

## Dependencies Baru

```json
{
  "dependencies": {
    "@neondatabase/serverless": "^1.0.0"
  }
}
```

## Dependencies Dihapus

```json
{
  "dependencies": {
    "midtrans-client": "REMOVE",
    "resend": "REMOVE"
  }
}
```

`pg` tetap dipertahankan untuk VPS.

---

## Risk & Mitigasi (Diperbarui)

| Risk                                                    | Impact                                           | Mitigasi                                                                                                                 |
| ------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **better-auth tidak support Workers**                   | **BLOCKER** — Auth tidak berfungsi di Cloudflare | **Fase 1.5 sebagai GATE** — jika tidak kompatibel, STOP dan replan (opsi: custom auth, `nodejs_compat`, branch terpisah) |
| OpenNext v1.20.1 tidak kompatibel dengan Next.js 16     | Build gagal                                      | Sudah ada di devDependencies — test build:cf di Fase 8, fallback ke Pages Functions                                      |
| Midtrans REST API berbeda dengan SDK                    | Payment flow rusak                               | Test dengan Midtrans sandbox sebelum production                                                                          |
| Hyperdrive cold start latency                           | Response lambat untuk request pertama            | Warmup connection via Cron trigger setiap 5 menit                                                                        |
| `crypto.subtle.timingSafeEqual` tidak ada di Web Crypto | Verifikasi signature Midtrans tidak aman         | Implementasi manual constant-time comparison                                                                             |
| Cloudflare Cron Triggers ≠ in-process scheduler         | Background jobs tidak jalan otomatis             | Konfigurasi Cron Triggers di `wrangler.jsonc` sebagai bagian dari Fase 3 + Fase 8                                        |

---

## Parallel Execution Plan

**Group A** (setelah Fase 0): Fase 1
**GATE** (setelah Fase 1): Fase 1.5 → GO/NO-GO
**Group B** (setelah GATE GO): Fase 2, Fase 3, Fase 4, Fase 5, Fase 6 → semua PARALEL
**Group C** (setelah Group B): Fase 7
**Group D** (setelah Group C): Fase 8

---

## Verifikasi

Setiap fase harus lulus:

- [ ] `pnpm check` — TypeScript no errors
- [ ] `pnpm lint` — ESLint no errors
- [ ] `pnpm test` — Vitest all pass
- [ ] File yang diubah: `lsp_diagnostics` clean
- [ ] Build VPS: `docker compose build` sukses
- [ ] Build Cloudflare: `pnpm build:cf` sukses (Fase 8)

---

## Handoff

- [ ] CI must pass: playwright-smoke, playwright
- [ ] Verify: `pnpm check`, `pnpm lint`, `pnpm test`
- [ ] Next: Fase 0 — Environment & Config setup

# Handoff — Rihla Mate

**Tanggal**: 2026-06-24
**Status**: Batch 1 selesai, siap lanjut Batch 2

---

## Ringkasan Batch 1

### Yang Sudah Jadi

| # | Komponen | Status |
|---|----------|--------|
| 1 | `packages/shared/` — shared types (LicensePayload, API types, plan features) | `tsc --noEmit` clean |
| 2 | `Dockerfile` + `docker-compose.yml` + `docker-compose.dev.yml` + `.env.example` + `install.sh` | Siap |
| 3 | `license-server/` — Hono REST API, Drizzle + Ed25519 signing, 6 tabel DB, keygen CLI, middleware auth/rate-limit | `tsc --noEmit` clean |
| 4 | Monorepo scaffold — pnpm workspaces + Turborepo + Next.js 16 (`apps/app/`), 7 skema DB, `env.ts` | `tsc --noEmit` clean |
| 5 | Dokumentasi — `install.md` (610 baris), `license.md` (629 baris), `architecture.md` (968 baris) | Bahasa Indonesia |

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
- **Payment**: Midtrans (belum setup)
- **Storage**: S3-compatible / local

### Format License Key

```
RML1.<base64url(payload)>.<base64url(Ed25519 signature)>
```

### ID Prefixes

`lic_`, `cust_`, `act_`, `chk_`

---

## File Penting

| File | Isi |
|------|-----|
| `packages/shared/src/license-types.ts` | Semua tipe shared: LicensePayload, LicenseState, TrialState, PLAN_FEATURES, PLAN_LIMITS, API response types |
| `packages/shared/src/index.ts` | Barrel export |
| `license-server/src/lib/signing.ts` | Ed25519 sign/verify, import LicensePayload dari shared |
| `license-server/src/lib/keygen.ts` | Generate license key, terima LicensePayload langsung |
| `license-server/src/routes/` | activate, checkin, health, revoke — semua pakai tipe dari shared |
| `turbo.json` | Tasks: build, dev, lint, check, db:generate, db:migrate |
| `docker-compose.yml` | 3 service: app (3000), db (postgres:16-alpine), watchtower |

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

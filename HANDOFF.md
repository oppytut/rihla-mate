# Handoff — Rihla Mate (session berikutnya)

**Tanggal**: 2026-08-22  
**Bahasa ke user**: Indonesia  
**Repo**: `oppytut/rihla-mate`  
**Workspace host**: `/home/ubuntu/bench/rihla-mate`

---

## Keputusan operasional (wajib)

**Tes lab hanya dari host ini** (SSH `ubuntu@43.133.215.193`, curl ke `https://demo.rihla.my.id`).

- Jangan tambah GitHub Actions / Playwright CI yang memukul VPS lab.
- Jangan expose IP lab, kredensial admin, atau `BETTER_AUTH_SECRET` di log CI/PR.
- Jangan nunggu CI setelah push.

---

## Status git

| Item         | Nilai                                                                      |
| ------------ | -------------------------------------------------------------------------- |
| `main`       | `a57c55f` — `test: smoke public /guide and reject locale junk 500s (#109)` |
| Branch kerja | `feat/product-vs-bureau-surfaces`                                          |
| PR           | buat setelah commit (satu concern: surface produk vs biro)                 |

**Session start**: `gh pr list --state open` → merge jika CI hijau; jangan nunggu CI setelah push.

---

## Lab (VPS)

|            |                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| SSH        | `ubuntu@43.133.215.193`                                                                                                |
| Tree       | `~/rihla-mate` **tanpa `.git`** — deploy = rsync dari host + `docker compose build/up`                                 |
| Image      | override lokal `rihla-mate:lab` (bukan GHCR; pull `ghcr.io/rihlamate/rihla-mate:latest` = **401**)                     |
| URL        | `https://demo.rihla.my.id` (CF Proxied A → VPS)                                                                        |
| Apex       | `https://rihla.my.id` = Cloudflare Workers (CI `push` `main`)                                                          |
| Login staf | `admin@demo.rihla.my.id` / lihat `~/rihla-mate/.lab-admin` di VPS — **jangan print secret di chat kecuali user minta** |
| User id    | `4a0bc586-a699-461a-b17a-67df027f51df`                                                                                 |
| Trial      | `RM-83CC-5C63-EEA6-BF82`                                                                                               |

Watchtower: **opt-in** `profiles: ["watchtower"]` — jangan nyalakan di lab.

**Deploy lab hanya jika user minta** (rsync + rebuild). Kode surface belum di VPS sampai itu.

---

## Yang sudah di `main` (relevan)

- **#104–#109** guide, auth origin, Docker lab, locale allowlist, smoke `/guide`

**Produk vs demo:** satu install = satu biro. CTA staf di apex → `https://demo.rihla.my.id/sign-in`.

---

## Fitur sesi ini (belum di `main` sampai PR merge)

Pisah landing/nav/surface:

- Localhost = produk/CI; `demo.rihla.my.id` + custom domain = biro
- Apex instance paths → `LAB_DEMO_ORIGIN`; demo `/marketing` → `PRODUCT_ORIGIN`
- Home biro: paket `published` + CMS `pages` (`isHomepage` atau slug `home`); gagal DB → empty
- Non-biro `/packages` redirect `PRODUCT_ORIGIN/`
- Header/mobile: `extraLinks` / `hideProductAnchors`; footer `variant: "bureau"`
- i18n `marketing.bureau` (id/en/ar)

**Verifikasi host:** `site-mode.test.ts` 4 tes lulus; `pnpm --filter @rihla-mate/app check` OK.

---

## File kunci

- `apps/app/src/lib/site-mode.ts`, `site-mode.test.ts`, `middleware.ts`
- `apps/app/src/app/[locale]/page.tsx`, `bureau-landing.tsx`, `packages/page.tsx`
- `apps/app/src/components/marketing/marketing-{header,mobile-nav,footer}.tsx`
- `apps/app/src/lib/trpc/routers/packages.ts`, `pages.ts`
- `apps/app/messages/{id,en,ar}.json`

---

## Blocked (manusia)

1. Cloudflare **custom hostname** apex `rihla.my.id` — token error **10000**.
2. **GHCR** org `rihlamate` — lab tidak auto-pull image dari CI.
3. Pipeline auto-deploy VPS (opsional; sekarang rsync + rebuild dari host).

---

## Langkah session berikutnya

1. Cek PR surface → squash-merge jika CI hijau (jangan poll `gh run watch`).
2. Kerja baru di `main` setelah pull; **satu concern = satu PR**.
3. Verifikasi lab **hanya SSH/curl dari host ini** setelah user minta deploy.
4. Jangan kerjakan CF/GHCR tanpa token/permission.
5. `BETTER_AUTH_SECRET` jangan di log.

---

## Constraint user (verbatim)

- "gunakan bahasa indonesia"
- tes lab tetap dari host ini agar lebih aman
- "Do not wait for CI after pushing"
- "Start of Session: Check for existing PRs, git checkout main, git pull"
- "kerjakan semua saran yang bisa dieksekusi oleh AI" (kecuali blocked manusia)

---

## Catatan arsitektur

Monorepo pnpm + Turbo; Next 16 :3000; license-server Hono :3001; Postgres 16; Better Auth; Midtrans Snap. `DEPLOYMENT_TARGET === "cloudflare"` = apex Workers. Home biro load DB langsung (`loadBureauHome`), bukan tRPC di RSC.

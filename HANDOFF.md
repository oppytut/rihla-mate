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

| Item         | Nilai                                                                 |
| ------------ | --------------------------------------------------------------------- |
| `main`       | `680f117` — `feat: split product vs bureau marketing surfaces (#110)` |
| Branch kerja | `feat/bureau-metadata-and-copy`                                       |
| Lab          | image `rihla-mate:lab` @ #110, healthy; **belum** PR copy/metadata    |

**Session start**: `gh pr list --state open` → merge jika CI hijau; jangan nunggu CI setelah push.

---

## Lab (VPS)

|            |                                                                                        |
| ---------- | -------------------------------------------------------------------------------------- |
| SSH        | `ubuntu@43.133.215.193`                                                                |
| Tree       | `~/rihla-mate` **tanpa `.git`** — deploy = rsync dari host + `docker compose build/up` |
| Image      | override lokal `rihla-mate:lab`                                                        |
| URL        | `https://demo.rihla.my.id`                                                             |
| Apex       | `https://rihla.my.id` = Cloudflare Workers                                             |
| Login staf | `admin@demo.rihla.my.id` / `~/rihla-mate/.lab-admin` — **jangan print secret**         |

Deploy lab: rsync **kecuali** `.env`, `.lab-admin`, `docker-compose.override.yml`.

---

## Sesi ini (PR copy/metadata)

- Root `generateMetadata` bureau: tanpa deskripsi “Platform white-label…”
- Header mobile: jangan serialize label Harga/Pricing di bureau
- `/guide` di host biro → `PRODUCT_ORIGIN/guide`
- Empty packages: tautan ke `#contact`
- `surfaceRedirectUrl` + tes; Playwright localhost tetap copy SaaS

**Verifikasi host:** `site-mode.test.ts` 5 tes; `tsc --noEmit` OK.

---

## File kunci

- `apps/app/src/lib/site-mode.ts`, `site-mode.test.ts`, `middleware.ts`
- `apps/app/src/app/layout.tsx`
- `apps/app/src/components/marketing/marketing-header.tsx`
- `apps/app/src/app/[locale]/bureau-landing.tsx`
- `scripts/bureau-surface.spec.ts`

---

## Blocked (manusia)

1. Cloudflare custom hostname apex — token **10000**.
2. GHCR org `rihlamate`.
3. Auto-deploy VPS (lab = rsync).

---

## Constraint user (verbatim)

- "gunakan bahasa indonesia"
- tes lab tetap dari host ini agar lebih aman
- "Do not wait for CI after pushing"
- "lanjut kerjakan"

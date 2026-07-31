# Rihla Mate — Production Visual Audit + Redesign Plan

**Date:** 2026-07-24  
**Production:** `https://rihla-mate.ariefna95.workers.dev`  
**Scope:** Public/unauth surfaces + dashboard unauth flash  
**Out of scope (full):** Authenticated dashboard UI (needs session)  
**Screenshots:** `.playwright-mcp/rihla-screenshots/`

---

## Severity legend

| Tag        | Meaning                                            |
| ---------- | -------------------------------------------------- |
| **P0-BUG** | Broken in production — trust/SEO/conversion killer |
| **P1-UX**  | Structure/flow wrong                               |
| **P2-VIS** | Brand/visual debt                                  |
| **NOTE**   | Context / deferred                                 |

---

## Screenshot inventory

| File                               | Route                                | Notes                              |
| ---------------------------------- | ------------------------------------ | ---------------------------------- |
| `01-home-id.png`                   | `/`                                  | Raw i18n keys on 3/4 cards         |
| `02-marketing-id.png`              | `/marketing`                         | Broken header chrome; body OK      |
| `03-sign-in-id.png`                | `/sign-in`                           | Generic card                       |
| `04-installer-id.png`              | `/installer`                         | Stuck "Memuat..."                  |
| `05-activate-id.png`               | `/activate`                          | Functional skeleton                |
| `06-book-bali-id.png`              | `/packages/bali-sacred-temples/book` | Empty/dead                         |
| `07-book-success-id.png`           | `.../book/success`                   | Thin confirmation                  |
| `08-home-en.png`                   | `/en`                                | EN locale                          |
| `09-marketing-en.png`              | `/en/marketing`                      | EN locale                          |
| `10-sign-in-en.png`                | `/en/sign-in`                        | EN locale                          |
| `11-home-ar.png`                   | `/ar`                                | AR locale                          |
| `12-dashboard-unauth.png`          | `/dashboard` → sign-in               | Auth redirect                      |
| `13-dashboard-bookings-unauth.png` | `/dashboard/bookings`                | **Flash of shell before redirect** |
| `14–16-*-unauth.png`               | packages/license/settings            | Mostly → sign-in                   |

---

## 1. Per-page review

### 1.1 Home `/` — Grade **F**

| #   | Severity   | Issue                                                          |
| --- | ---------- | -------------------------------------------------------------- | -------- | ------------- |
| H1  | **P0-BUG** | Title = "Create Next App" (`app/layout.tsx`)                   |
| H2  | **P0-BUG** | Feature cards show raw keys: `marketing.features.bookings      | packages | customers.\*` |
| H3  | **P0-BUG** | Only analytics card resolves ("Dashboard Analitik")            |
| H4  | **P1-UX**  | H1 = `hero.subtitle` (long pitch); real `hero.headline` unused |
| H5  | **P1-UX**  | All CTAs → `/sign-in` (trial CTA is a lie)                     |
| H6  | **P1-UX**  | No link to `/marketing`, `/installer`, `/activate`             |
| H7  | **P2-VIS** | Generic "RM" badge; sparse layout; no Umrah identity           |

**Root cause H2:** `page.tsx` uses `features.bookings|packages|customers`; messages only have `whiteLabel`, `selfHosted`, `bookingEngine`, `payments`, `license`, `analytics`.

### 1.2 Marketing `/marketing` — Grade **D+**

| #   | Severity   | Issue                                                      |
| --- | ---------- | ---------------------------------------------------------- |
| M1  | **P0-BUG** | Header: `common.common.appName` / `common.nav.*` raw keys  |
| M2  | **NOTE**   | Body sections resolve (hero, features, pricing, FAQ, etc.) |
| M3  | **P1-UX**  | "Gratis14 hari" missing space                              |
| M4  | **P1-UX**  | All CTAs → `/sign-in` not `/activate`                      |
| M5  | **P2-VIS** | Default shadcn look; no locale switcher                    |

**Root cause M1:** `getTranslations("common")` then `t("common.appName")` → double namespace. `nav` lives under `marketing.nav`, not `common`.

### 1.3 Sign-in — Grade **C**

| #   | Severity   | Issue                                      |
| --- | ---------- | ------------------------------------------ |
| S1  | **P0-BUG** | Title "Create Next App"                    |
| S2  | **P1-UX**  | Invite-only footer vs trial CTAs elsewhere |
| S3  | **P2-VIS** | Generic centered card; no brand mark       |

### 1.4 Installer — Grade **D**

| #   | Severity   | Issue                                              |
| --- | ---------- | -------------------------------------------------- |
| I1  | **P0-BUG** | Stuck "Memuat..." + Lanjut disabled                |
| I2  | **P1-UX**  | No timeout/retry; hardcoded English "or" in places |
| I3  | **P2-VIS** | Numeric stepper only; no brand panel               |

### 1.5 Activate — Grade **C-**

| #   | Severity   | Issue                                                |
| --- | ---------- | ---------------------------------------------------- |
| A1  | **P1-UX**  | Sparse; success → `/dashboard` may bounce to sign-in |
| A2  | **P2-VIS** | No trust signals; parallel UI to installer step      |

### 1.6 Public book — Grade **F (prod)**

| #   | Severity   | Issue                                              |
| --- | ---------- | -------------------------------------------------- |
| B1  | **P0-BUG** | Package missing / near-empty page                  |
| B2  | **P0-BUG** | Wrong not-found copy ("Pemesanan tidak ditemukan") |
| B3  | **P1-UX**  | Manual `/${locale}/` links vs as-needed prefix     |

### 1.7 Book success — Grade **D**

| #   | Severity  | Issue                                |
| --- | --------- | ------------------------------------ |
| X1  | **P1-UX** | Double arrow "← ← Kembali ke Daftar" |
| X2  | **P1-UX** | No booking ID / next steps / receipt |

### 1.8 Dashboard unauth — Grade **N/A** (partial)

| #   | Severity  | Issue                                                                                                                                                       |
| --- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | **NOTE**  | Most routes redirect to sign-in (expected)                                                                                                                  |
| D2  | **P1-UX** | **Auth flash:** `/dashboard/bookings` briefly renders full shell (sidebar + empty table skeleton) before `user.me` UNAUTHORIZED redirect — client-only gate |
| D3  | **NOTE**  | Full dashboard visual audit needs authenticated session                                                                                                     |

---

## 2. Cross-cutting problems

1. **Metadata** — create-next-app defaults globally
2. **i18n hygiene** — wrong keys, double namespace, hardcoded EN
3. **CTA funnel lie** — trial → sign-in (invite-only) instead of activate/installer
4. **No shared marketing shell** — home vs marketing diverge
5. **Design tokens** — default zinc primary; Cairo loaded but not applied for AR
6. **Two competing landing pages** — home stub vs full marketing
7. **Client-only dashboard auth** — content flash for unauthenticated users

---

## 3. Prioritized fix plan

### Wave 0 — Credibility (½–1 day) — **do first**

| ID   | Fix                                      | Files                           | Done when                   |
| ---- | ---------------------------------------- | ------------------------------- | --------------------------- |
| P0.1 | Real metadata title/description          | `app/layout.tsx`, locale layout | Tab never "Create Next App" |
| P0.2 | Fix home feature keys                    | `page.tsx` and/or messages      | Zero raw keys on `/`        |
| P0.3 | Fix marketing header namespace           | `marketing/page.tsx`            | Brand + nav human-readable  |
| P0.4 | Book empty/not-found + seed or hide demo | book page, seed, messages       | Clear empty state           |
| P0.5 | Installer systemCheck timeout/retry      | installer page                  | No infinite Memuat          |
| P0.6 | i18n missing-key CI check                | test/lint                       | Prevents regression         |

### Wave 1 — Funnel truth (1–2 days)

| ID   | Fix                                                                     |
| ---- | ----------------------------------------------------------------------- |
| P1.1 | CTA map: trial → `/activate`; sign-in → `/sign-in`; learn → `#features` |
| P1.2 | Shared MarketingHeader/Footer                                           |
| P1.3 | Home H1 = headline; or make `/` = marketing                             |
| P1.4 | Pricing period spacing                                                  |
| P1.5 | Success page: bookingId, next steps, fix double arrow                   |
| P1.6 | next-intl Link (locale-aware)                                           |
| P1.7 | Locale switcher                                                         |
| P1.8 | Server-side or middleware auth for dashboard (kill flash)               |

### Wave 2 — Brand redesign (2–3 days)

| ID   | Fix                                                  |
| ---- | ---------------------------------------------------- |
| P2.1 | Tokens: deep teal-emerald primary + warm gold accent |
| P2.2 | Plus Jakarta Sans (ID/EN) + Cairo applied (AR)       |
| P2.3 | BrandMark component                                  |
| P2.4 | Marketing imagery + trust badges                     |
| P2.5 | Public book package hero + sticky price              |
| P2.6 | Semantic success tokens (no hardcoded green-600)     |

### Wave 3 — Authenticated dashboard audit

- Needs admin credentials / seed user
- Shell density, tables, forms, RTL, license page

---

## 4. Brand direction (Umrah travel agent SaaS)

**Tone:** trustworthy, modern, devout-professional (operators, not pilgrims as SaaS buyers)

| Token          | Direction                                |
| -------------- | ---------------------------------------- |
| `--primary`    | Deep teal-emerald `oklch(0.42 0.09 165)` |
| `--accent`     | Warm gold/sand `oklch(0.78 0.09 85)`     |
| `--background` | Soft warm off-white                      |
| Fonts          | Plus Jakarta (ID/EN) + Cairo (AR)        |

**Avoid:** purple SaaS gradients, pure black primary, mosque clipart spam.

---

## 5. Product decision (highest leverage)

| Surface                         | Role               |
| ------------------------------- | ------------------ |
| Marketing (`/` or `/marketing`) | Real home / funnel |
| `/activate`                     | Real trial entry   |
| `/sign-in`                      | Admin-only         |
| Seeded public package           | Booking demo works |

**Do not paint buttons teal until Wave 0 i18n/metadata is fixed.**

---

## 6. Implementation checklist (agents)

### Wave 0

- [ ] P0.1 Metadata
- [ ] P0.3 Marketing namespace
- [ ] P0.2 Home feature keys
- [ ] P0.6 i18n key test
- [ ] Deploy + verify ID/EN/AR zero raw keys

### Wave 1

- [ ] `/` = marketing or redirect
- [ ] Remap trial CTAs → `/activate`
- [ ] Shared marketing shell
- [ ] Installer error/retry
- [ ] Book empty states + seed
- [ ] Success page fix
- [ ] Dashboard auth gate hardening

### Wave 2

- [ ] Design tokens + fonts + BrandMark
- [ ] Marketing visual polish
- [ ] Auth dashboard visual audit

### Verification each wave

- [ ] `pnpm check`, `pnpm lint`
- [ ] Manual ID + EN + AR RTL spot-check
- [ ] Grep a11y snapshot for raw keys: `common\.|marketing\.features\.`

---

## 7. Ruthless summary

| Surface          | Grade  | One-line                                       |
| ---------------- | ------ | ---------------------------------------------- |
| Home             | **F**  | Raw keys + wrong H1 + dead CTAs                |
| Marketing        | **D+** | Body OK; chrome broken i18n                    |
| Sign-in          | **C**  | Works; generic; funnel lie if trial lands here |
| Installer        | **D**  | Stuck loading                                  |
| Activate         | **C-** | Functional skeleton                            |
| Book             | **F**  | No package data                                |
| Success          | **D**  | Thin confirmation                              |
| Dashboard unauth | **D**  | Flash of shell before redirect                 |
| Design system    | **D**  | Default zinc + unused Cairo                    |

---

## Sources

- Playwright production screenshots under `.playwright-mcp/rihla-screenshots/`
- A11y snapshots `.playwright-mcp/page-*.yml`
- Source: `apps/app/src/app/**`, `apps/app/messages/{id,en,ar}.json`, `globals.css`
- Visual-engineering synthesis (session `ses_06da10171ffeNt6qm1uG7LwAG7`)

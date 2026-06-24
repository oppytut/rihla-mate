# Rihla Mate — Development Plan (Self-Hosted Edition)

> **Version**: 2.0 | **Date**: 2026-06-24 | **Status**: Draft
> **Model**: Self-hosted installer (like WordPress) + license key enforcement

---

## Executive Summary

**Rihla Mate** adalah platform white-label travel Umrah self-hosted. Setiap travel agent men-deploy aplikasi ini di server mereka sendiri (Docker Compose), mendapatkan landing page branded lengkap dengan template pilihan, dashboard admin, dan booking engine. Lisensi dikelola melalui license server terpusat yang Anda (Rihla Mate) host.

**Prinsip kunci**: Satu install = satu travel agent. Tidak ada multi-tenant shared infrastructure.

---

## Tech Stack

### App Utama (Di Server Travel Agent)

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | SSR/ISR hybrid, SEO built-in, React untuk dashboard |
| **Language** | TypeScript (strict) | Type safety untuk production |
| **Styling** | Tailwind CSS v4 + shadcn/ui | CSS variables theming, copy-paste components |
| **Database** | PostgreSQL (Docker container) | Zero external dependency, reliable |
| **ORM** | Drizzle ORM | Type-safe, lightweight, SQL-first |
| **Auth** | Better Auth | Email/password + Google OAuth, RBAC |
| **API Layer** | tRPC v11 | End-to-end type safety |
| **License Signing** | Ed25519 (`@noble/ed25519`) | Offline verification, same key pair as license server |
| **Background Jobs** | Next.js `instrumentation.ts` | Check-in scheduler, no extra dependency |
| **Email** | Resend | Booking confirmation, per-agent sender |
| **Storage** | Local filesystem (default) / S3 (optional) | Self-hosted friendly, S3 for scale |
| **Cache** | LRU cache (default) / Redis (optional) | Zero-dependency default, Redis for scale |
| **CMS** | Payload CMS (embedded) | Content editing, admin UI built-in |
| **Payments** | Midtrans (Indonesia) | GoPay, OVO, Dana, QRIS |

### License Server (Anda yang Host)

| Layer | Technology | Rationale |
|---|---|---|
| **Framework** | Hono | Ringan (14KB), REST API, edge-native |
| **Runtime** | Node.js 22 | Production stability |
| **Database** | PostgreSQL (Neon serverless) | Relational integrity, low traffic |
| **ORM** | Drizzle ORM | Shared types with app, same ecosystem |
| **Signing** | Ed25519 (`@noble/ed25519`) | Same library as app — shared key pair |
| **Rate Limit** | Upstash Redis | Per-license rate limiting |
| **Email** | Resend | Activation confirmation, expiry warning |
| **Hosting** | Vercel ($0 hobby) or Railway ($5/mo) | Low traffic — check-in 1x/hari per tenant |
| **Monitoring** | BetterStack ($0 tier) | Uptime monitoring, alert |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    RIHLA MATE ECOSYSTEM                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────┐      ┌──────────────────────────┐   │
│  │   LICENSE SERVER         │      │   RIHLA MATE APP          │   │
│  │   (Anda host di Vercel)  │◄─────│   (Server travel agent)   │   │
│  │                          │      │                           │   │
│  │   Hono REST API          │      │   Next.js 16 App Router   │   │
│  │   POST /activate         │      │   ├── Landing page        │   │
│  │   POST /checkin          │      │   ├── Dashboard admin     │   │
│  │   POST /revoke           │      │   ├── Package management  │   │
│  │   GET /health            │      │   ├── Booking engine      │   │
│  │                          │      │   └── License enforcement │   │
│  └──────────┬───────────────┘      └────────────┬─────────────┘   │
│             │                                    │                 │
│             ▼                                    ▼                 │
│  ┌──────────────────────┐       ┌──────────────────────────────┐ │
│  │  PostgreSQL (Neon)   │       │  PostgreSQL (Docker container)│ │
│  │  • licenses          │       │  • packages, bookings        │ │
│  │  • customers         │       │  • customers, landing_pages  │ │
│  │  • activations       │       │  • users, settings           │ │
│  │  • checkins           │       │  • license state (file-based)│ │
│  └──────────────────────┘       └──────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  DEPLOYMENT (di server travel agent)                        │   │
│  │  docker-compose up -d                                       │   │
│  │  ├── rihla-mate app (Next.js)                               │   │
│  │  ├── postgres:16-alpine                                     │   │
│  │  ├── watchtower (auto-update)                               │   │
│  │  └── volumes: pgdata, uploads, license state                │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

### License Flow

```
1. Travel agent download docker-compose.yml + .env template
2. docker compose up -d → App starts in TRIAL mode (14 hari, full features)
3. Travel agent beli license → dapat license key via email
4. Buka installer wizard di http://server-ip:3000/activate
5. Masukkan license key → App verifies offline (Ed25519) + online activation
6. Domain binding: license terikat ke domain/IP server ini
7. Setiap 24 jam: app phone-home ke license server (POST /checkin)
8. Kalau license expired / revoked → grace period 7 hari → degrade ke starter
```

### License Key Format

```
RML1.<base64url(payload)>.<base64url(Ed25519 signature)>

Payload:
{
  licenseId: "lic_abc123",
  customerId: "cust_xyz",
  customerName: "PT Amanah Travel",
  plan: "pro",
  features: ["multi_tenant", "custom_domain", "white_label", "seo", "analytics"],
  maxTenants: 5,
  maxMonthlyBookings: 500,
  expiresAt: "2027-01-01T00:00:00Z",
  gracePeriodDays: 7,
  isTrial: false,
  trialDays: 14,
  apiUrl: "https://license.rihla-mate.com/api/v1"
}
```

---

## Project Structure

```
rihla-mate/
├── apps/
│   └── app/                          # Next.js app (self-hosted)
│       ├── src/
│       │   ├── app/
│       │   │   ├── [tenant]/         # Tenant landing pages (jika multi-tenant diaktifkan)
│       │   │   │   ├── (marketing)/  # Landing page routes
│       │   │   │   │   ├── page.tsx
│       │   │   │   │   ├── packages/
│       │   │   │   │   ├── about/
│       │   │   │   │   └── contact/
│       │   │   │   ├── (dashboard)/  # Tenant admin
│       │   │   │   └── layout.tsx
│       │   │   ├── (admin)/          # Super admin (license, system)
│       │   │   ├── activate/         # License activation wizard
│       │   │   ├── api/              # tRPC + REST API routes
│       │   │   ├── layout.tsx        # Root layout
│       │   │   └── page.tsx          # Landing / redirect
│       │   ├── lib/
│       │   │   ├── license/          # License enforcement module (SUDAH ADA)
│       │   │   │   ├── types.ts      # LicensePayload, LicensePlan, etc.
│       │   │   │   ├── crypto.ts     # Ed25519 sign/verify
│       │   │   │   ├── validator.ts  # Offline key validation
│       │   │   │   ├── guard.ts      # requireFeature(), checkAccess()
│       │   │   │   ├── schema.ts     # License state Zod schemas
│       │   │   │   ├── store.ts      # File-based persistence (.rihla-mate/license.json)
│       │   │   │   ├── checkin.ts    # Online check-in scheduler
│       │   │   │   ├── trial.ts      # Trial mode logic
│       │   │   │   └── index.ts      # Public API
│       │   │   ├── tenant/           # Tenant resolution (SUDAH ADA)
│       │   │   │   ├── types.ts
│       │   │   │   ├── resolver.ts
│       │   │   │   ├── registry.ts
│       │   │   │   └── index.ts
│       │   │   ├── db/               # Drizzle schema + client
│       │   │   │   ├── schema/
│       │   │   │   │   ├── tenants.ts
│       │   │   │   │   ├── users.ts
│       │   │   │   │   ├── packages.ts
│       │   │   │   │   ├── bookings.ts
│       │   │   │   │   └── pages.ts
│       │   │   │   ├── client.ts
│       │   │   │   └── migrate.ts
│       │   │   ├── auth/             # Better Auth config
│       │   │   ├── seo/              # SEO utilities (SUDAH ADA)
│       │   │   └── installer/        # Installer wizard logic
│       │   ├── instrumentation.ts    # Background check-in scheduler
│       │   └── middleware.ts         # License + tenant middleware
│       ├── templates/                # Landing page template files
│       │   ├── modern/
│       │   ├── classic/
│       │   ├── minimal/
│       │   └── islamic/
│       ├── docker-compose.yml        # Production deployment
│       ├── docker-compose.dev.yml    # Development
│       ├── Dockerfile                # Multi-stage build
│       ├── .env.example             # Template untuk customer
│       └── package.json
│
├── packages/
│   └── shared/                       # Types shared with license server
│       ├── src/
│       │   ├── license-types.ts      # LicensePayload, Plan, Feature flags
│       │   └── index.ts
│       └── package.json
│
├── license-server/                   # License server (repo terpisah, atau monorepo package)
│   ├── src/
│   │   ├── index.ts                  # Hono app entry
│   │   ├── routes/
│   │   │   ├── activate.ts           # POST /api/v1/activate
│   │   │   ├── checkin.ts            # POST /api/v1/checkin
│   │   │   ├── revoke.ts             # POST /api/v1/revoke
│   │   │   └── health.ts             # GET /api/v1/health
│   │   ├── lib/
│   │   │   ├── signing.ts            # Ed25519 sign/verify
│   │   │   ├── keygen.ts             # License key generation CLI
│   │   │   └── db.ts                 # Drizzle client
│   │   ├── db/
│   │   │   └── schema.ts             # Drizzle schema (licenses, customers, activations, checkins)
│   │   └── middleware/
│   │       ├── auth.ts               # API key validation
│   │       └── rate-limit.ts         # Upstash rate limiter
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── install.md                    # Panduan instalasi untuk customer
│   ├── license.md                    # Dokumentasi sistem lisensi
│   └── architecture.md               # Arsitektur teknis
│
├── scripts/
│   ├── keygen.ts                     # Generate license key
│   └── build-release.sh             # Build Docker image + release
│
└── turbo.json                        # Turborepo config (opsional)
```

---

## Database Schema (App Utama)

```sql
-- =============================================
-- TENANTS (jika fitur multi-tenant diaktifkan)
-- Single-tenant install: tabel ini hanya punya 1 row
-- =============================================
CREATE TABLE tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug            VARCHAR(100) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    domain          VARCHAR(255) UNIQUE,
    branding        JSONB NOT NULL DEFAULT '{}',
    seo_defaults    JSONB NOT NULL DEFAULT '{}',
    contact         JSONB NOT NULL DEFAULT '{}',
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    plan            VARCHAR(50) NOT NULL DEFAULT 'starter',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- USERS (admin + staff travel agent)
-- =============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(50) NOT NULL DEFAULT 'staff',
    -- 'owner', 'admin', 'staff'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- UMRAH PACKAGES
-- =============================================
CREATE TABLE packages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           VARCHAR(255) NOT NULL,
    slug            VARCHAR(255) NOT NULL UNIQUE,
    description     TEXT,
    duration_days   INTEGER NOT NULL,
    price           DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'IDR',
    itinerary       JSONB NOT NULL DEFAULT '[]',
    inclusions      JSONB NOT NULL DEFAULT '[]',
    exclusions      JSONB NOT NULL DEFAULT '[]',
    departure_city  VARCHAR(100),
    available_dates JSONB NOT NULL DEFAULT '[]',
    featured_image  TEXT,
    gallery         JSONB NOT NULL DEFAULT '[]',
    category        VARCHAR(50) NOT NULL DEFAULT 'standard',
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    -- 'draft', 'published', 'archived'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_category ON packages(category);

-- =============================================
-- BOOKINGS
-- =============================================
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID NOT NULL REFERENCES packages(id),
    customer_name   VARCHAR(255) NOT NULL,
    customer_email  VARCHAR(255),
    customer_phone  VARCHAR(50),
    travelers       INTEGER NOT NULL DEFAULT 1,
    total_price     DECIMAL(12,2) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    -- 'pending', 'confirmed', 'paid', 'cancelled'
    payment_ref     VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================
-- LANDING PAGES
-- =============================================
CREATE TABLE landing_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id     VARCHAR(100) NOT NULL,
    slug            VARCHAR(255) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         JSONB NOT NULL DEFAULT '{}',
    seo             JSONB NOT NULL DEFAULT '{}',
    is_published    BOOLEAN NOT NULL DEFAULT false,
    is_homepage     BOOLEAN NOT NULL DEFAULT false,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(slug)
);

-- =============================================
-- MEDIA ASSETS (local filesystem backed)
-- =============================================
CREATE TABLE media (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename        VARCHAR(255) NOT NULL,
    original_name   VARCHAR(255) NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,
    size_bytes      INTEGER NOT NULL,
    alt_text        TEXT,
    width           INTEGER,
    height          INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- SYSTEM SETTINGS (key-value, termasuk license state)
-- =============================================
CREATE TABLE settings (
    key             VARCHAR(255) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Development Phases

### Phase 0: Foundation (Week 1)
**Goal**: Project scaffold, core infrastructure, license module completion

- [ ] Set up monorepo structure (Next.js app + shared packages)
- [ ] Configure Tailwind CSS v4 + shadcn/ui
- [ ] Set up Drizzle ORM + PostgreSQL schema
- [ ] Configure Better Auth (email/password)
- [ ] **Complete license module** (based on existing code):
  - [ ] `store.ts` — File-based persistence (`~/.rihla-mate/license.json`)
  - [ ] `checkin.ts` — Online check-in scheduler (Next.js instrumentation)
  - [ ] `trial.ts` — Trial mode: 14 hari, instanceId binding (hardware hash)
  - [ ] `guard.ts` — Feature-gating: `requireFeature()`, `checkAccess()`
- [ ] Set up middleware for license check (redirect to /activate if unlicensed)
- [ ] Set up ESLint, Prettier, TypeScript strict
- [ ] Create Docker Compose for development (`docker-compose.dev.yml`)
- [ ] Create `.env.example` template

### Phase 1: Installer & Activation Wizard (Week 2)
**Goal**: Customer bisa deploy, aktivasi license, setup awal

- [ ] **Docker Compose production** (`docker-compose.yml`)
  - App + PostgreSQL + Watchtower
  - Named volumes untuk data persistence
  - Health checks
- [ ] **Dockerfile** (multi-stage build)
- [ ] **Installer wizard UI** (`/activate`)
  - Step 1: System check (DB connection, disk space, Node version)
  - Step 2: Database setup (migration)
  - Step 3: Admin account creation
  - Step 4: License activation (key input → offline verify → online activate)
  - Step 5: Initial branding (agency name, logo, colors)
- [ ] **License activation flow**:
  - Trial mode auto-start (14 hari, no key needed)
  - Key input → Ed25519 offline verify → POST /activate online
  - Domain binding: simpan instanceId + domain di license server
  - Error handling: invalid key, already used, expired
- [ ] **Post-activation redirect**: langsung ke dashboard admin
- [ ] **ZIP archive** untuk shared hosting (non-Docker)

### Phase 2: Landing Pages & Templates (Weeks 3-5)
**Goal**: 3 landing page templates, content management, SEO

- [ ] **3 landing page templates**:
  - **Modern** — Clean, bold typography, full-width hero
  - **Classic** — Traditional travel agency look, card-based
  - **Islamic** — RTL support, Islamic motifs, Arabic typography
  - Each: Hero, Features, Packages showcase, Testimonials, CTA, Footer
  - Mobile-responsive, Tailwind responsive utilities
- [ ] **Template selection + content editing** (admin dashboard)
- [ ] **Payload CMS integration** untuk content management
- [ ] **Umrah package CRUD** (tRPC API + admin UI)
- [ ] **Package listing page** (filterable, searchable)
- [ ] **Package detail page** (itinerary, inclusions, pricing)
- [ ] **Inquiry/Contact form** (lead capture)
- [ ] **SEO implementation**:
  - `generateMetadata()` dynamic
  - Structured data: `TravelAgency`, `TouristTrip`
  - Dynamic sitemap + robots.txt
  - OpenGraph images
  - Canonical URLs
- [ ] **Branding settings**: logo, favicon, colors, fonts (CSS variables)

### Phase 3: Booking Engine (Weeks 6-8)
**Goal**: End-to-end booking flow with payment

- [ ] **Booking flow UI** (step-by-step wizard):
  - Date selection (available departure dates)
  - Traveler details (name, email, phone, passport)
  - Review & confirm
  - Payment
- [ ] **Midtrans integration**:
  - Snap popup/redirect
  - Payment channels: GoPay, OVO, Dana, QRIS, bank transfer
  - Webhook handler for payment status
- [ ] **Booking confirmation email** (Resend, branded sender)
- [ ] **Booking management** (admin views/manages bookings)
- [ ] **Availability tracking** (seat count per departure date)
- [ ] **Booking status workflow**: pending → confirmed → paid → completed / cancelled

### Phase 4: Admin Dashboard & Polish (Weeks 9-11)
**Goal**: Complete admin experience, analytics, multi-tenant (opsional)

- [ ] **Admin dashboard home**: stats (bookings, revenue, page views)
- [ ] **Package management**: CRUD with image upload, availability calendar
- [ ] **Booking management**: list, filter, detail, status update
- [ ] **Customer management**: CRM lite (contact history, booking history)
- [ ] **Media library**: upload, crop, alt text
- [ ] **Landing page editor**: template switch, section reorder, content edit
- [ ] **SEO settings per page**: title, description, OG image
- [ ] **Analytics**: basic dashboard (page views, conversion rate)
- [ ] **License management page**: status, expiry, check-in history
- [ ] **Update notification**: check latest version, notify admin

### Phase 5: Multi-Tenant & Scale (Weeks 12-14)
**Goal**: Optional multi-tenant, i18n, performance

- [ ] **Multi-tenant support** (pro/enterprise plans):
  - Subdomain routing (`agency.domain.com`)
  - Per-tenant branding (CSS variables)
  - Per-tenant packages + bookings
  - Tenant admin isolation
- [ ] **Multi-language**: ID, EN, AR with RTL support
- [ ] **Hreflang tags** per language
- [ ] **Performance optimization**:
  - ISR on landing pages (`revalidate: 3600`)
  - Image optimization (WebP/AVIF via Next.js Image)
  - Bundle analysis + code splitting
- [ ] **Security audit**:
  - OWASP top 10 check
  - CSRF protection
  - Rate limiting
  - Input validation (Zod)
  - Secure headers (CSP, HSTS)
- [ ] **Nusuk API integration** (regulatory, if API available)
- [ ] **Documentation**: install guide, admin guide, FAQ
- [ ] **Template marketplace** (6+ templates)

---

## License Server Development (Parallel Track)

**Timeline**: 1-2 weeks, can run in parallel with Phase 0-1

- [ ] Initialize Hono project
- [ ] Drizzle schema: `licenses`, `customers`, `activations`, `checkins`, `domain_changes`
- [ ] `POST /api/v1/activate` — validate key, bind domain, return activation result
- [ ] `POST /api/v1/checkin` — receive heartbeat, check status, return updated payload
- [ ] `POST /api/v1/revoke` — admin revoke license
- [ ] `GET /api/v1/health` — health check
- [ ] API key middleware for internal auth
- [ ] Upstash Redis rate limiting
- [ ] Key generation CLI script (`npm run keygen`)
- [ ] Deploy to Vercel (hobby) or Railway
- [ ] Email notifications (Resend): activation success, expiry warning, usage alert

---

## SEO Implementation Checklist

- [ ] `generateMetadata()` on ALL pages
- [ ] Structured data: `TravelAgency`, `TouristTrip` (schema.org)
- [ ] Dynamic sitemap (`/sitemap.xml`)
- [ ] Dynamic robots.txt (`/robots.txt`)
- [ ] Canonical URLs
- [ ] OpenGraph images per page
- [ ] Hreflang tags (when i18n is active)
- [ ] ISR with `revalidate: 3600` on landing pages
- [ ] On-demand revalidation on content update
- [ ] Breadcrumb structured data
- [ ] FAQ structured data on package pages

## Mobile-First Requirements

- [ ] All templates use mobile-first CSS (`md:`, `lg:` breakpoints)
- [ ] Touch targets ≥ 44×44px
- [ ] Responsive images via Next.js `<Image>` + WebP/AVIF
- [ ] Booking flow: step-by-step wizard (not single-page form)
- [ ] Mobile payment: GoPay, OVO, Dana, QRIS (via Midtrans)
- [ ] Performance budget: LCP < 2.5s on 3G
- [ ] Swipeable package carousels
- [ ] Bottom sheet for filters on mobile

## Security Requirements

- [ ] License enforcement on all admin routes (middleware)
- [ ] License key stored encrypted at rest (file-based)
- [ ] CSRF protection
- [ ] Rate limiting per IP
- [ ] Input validation (Zod schemas)
- [ ] Secure headers (CSP, HSTS, X-Frame-Options)
- [ ] Audit logging for sensitive operations
- [ ] No hardcoded secrets (all from env vars)

---

## Key Decisions Pending User Confirmation

1. **Booking vs Marketing first?**
   - Recommendation: Start with landing page + inquiry (Phase 1-2), add booking in Phase 3

2. **Subdomain or full custom domain?**
   - Self-hosted model: travel agent brings their own domain, DNS pointing to their server
   - Recommendation: Support both — default IP-based access, optional custom domain via nginx/Caddy

3. **Bahasa Indonesia only, or multi-language?**
   - Recommendation: Indonesian-first for MVP, add EN/AR in Phase 5

4. **Nusuk API integration needed?**
   - Nusuk is Saudi government portal for Umrah permits
   - Recommendation: Research API availability, plan for Phase 5. Manual booking flow as fallback

5. **Target tenant count in first year?**
   - Affects: license server sizing, support capacity, documentation depth
   - Recommendation: Target 10-20 paying tenants for year 1

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Customer can't install Docker | High | Medium | Provide ZIP archive for shared hosting + detailed install docs |
| License server downtime | High | Low | Grace period 7 hari, offline fallback, BetterStack monitoring |
| Customer reverse-engineers license check | Medium | Medium | Obfuscation + server-side validation + legal contract. Cukup untuk pasar travel agent Indonesia |
| Midtrans integration complexity | Medium | Medium | Launch with bank transfer only, add e-wallet later |
| Nusuk API unavailable/unstable | High | Unknown | Research early, manual booking as fallback |
| PostgreSQL in Docker data loss | Critical | Low | Named volumes, backup docs, auto-backup script |
| Scope creep (booking engine too early) | High | Medium | Strictly scope Phase 1-2 as marketing only |
| Template system over-engineering | High | Medium | Start with 3 hardcoded templates, add CMS in Phase 4 |

---

## Deployment (Customer Side)

### Quick Start (Docker)

```bash
# 1. Download files
curl -O https://releases.rihla-mate.com/latest/docker-compose.yml
curl -O https://releases.rihla-mate.com/latest/.env.example
cp .env.example .env
# Edit .env: set DB_PASSWORD

# 2. Start
docker compose up -d

# 3. Open browser
# http://<server-ip>:3000 → Installer wizard
```

### What Customer Gets

```
rihla-mate/
├── docker-compose.yml      # Production stack
├── .env.example            # Configuration template
├── install.sh              # One-command install script
└── README.md               # Quick start guide
```

### Docker Compose Services

| Service | Image | Purpose |
|---|---|---|
| `app` | `ghcr.io/rihlamate/rihla-mate:latest` | Next.js application |
| `db` | `postgres:16-alpine` | Database |
| `watchtower` | `containrrr/watchtower` | Auto-update app container |

---

## Confirmed Decisions (2026-06-24)

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Phase Priority | **Marketing-first** | Landing page + inquiry dulu, booking engine Phase 3 |
| 2 | Domain Model | **Custom domain** | Agent bawa domain sendiri, lebih profesional |
| 3 | Default Language | **Bilingual (ID + EN)** | 🇮🇩 Indonesia primary, 🇬🇧 English built-in from start |
| 4 | Nusuk API | **Research later** | Research selama Phase 1-2, integrasi Phase 3 |
| 5 | Target Scale | **10-20 tenants** | Realistis untuk tahun pertama, arsitektur scale-ready |

### Impact on Plan

- **Bilingual requirement**: All UI strings use i18n from Phase 0. Use `next-intl` (App Router native). Templates support RTL-ready layout. Dashboard and landing pages ship in ID + EN.
- **Custom domain**: Installer wizard includes domain setup step. License binding uses the custom domain (not subdomain). No subdomain routing needed on our side — simplifies middleware.
- **Marketing-first**: Phase 1-2 focus exclusively on landing pages + inquiry. No booking engine code in early phases. Template library is the priority deliverable.

## Next Steps

1. ~~Confirm 5 key decisions with user~~ ✅ Done 2026-06-24
2. Set up license server (Hono + Drizzle + Vercel)
3. Complete license module in app (checkin, trial, store)
4. Build installer wizard
5. Start Phase 0 development

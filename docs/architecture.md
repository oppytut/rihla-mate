# Arsitektur Teknis Rihla Mate

Dokumen ini menjelaskan arsitektur teknis Rihla Mate untuk developer yang bergabung dengan project.

---

## Daftar Isi

1. [High-Level Architecture](#high-level-architecture)
2. [Komponen Sistem](#komponen-sistem)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Tech Stack](#tech-stack)
5. [Directory Structure](#directory-structure)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [Deployment Architecture](#deployment-architecture)
9. [Security Model](#security-model)
10. [Multi-Tenant Architecture](#multi-tenant-architecture)
11. [Performance Considerations](#performance-considerations)
12. [Monitoring dan Observability](#monitoring-dan-observability)
13. [Development Workflow](#development-workflow)
14. [Future Roadmap](#future-roadmap)

---

## High-Level Architecture

Rihla Mate adalah platform white-label travel Umrah dengan model self-hosted. Setiap travel agent men-deploy aplikasi di server mereka sendiri.

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

### Prinsip Arsitektur

1. **Single Tenant per Install**: Satu deployment = satu travel agent
2. **Offline-First License**: Verifikasi signature secara lokal
3. **Zero External Dependencies**: Semua komponen bisa berjalan dalam satu Docker Compose
4. **Scale-Ready**: Arsitektur mendukung scale-up dengan Redis dan S3

---

## Komponen Sistem

### Rihla Mate App

Aplikasi utama yang di-deploy di server travel agent.

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| Landing Page | Next.js SSR | Halaman publik untuk marketing |
| Dashboard Admin | Next.js CSR | Interface untuk manage packages dan bookings |
| Package Management | tRPC + Drizzle | CRUD paket Umrah |
| Booking Engine | tRPC + Midtrans | Flow booking dan payment |
| License Module | Ed25519 | Enforcement lisensi |
| Auth | Better Auth | Autentikasi dan RBAC |

### License Server

Server terpusat yang di-host oleh Rihla Mate.

| Komponen | Teknologi | Fungsi |
|----------|-----------|--------|
| REST API | Hono | Endpoint untuk aktivasi dan check-in |
| Database | PostgreSQL (Neon) | Menyimpan data lisensi |
| Rate Limiter | Upstash Redis | Membatasi request per license |
| Email | Resend | Notifikasi aktivasi dan expiry |

---

## Data Flow Diagrams

### License Activation Flow

```
┌──────────┐     1. Input License Key      ┌──────────────┐
│  User    │──────────────────────────────►│  App UI      │
│          │                                │  (/activate) │
└──────────┘                                └──────┬───────┘
                                                   │
                     2. Parse & Verify Signature   │
                                                   ▼
                                            ┌──────────────┐
                                            │ License      │
                                            │ Module       │
                                            │ (Ed25519)    │
                                            └──────┬───────┘
                                                   │
                     3. POST /activate             │
                                                   ▼
                                            ┌──────────────┐
                                            │ License      │
                                            │ Server       │
                                            └──────┬───────┘
                                                   │
                     4. Validate & Bind Domain     │
                                                   ▼
                                            ┌──────────────┐
                                            │ PostgreSQL   │
                                            │ (Neon)       │
                                            └──────────────┘
                                                   │
                     5. Return Status              │
                                                   ▼
┌──────────┐     6. License Activated       ┌──────────────┐
│  User    │◄───────────────────────────────│  App UI      │
└──────────┘                                └──────────────┘
```

### Check-in Flow

```
┌──────────────┐                              ┌──────────────┐
│ Next.js      │   Every 24 hours             │ License      │
│ Instrument   │─────────────────────────────►│ Server       │
│ (Scheduler)  │   POST /checkin              │              │
└──────────────┘                              └──────┬───────┘
                                                     │
                     Check license status            │
                                                     ▼
                                              ┌──────────────┐
                                              │ PostgreSQL   │
                                              │ (Neon)       │
                                              └──────┬───────┘
                                                     │
                     Return updated payload          │
                                                     ▼
┌──────────────┐                              ┌──────────────┐
│ App          │◄─────────────────────────────│ License      │
│ State Store  │   Update local state         │ Server       │
└──────────────┘                              └──────────────┘
```

### Booking Flow

```
┌──────────┐     1. Select Package          ┌──────────────┐
│ Customer │───────────────────────────────►│ Landing Page │
│          │                                │              │
└──────────┘                                └──────┬───────┘
                                                   │
                     2. Fill Traveler Details      │
                                                   ▼
                                            ┌──────────────┐
                                            │ Booking Form │
                                            │ (Step Wizard)│
                                            └──────┬───────┘
                                                   │
                     3. Submit Booking             │
                                                   ▼
                                            ┌──────────────┐
                                            │ tRPC API     │
                                            │              │
                                            └──────┬───────┘
                                                   │
                     4. Create Booking Record      │
                                                   ▼
                                            ┌──────────────┐
                                            │ PostgreSQL   │
                                            │ (bookings)   │
                                            └──────┬───────┘
                                                   │
                     5. Redirect to Payment        │
                                                   ▼
                                            ┌──────────────┐
                                            │ Midtrans     │
                                            │ Snap         │
                                            └──────┬───────┘
                                                   │
                     6. Payment Complete           │
                                                   ▼
                                            ┌──────────────┐
                                            │ Webhook      │
                                            │ Handler      │
                                            └──────┬───────┘
                                                   │
                     7. Update Booking Status      │
                                                   ▼
                                            ┌──────────────┐
                                            │ PostgreSQL   │
                                            └──────┬───────┘
                                                   │
                     8. Send Confirmation Email    │
                                                   ▼
                                            ┌──────────────┐
                                            │ Resend       │
                                            └──────────────┘
```

---

## Tech Stack

### App Utama (Di Server Travel Agent)

| Layer | Technology | Rationale |
|-------|------------|-----------|
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

### License Server (Hosted oleh Rihla Mate)

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Framework** | Hono | Ringan (14KB), REST API, edge-native |
| **Runtime** | Node.js 22 | Production stability |
| **Database** | PostgreSQL (Neon serverless) | Relational integrity, low traffic |
| **ORM** | Drizzle ORM | Shared types with app, same ecosystem |
| **Signing** | Ed25519 (`@noble/ed25519`) | Same library as app, shared key pair |
| **Rate Limit** | Upstash Redis | Per-license rate limiting |
| **Email** | Resend | Activation confirmation, expiry warning |
| **Hosting** | Vercel ($0 hobby) or Railway ($5/mo) | Low traffic, check-in 1x/hari per tenant |
| **Monitoring** | BetterStack ($0 tier) | Uptime monitoring, alert |

---

## Directory Structure

```
rihla-mate/
├── apps/
│   └── app/                          # Next.js app (self-hosted)
│       ├── src/
│       │   ├── app/
│       │   │   ├── [tenant]/         # Tenant landing pages (multi-tenant)
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
│       │   │   ├── license/          # License enforcement module
│       │   │   │   ├── types.ts      # LicensePayload, LicensePlan, etc.
│       │   │   │   ├── crypto.ts     # Ed25519 sign/verify
│       │   │   │   ├── validator.ts  # Offline key validation
│       │   │   │   ├── guard.ts      # requireFeature(), checkAccess()
│       │   │   │   ├── schema.ts     # License state Zod schemas
│       │   │   │   ├── store.ts      # File-based persistence
│       │   │   │   ├── checkin.ts    # Online check-in scheduler
│       │   │   │   ├── trial.ts      # Trial mode logic
│       │   │   │   └── index.ts      # Public API
│       │   │   ├── tenant/           # Tenant resolution
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
│       │   │   ├── seo/              # SEO utilities
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
├── license-server/                   # License server
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
│   │   │   └── schema.ts             # Drizzle schema
│   │   └── middleware/
│   │       ├── auth.ts               # API key validation
│   │       └── rate-limit.ts         # Upstash rate limiter
│   ├── drizzle.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── install.md                    # Panduan instalasi
│   ├── license.md                    # Dokumentasi lisensi
│   └── architecture.md               # Arsitektur teknis
│
├── scripts/
│   ├── keygen.ts                     # Generate license key
│   └── build-release.sh             # Build Docker image + release
│
└── turbo.json                        # Turborepo config
```

---

## Database Schema

### App Utama

#### Table: tenants

```sql
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
```

Untuk single-tenant, tabel ini hanya berisi satu row.

#### Table: users

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(50) NOT NULL DEFAULT 'staff',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Role: `owner`, `admin`, `staff`.

#### Table: packages

```sql
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
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_category ON packages(category);
```

Status: `draft`, `published`, `archived`.

#### Table: bookings

```sql
CREATE TABLE bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id      UUID NOT NULL REFERENCES packages(id),
    customer_name   VARCHAR(255) NOT NULL,
    customer_email  VARCHAR(255),
    customer_phone  VARCHAR(50),
    travelers       INTEGER NOT NULL DEFAULT 1,
    total_price     DECIMAL(12,2) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'pending',
    payment_ref     VARCHAR(255),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_status ON bookings(status);
```

Status: `pending`, `confirmed`, `paid`, `cancelled`.

#### Table: landing_pages

```sql
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
```

#### Table: media

```sql
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
```

#### Table: settings

```sql
CREATE TABLE settings (
    key             VARCHAR(255) PRIMARY KEY,
    value           JSONB NOT NULL,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Key-value store untuk konfigurasi sistem termasuk license state.

### License Server

#### Table: licenses

```sql
CREATE TABLE licenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key     VARCHAR(255) NOT NULL UNIQUE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    plan            VARCHAR(50) NOT NULL,
    features        JSONB NOT NULL DEFAULT '[]',
    max_tenants     INTEGER DEFAULT 1,
    max_bookings    INTEGER,
    expires_at      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

#### Table: activations

```sql
CREATE TABLE activations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id      UUID NOT NULL REFERENCES licenses(id),
    instance_id     VARCHAR(255) NOT NULL,
    domain          VARCHAR(255),
    ip_address      VARCHAR(50),
    activated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_checkin    TIMESTAMPTZ
);
```

---

## API Endpoints

### License Server REST API

Base URL: `https://license.rihla-mate.com/api/v1`

#### POST /activate

Mengaktivasi license key.

**Request:**

```json
{
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "ipAddress": "103.xxx.xxx.xxx"
}
```

**Response:**

```json
{
  "status": "success",
  "license": {
    "licenseId": "lic_abc123",
    "plan": "pro",
    "features": ["multi_tenant", "custom_domain"],
    "expiresAt": "2027-01-01T00:00:00Z"
  }
}
```

#### POST /checkin

Check-in periodik untuk validasi status license.

**Request:**

```json
{
  "licenseId": "lic_abc123",
  "instanceId": "inst_xyz",
  "domain": "travelanda.com",
  "version": "1.0.0",
  "timestamp": "2026-06-24T10:00:00Z"
}
```

**Response:**

```json
{
  "status": "active",
  "expiresAt": "2027-01-01T00:00:00Z",
  "features": ["multi_tenant", "custom_domain"]
}
```

#### POST /revoke

Mencabut license (admin only).

**Request:**

```json
{
  "licenseId": "lic_abc123",
  "reason": "Payment failed"
}
```

#### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2026-06-24T10:00:00Z"
}
```

### App Internal API (tRPC)

tRPC router tersedia di `/api/trpc`. Endpoints utama:

- `package.list` - Daftar paket
- `package.getById` - Detail paket
- `package.create` - Buat paket baru
- `package.update` - Update paket
- `package.delete` - Hapus paket
- `booking.list` - Daftar booking
- `booking.getById` - Detail booking
- `booking.create` - Buat booking baru
- `booking.updateStatus` - Update status booking

---

## Deployment Architecture

### Docker Compose Services

```yaml
services:
  app:
    image: ghcr.io/rihlamate/rihla-mate:latest
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://...
    depends_on:
      - db
    volumes:
      - uploads:/app/uploads
      - license-state:/app/.rihla-mate

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=rihla
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=rihla_mate
    volumes:
      - pgdata:/var/lib/postgresql/data

  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 300 app
```

### Volume Structure

| Volume | Path | Purpose |
|--------|------|---------|
| `pgdata` | `/var/lib/postgresql/data` | Database persistence |
| `uploads` | `/app/uploads` | Uploaded media files |
| `license-state` | `/app/.rihla-mate` | License state file |

---

## Security Model

### License Enforcement

License enforcement dilakukan via middleware:

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const licenseState = getLicenseState();
  
  if (!licenseState.isValid) {
    return NextResponse.redirect(new URL('/activate', request.url));
  }
  
  // Feature gating
  const requiredFeature = getRequiredFeature(request.nextUrl.pathname);
  if (requiredFeature && !licenseState.features.includes(requiredFeature)) {
    return NextResponse.redirect(new URL('/upgrade', request.url));
  }
}
```

### Ed25519 Signing

- Private key: Disimpan di license server dengan encryption at rest
- Public key: Embedded di aplikasi
- Verification: Dilakukan secara offline

### API Key Authentication

License server menggunakan API key untuk internal authentication:

```typescript
// middleware/auth.ts
app.use('*', async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
```

### Rate Limiting

Menggunakan Upstash Redis:

```typescript
// middleware/rate-limit.ts
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});

app.use('/api/v1/*', async (c, next) => {
  const { success } = await ratelimit.limit(c.req.header('X-License-Id'));
  if (!success) {
    return c.json({ error: 'Rate limit exceeded' }, 429);
  }
  await next();
});
```

---

## Multi-Tenant Architecture

Multi-tenant adalah fitur opsional untuk plan Pro dan Enterprise.

### Routing

```
https://travelanda.com/           → Default tenant (single-tenant)
https://travelanda.com/agent-a/   → Tenant: agent-a (multi-tenant)
https://travelanda.com/agent-b/   → Tenant: agent-b (multi-tenant)
```

### Tenant Resolution

```typescript
// lib/tenant/resolver.ts
export function resolveTenant(request: Request): Tenant | null {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length === 0) {
    return getDefaultTenant();
  }
  
  const tenantSlug = pathSegments[0];
  return getTenantBySlug(tenantSlug);
}
```

### Data Isolation

Setiap query database menyertakan filter tenant:

```typescript
// lib/db/queries/packages.ts
export async function getPackages(tenantId: string) {
  return db.select()
    .from(packages)
    .where(eq(packages.tenantId, tenantId));
}
```

---

## Performance Considerations

### ISR (Incremental Static Regeneration)

Landing pages menggunakan ISR untuk performa optimal:

```typescript
// app/[tenant]/page.tsx
export const revalidate = 3600; // 1 hour

export async function generateStaticParams() {
  const tenants = await getAllTenants();
  return tenants.map(t => ({ tenant: t.slug }));
}
```

### Image Optimization

Next.js Image component dengan WebP/AVIF:

```tsx
<Image
  src="/hero.jpg"
  alt="Umrah Package"
  width={1200}
  height={600}
  priority
/>
```

### Caching Strategy

| Layer | Strategy | TTL |
|-------|----------|-----|
| Landing pages | ISR | 1 hour |
| Package list | LRU Cache | 5 minutes |
| Package detail | LRU Cache | 5 minutes |
| Booking data | No cache | Real-time |

### Bundle Optimization

- Code splitting per route
- Dynamic imports untuk komponen berat
- Tree shaking untuk unused code

---

## Monitoring dan Observability

### BetterStack

- Uptime monitoring untuk license server
- Alert via Slack/Email jika downtime
- Response time tracking

### Health Checks

Docker Compose health checks:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Logging

- Structured logging dengan JSON format
- Log levels: `error`, `warn`, `info`, `debug`
- License-related events: activation, check-in, expiry warning

---

## Development Workflow

### Monorepo Structure

Menggunakan Turborepo untuk monorepo management:

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false
    },
    "lint": {
      "outputs": []
    }
  }
}
```

### Commands

```bash
# Install dependencies
pnpm install

# Run development
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Generate license key
pnpm run keygen
```

### Branch Strategy

- `main` - Production ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `hotfix/*` - Hotfix branches

---

## Future Roadmap

### Phase 1-2: Marketing Platform

- Landing page templates
- Package management
- Inquiry/lead capture
- SEO optimization

### Phase 3: Booking Engine

- Booking flow wizard
- Midtrans integration
- Email confirmations
- Availability tracking

### Phase 4: Admin & Analytics

- Admin dashboard
- Booking management
- Customer CRM
- Analytics dashboard

### Phase 5: Scale & Multi-Tenant

- Multi-tenant support
- i18n (ID, EN, AR)
- Performance optimization
- Security audit
- Template marketplace

### Future Considerations

- Nusuk API integration (regulatory compliance)
- Mobile app (React Native)
- API marketplace untuk third-party integrations
- White-label reseller program

---

*Dokumen ini terakhir diperbarui berdasarkan development plan Rihla Mate.*

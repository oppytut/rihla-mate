# Cloudflare Deployment — Rihla Mate

> Configuration and instructions for deploying the Next.js app to Cloudflare Pages (Workers) via `@opennextjs/cloudflare`.

## Prerequisites

1. Cloudflare account with Workers Paid plan (for R2, KV, Cron Triggers)
2. Neon PostgreSQL database (serverless Postgres compatible with `@neondatabase/serverless`)
3. Midtrans account (unchanged — uses REST API)
4. Resend account (unchanged — isomorphic SDK)
5. License server (unchanged — stays on VPS)

## Environment Variables

Set these in Cloudflare Pages dashboard → Settings → Environment Variables:

| Variable              | Source         | Notes                                          |
| --------------------- | -------------- | ---------------------------------------------- |
| `DATABASE_URL`        | Neon           | Use pooled connection string                   |
| `BETTER_AUTH_SECRET`  | Local          | Same as VPS                                    |
| `BETTER_AUTH_URL`     | Your CF domain | e.g. `https://rihla-mate.pages.dev`            |
| `LICENSE_PUBLIC_KEY`  | License server | Same as VPS                                    |
| `LICENSE_SERVER_URL`  | License server | VPS license server URL                         |
| `LICENSE_KEY`         | License server | Your license key                               |
| `MIDTRANS_SERVER_KEY` | Midtrans       | Same as VPS                                    |
| `MIDTRANS_CLIENT_KEY` | Midtrans       | Same as VPS                                    |
| `RESEND_API_KEY`      | Resend         | Same as VPS                                    |
| `STORAGE_DRIVER`      | Config         | Set to `s3` (local driver not available on CF) |
| `S3_ENDPOINT`         | S3 provider    | R2 or other S3-compatible                      |
| `S3_ACCESS_KEY`       | S3 provider    |                                                |
| `S3_SECRET_KEY`       | S3 provider    |                                                |
| `S3_BUCKET`           | S3 provider    |                                                |
| `S3_REGION`           | S3 provider    |                                                |

## R2 Bucket Setup

```bash
# Create the incremental cache bucket
npx wrangler r2 bucket create rihla-mate-opennext-cache

# Create a bucket for file uploads (replaces local volume)
npx wrangler r2 bucket create rihla-mate-uploads
```

## Build & Deploy

```bash
# Build for Cloudflare
pnpm build:cf

# Preview locally
pnpm preview:cf

# Deploy to Cloudflare
pnpm deploy:cf
```

Or deploy via CI: run `opennextjs-cloudflare build && opennextjs-cloudflare deploy`.

## Architecture Notes

### VPS + Cloudflare Dual Deployment

The app can run in two modes:

- **VPS (Docker Compose)**: Existing deployment with PostgreSQL via pg, local file storage, node:crypto
- **Cloudflare (Workers)**: Serverless deployment with Neon (serverless Postgres), R2 storage, Web Crypto

The license server **always stays on VPS** — both deployments phone-home to it.

### What Changes for Cloudflare

| Component       | VPS (unchanged)                         | Cloudflare                                      |
| --------------- | --------------------------------------- | ----------------------------------------------- |
| Database        | `pg` Pool + `drizzle-orm/node-postgres` | `@neondatabase/serverless` + `drizzle-orm/neon` |
| Payments        | `midtrans-client` SDK                   | Direct `fetch()` to Midtrans REST API           |
| Crypto          | `node:crypto`                           | Web Crypto API (`crypto.subtle`)                |
| Storage         | Local volume or S3                      | R2 only (S3-compatible)                         |
| Background jobs | `setInterval` + `process.on`            | Cloudflare Cron Triggers                        |
| Rate limiting   | In-memory Map                           | KV-based rate limiter                           |
| Auth cookies    | `next/headers` + `next/cookies`         | Web API `Request` headers                       |
| Environment     | `@t3-oss/env-nextjs`                    | `@t3-oss/env-core`                              |
| ISR cache       | Filesystem                              | R2 + KV                                         |

### Files That Need Cloudflare Variants

Files in `src/` that need a Cloudflare-specific version or adapter:

- `src/lib/db/client.ts` — Switch to `@neondatabase/serverless` import
- `src/lib/payment/midtrans.ts` — Replace SDK with fetch + Web Crypto
- `src/lib/license/store.ts` — Accept generic DB type instead of NodePgDatabase
- `src/lib/trpc/rate-limit.ts` — Replace `node:net.isIP()` with regex
- `src/lib/trpc/server.ts` — Replace `headers()` from `next/headers`
- `src/i18n/request.ts` — Replace `cookies()` from `next/headers`
- `src/instrumentation.ts` — Replace `setInterval` + `process.on` with Cron Trigger handler
- `src/lib/license/checkin.ts` — Replace `setTimeout` + `process.on`
- `src/env.ts` — Replace `@t3-oss/env-nextjs` with `@t3-oss/env-core`
- `src/lib/auth.ts` — Update drizzle adapter import path
- `src/lib/auth-client.ts` — May need base URL override
- `src/proxy.ts` — Edge middleware (already CF-compatible)
- `src/app/api/trpc/[trpc]/route.ts` — Already CF-compatible (uses `fetchRequestHandler`)

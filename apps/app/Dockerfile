# =============================================
# Stage 1: Dependencies (cached via pnpm fetch)
# =============================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy lockfile first for pnpm fetch caching
COPY pnpm-lock.yaml ./
RUN pnpm fetch

# Copy workspace config and package manifests
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY apps/app/package.json ./apps/app/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies from the store (offline, frozen lockfile)
RUN pnpm install --offline --frozen-lockfile

# =============================================
# Stage 2: Builder
# =============================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy installed dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy full source tree
COPY . .

# Build shared package (no-op if no build script, needed for TypeScript resolution)
RUN pnpm --filter @rihla-mate/shared build 2>/dev/null || true

# Build the Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @rihla-mate/app build

# =============================================
# Stage 3: Runner (minimal production image)
# =============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output (bundles all needed node_modules)
COPY --from=builder /app/apps/app/.next/standalone ./

# Copy static assets required by the standalone server
COPY --from=builder /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder /app/apps/app/public ./apps/app/public

# Create directories for uploads and license state
RUN mkdir -p /app/uploads /app/.rihla-mate && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "apps/app/server.js"]

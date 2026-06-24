# =============================================
# Stage 1: Dependencies
# =============================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace config
COPY package.json ./
COPY apps/app/package.json ./apps/app/
COPY packages/shared/package.json ./packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile

# =============================================
# Stage 2: Builder
# =============================================
FROM node:22-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy deps from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/app/node_modules ./apps/app/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules

# Copy source
COPY . .

# Build shared package first (skip if no build script)
RUN pnpm --filter @rihla-mate/shared build 2>/dev/null || true

# Build Next.js app
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @rihla-mate/app build

# =============================================
# Stage 3: Runner
# =============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/app/.next/standalone ./
COPY --from=builder /app/apps/app/.next/static ./apps/app/.next/static
COPY --from=builder /app/apps/app/public ./apps/app/public

# Create directories for uploads and license state
RUN mkdir -p /app/uploads /app/.rihla-mate && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/app/server.js"]

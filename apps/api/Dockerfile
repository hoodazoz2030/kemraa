# ============================================
# Stage 1: Install dependencies
# ============================================
FROM node:20.18-alpine AS deps
RUN apk add --no-cache libc6-compat python3 make g++ openssl
WORKDIR /app

COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/ ./packages/
COPY prisma ./prisma

RUN npm install -g pnpm@9.15.9
RUN pnpm install --prod=false --shamefully-hoist

# Generate Prisma client for Linux musl inside container
RUN npx prisma generate --schema=prisma/schema.prisma

# ============================================
# Stage 2: Build
# ============================================
FROM node:20.18-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
COPY apps/api ./apps/api
COPY packages/ ./packages/

RUN npm install -g pnpm@9.15.9

# Build from apps/api, calling nest.js from root
WORKDIR /app/apps/api
RUN pnpm -r --filter "./packages/*" build

    RUN node /app/node_modules/@nestjs/cli/bin/nest.js build

# ============================================
# Stage 3: Production (lean image)
# ============================================
FROM node:20.18-alpine AS runner
WORKDIR /app

# Add OpenSSL for Prisma
RUN apk add --no-cache openssl

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages

USER nestjs

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/v1/health/live || exit 1

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["node", "dist/main.js"]
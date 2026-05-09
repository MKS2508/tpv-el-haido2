FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM oven/bun:1.2-alpine AS runtime
WORKDIR /app

# Non-root user: bun (uid 1000) ya existe en oven/bun:alpine base image
USER bun

COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/src ./src
COPY --from=builder --chown=bun:bun /app/drizzle ./drizzle
COPY --from=builder --chown=bun:bun /app/package.json ./
COPY --from=builder --chown=bun:bun /app/tsconfig.json ./

# Volume for release binaries
VOLUME ["/srv/binaries"]

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Entrypoint: migrate first, then start server
CMD ["sh", "-c", "bun run src/db/migrate.ts && bun run src/index.ts"]

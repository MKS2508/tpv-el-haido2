FROM oven/bun:1.1.43-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

FROM oven/bun:1.1.43-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

FROM oven/bun:1.1.43-alpine AS runtime
WORKDIR /app

# Non-root user (Coolify best practice)
RUN addgroup -g 1001 -S nodejs && adduser -S bun -u 1001
USER bun

COPY --from=builder --chown=bun:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bun:nodejs /app/src ./src
COPY --from=builder --chown=bun:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=bun:nodejs /app/package.json ./
COPY --from=builder --chown=bun:nodejs /app/tsconfig.json ./

# Volume for release binaries
VOLUME ["/srv/binaries"]

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3003/health || exit 1

# Entrypoint: migrate first, then start server
CMD ["sh", "-c", "bun run src/db/migrate.ts && bun run src/index.ts"]

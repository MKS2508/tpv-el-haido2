# License Server Dockerfile
# Elysia.js + Bun runtime with SQLite persistence

FROM oven/bun:1-slim AS base
WORKDIR /app

# Install dependencies only
FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Production image
FROM base AS production

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY src ./src
COPY package.json ./

# Create data directory for SQLite persistence
RUN mkdir -p /app/data

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3002
ENV DB_PATH=/app/data/licenses.db
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3002

# Health check - using wget (available in slim image)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/api/license/health || exit 1

# Run the server
CMD ["bun", "run", "src/index.ts"]

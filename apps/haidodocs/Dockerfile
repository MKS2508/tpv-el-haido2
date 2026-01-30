# Build stage - needs full monorepo context for PWA build
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy entire monorepo (context must be repo root)
COPY . .

# Install root dependencies for PWA build
RUN bun install --frozen-lockfile --ignore-scripts

# Build PWA (builds TPV and copies to apps/haidodocs/public/tpv/)
RUN bun run build:pwa

# Install haidodocs dependencies
WORKDIR /app/apps/haidodocs
RUN bun install --frozen-lockfile --ignore-scripts

# Run postinstall (fumadocs-mdx)
RUN bun run postinstall

# Build the static site (now includes /tpv/ from PWA build)
RUN bun run build

# Production stage - Nginx for static serving
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built static files
COPY --from=builder /app/apps/haidodocs/out /usr/share/nginx/html

# Copy nginx config
COPY apps/haidodocs/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

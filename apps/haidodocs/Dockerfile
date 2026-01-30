# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies without running postinstall scripts
# (fumadocs-mdx postinstall requires source files which aren't copied yet)
RUN bun install --frozen-lockfile --ignore-scripts

# Copy source files
COPY . .

# Run postinstall manually now that source files are available
RUN bun run postinstall

# Build the static site
RUN bun run build

# Production stage - Nginx for static serving
FROM nginx:alpine AS production

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy built static files
COPY --from=builder /app/out /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD curl -f http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

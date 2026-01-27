# TPV El Haido - Linux x64 Build Container
# Multi-stage build for Tauri application

FROM rust:1.80-bookworm AS builder

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-dev \
    librsvg2-dev \
    patchelf \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    curl \
    wget \
    file \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY bun.lock* ./

# Install Node dependencies (force exact Tauri CLI version)
RUN npm ci && npm install @tauri-apps/cli@2.9.6

# Copy Rust files for dependency caching
COPY src-tauri/Cargo.toml src-tauri/Cargo.lock ./src-tauri/

# Create dummy src files to build dependencies
RUN mkdir -p src-tauri/src && \
    echo "fn main() {}" > src-tauri/src/main.rs && \
    echo "pub fn run() {}" > src-tauri/src/lib.rs

# Build Rust dependencies (cached layer)
WORKDIR /app/src-tauri
RUN cargo build --release || true
RUN rm -rf src target/release/.fingerprint/tpv*

# Copy all source code
WORKDIR /app
COPY . .

# Build frontend
RUN npm run build

# Build Tauri application
ARG TAURI_SIGNING_PRIVATE_KEY=""
ARG TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""
ENV TAURI_SIGNING_PRIVATE_KEY=${TAURI_SIGNING_PRIVATE_KEY}
ENV TAURI_SIGNING_PRIVATE_KEY_PASSWORD=${TAURI_SIGNING_PRIVATE_KEY_PASSWORD}

RUN npx @tauri-apps/cli@2.9.6 build

# Output stage - minimal image with just artifacts
FROM debian:bookworm-slim AS artifacts

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.1-0 \
    libgtk-3-0 \
    libayatana-appindicator3-1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /output

# Copy build artifacts
COPY --from=builder /app/src-tauri/target/release/tpv-el-haido ./
COPY --from=builder /app/src-tauri/target/release/bundle/deb/*.deb ./
COPY --from=builder /app/src-tauri/target/release/bundle/rpm/*.rpm ./ 2>/dev/null || true
COPY --from=builder /app/src-tauri/target/release/bundle/appimage/*.AppImage ./ 2>/dev/null || true

# Copy signature files if they exist
COPY --from=builder /app/src-tauri/target/release/bundle/**/*.sig ./ 2>/dev/null || true

# Default command - list artifacts
CMD ["ls", "-la", "/output"]

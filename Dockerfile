# --- Stage 1: Build Stage ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install ALL dependencies (including devDependencies)
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy source code and build
COPY src ./src
RUN npm run build

# --- Stage 2: Production Stage (Batteries-Included: Node + Python + uv + Git) ---
FROM node:20-alpine AS runner

WORKDIR /app

# Install system dependencies: Python 3, pip, git, curl, bash
RUN apk add --no-cache python3 py3-pip git curl bash

# Install uv (Astral fast Python runner) for uvx-based MCP drivers
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR="/usr/local/bin" sh

# Set production environment defaults
ENV NODE_ENV=production \
    PORT=3000 \
    GATEWAY_CONFIG_PATH=/app/data/gateway-mcp-config.json

# Create data directory for persistent volume mount
RUN mkdir -p /app/data

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled javascript files from the builder stage
COPY --from=builder /app/dist ./dist
COPY gateway-mcp-config.example.json ./gateway-mcp-config.example.json

# Volume mount point for persistent configuration & secrets
VOLUME ["/app/data"]

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.js"]

# Use Node.js 22.13.1 specifically
FROM node:22.13.1-slim

# Install build dependencies and SQLite
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PNPM globally
RUN npm install -g pnpm@10.2.1

# Setup PNPM store
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
RUN pnpm config set store-dir "${PNPM_HOME}/store/v3"

# Set working directory
WORKDIR /app

# Copy package files first
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY server/package.json ./server/

# Clean install dependencies
RUN pnpm install --frozen-lockfile

# Copy rest of the application
COPY . .

# Clean up any existing node_modules and rebuild
RUN find . -name 'node_modules' -type d -prune -exec rm -rf '{}' + && \
    pnpm install --frozen-lockfile && \
    cd server && \
    NODE_ENV=development pnpm rebuild better-sqlite3 && \
    cd /app && \
    pnpm build

# Expose the server port
EXPOSE 3001

# Set working directory to server
WORKDIR /app/server

# Start the server
CMD ["pnpm", "start"]
# Multi-stage build for Checkin App - Backend handles all database operations
FROM node:18-slim AS base

# Install OpenSSL and required packages for Prisma
RUN apt-get update -y && apt-get install -y \
    openssl \
    libssl3 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Note: No binary targets needed with Prisma queryCompiler preview feature

# Frontend build stage (no Prisma)
FROM base AS frontend-deps
WORKDIR /app

# Copy frontend package files
COPY package.json package-lock.json* ./

# Install frontend dependencies (no Prisma)
RUN npm ci --legacy-peer-deps

# Frontend builder
FROM base AS frontend-builder
WORKDIR /app

# Copy frontend dependencies
COPY --from=frontend-deps /app/node_modules ./node_modules

# Copy frontend source code
COPY . .

# Build the frontend with environment validation skipped
ENV SKIP_ENV_VALIDATION=true
RUN npm run build

# Backend build stage (with Prisma)
FROM base AS backend-deps
WORKDIR /app

# Copy backend package files and schema
COPY backend/package.json ./
COPY prisma ./prisma

# Install backend dependencies including Prisma
RUN npm install --legacy-peer-deps

# Set Prisma binary targets for ARM64 + OpenSSL 3.0
ENV PRISMA_CLI_BINARY_TARGETS=linux-arm64-openssl-3.0.x
ENV PRISMA_QUERY_ENGINE_BINARY=linux-arm64-openssl-3.0.x

# Clear any cached Prisma clients and force regeneration with correct binary targets
RUN rm -rf node_modules/.prisma node_modules/@prisma/client/runtime/libquery_engine-*.so.node
RUN npx prisma generate --schema=./prisma/schema.prisma

# Backend builder
FROM base AS backend-builder
WORKDIR /app

# Copy backend dependencies and Prisma client
COPY --from=backend-deps /app/node_modules ./node_modules
COPY --from=backend-deps /app/prisma ./prisma

# Copy backend source code
COPY backend/ .

# Build backend TypeScript
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Note: No Prisma engine binaries needed with queryCompiler preview feature

# Note: OpenSSL symlinks not needed with x86_64 architecture

# Create user for security
RUN groupadd --system --gid 1001 nodejs
RUN useradd --system --uid 1001 nextjs

# Copy built frontend
COPY --from=frontend-builder /app/public ./public

# Set correct permissions for Next.js
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Copy Next.js standalone build
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=frontend-builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy backend build with its own Prisma installation
COPY --from=backend-builder --chown=nextjs:nodejs /app/dist ./backend/dist
COPY --from=backend-builder --chown=nextjs:nodejs /app/package.json ./backend/package.json
COPY --from=backend-builder --chown=nextjs:nodejs /app/node_modules ./backend/node_modules

# Copy Prisma schema for migrations
COPY --from=backend-builder --chown=nextjs:nodejs /app/prisma ./backend/prisma

USER nextjs

EXPOSE 3000
EXPOSE 3001

# Start both services - backend handles all database operations
CMD sh -c "cd /app/backend && npx prisma db push --schema=./prisma/schema.prisma && node dist/server.js & cd /app && node server.js" 
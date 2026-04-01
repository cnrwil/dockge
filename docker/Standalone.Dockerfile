############################################
# Stage 1: Build frontend
############################################
FROM node:22-bookworm-slim AS frontend-builder

WORKDIR /app

# Install deps needed to build frontend (devDeps included)
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and build it
COPY frontend ./frontend
COPY tsconfig.json ./tsconfig.json
RUN npm run build:frontend

############################################
# Stage 2: Install production dependencies
# Uses Debian (bookworm) so node-pty prebuilt
# binaries download cleanly without compiling.
############################################
FROM node:22-bookworm-slim AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

############################################
# Stage 3: Final runtime image
############################################
FROM node:22-bookworm-slim AS release

# dumb-init for proper signal handling
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules

# Pre-built frontend
COPY --from=frontend-builder /app/frontend-dist ./frontend-dist

# Backend source
COPY backend ./backend
COPY common ./common
COPY extra ./extra
COPY package.json ./package.json

RUN mkdir -p ./data

ENV UV_USE_IO_URING=0
ENV NODE_ENV=production

VOLUME /app/data
EXPOSE 5001

HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:5001/',r=>{process.exit(r.statusCode<500?0:1)},e=>{process.exit(1)})"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

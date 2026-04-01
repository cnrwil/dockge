############################################
# Standalone Dockerfile for cnrwil/dockge
# Does not depend on upstream louislam images.
# Frontend is pre-built in CI before this runs.
############################################
FROM node:22-alpine AS base

# Build tools needed for native modules (node-pty)
RUN apk add --no-cache \
    dumb-init \
    python3 \
    make \
    g++ \
    linux-headers

WORKDIR /app

############################################
# Install production dependencies
# (native modules compiled here)
############################################
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

############################################
# Main release image
############################################
FROM base AS release
WORKDIR /app

# Production node_modules (with compiled native binaries)
COPY --from=deps /app/node_modules ./node_modules

# Pre-built frontend dist from CI
COPY ./frontend-dist ./frontend-dist

# Backend source, common, extra, etc.
COPY ./backend ./backend
COPY ./common ./common
COPY ./extra ./extra
COPY ./package.json ./package.json

RUN mkdir -p ./data

# Disable io_uring to avoid node-pty issues on newer kernels
ENV UV_USE_IO_URING=0
ENV NODE_ENV=production

VOLUME /app/data
EXPOSE 5001

HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:5001/api/healthcheck 2>/dev/null | grep -q ok || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

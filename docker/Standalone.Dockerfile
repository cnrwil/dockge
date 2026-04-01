# syntax=docker/dockerfile:1

###############################################
# Stage 1 — install deps + build frontend
###############################################
FROM node:22-bookworm AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (devDeps needed for vite)
RUN npm install

# Copy everything needed for the frontend build
COPY tsconfig.json ./tsconfig.json
COPY frontend     ./frontend
COPY common       ./common

# Build the Vue frontend — outputs to /app/frontend-dist
RUN npm run build:frontend

# Remove devDependencies for the runtime image
RUN npm prune --omit=dev

###############################################
# Stage 2 — lean runtime image
###############################################
FROM node:22-bookworm-slim AS release

RUN apt-get update \
    && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules  ./node_modules
COPY --from=builder /app/frontend-dist ./frontend-dist

COPY backend     ./backend
COPY common      ./common
COPY extra       ./extra
COPY package.json ./package.json

RUN mkdir -p ./data

ENV UV_USE_IO_URING=0 \
    NODE_ENV=production

VOLUME /app/data
EXPOSE 5001

HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD node -e "require('http').get('http://localhost:5001/',r=>process.exit(r.statusCode<500?0:1),()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

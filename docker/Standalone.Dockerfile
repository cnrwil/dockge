############################################
# Standalone Dockerfile for cnrwil/dockge
# Builds everything from scratch without
# depending on upstream louislam base images.
############################################
FROM node:22-alpine AS base
RUN apk add --no-cache dumb-init
WORKDIR /app

############################################
# Install production dependencies
############################################
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

############################################
# Main release image
############################################
FROM base AS release
WORKDIR /app

# Copy production node_modules
COPY --from=deps /app/node_modules ./node_modules

# Copy pre-built frontend (built in CI before docker build)
COPY ./frontend-dist ./frontend-dist

# Copy backend source and everything else
COPY . .

RUN mkdir -p ./data

# Disable io_uring to avoid node-pty issues on newer kernels
ENV UV_USE_IO_URING=0

VOLUME /app/data
EXPOSE 5001

HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:5001/api/healthcheck || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

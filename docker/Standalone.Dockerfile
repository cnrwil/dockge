############################################
# Standalone Dockerfile for cnrwil/dockge
#
# node_modules and frontend-dist are pre-built
# on the CI runner and copied in directly.
# No npm install runs inside Docker.
############################################
FROM node:22-alpine

RUN apk add --no-cache dumb-init

WORKDIR /app

# Pre-built production node_modules (pruned on CI runner)
COPY node_modules ./node_modules

# Pre-built frontend
COPY frontend-dist ./frontend-dist

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
  CMD wget -qO- http://localhost:5001/api/healthcheck 2>/dev/null | grep -q ok || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

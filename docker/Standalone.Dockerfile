# Pre-built artefacts are copied in from the CI runner.
# No npm runs inside this Dockerfile.
FROM node:22-bookworm-slim

# Install dumb-init for signal handling and Docker CLI so Dockge can
# run docker/docker compose commands against the host socket.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        dumb-init \
        ca-certificates \
        curl \
        gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY node_modules   ./node_modules
COPY frontend-dist  ./frontend-dist
COPY backend        ./backend
COPY common         ./common
COPY extra          ./extra
COPY package.json   ./package.json

RUN mkdir -p ./data

ENV UV_USE_IO_URING=0 \
    NODE_ENV=production

VOLUME /app/data
EXPOSE 5001

HEALTHCHECK --interval=60s --timeout=30s --start-period=60s --retries=5 \
    CMD node -e "require('http').get('http://localhost:5001/',r=>process.exit(r.statusCode<500?0:1),()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node_modules/.bin/tsx", "./backend/index.ts"]

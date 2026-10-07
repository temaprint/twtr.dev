#=========================================================================
# twtr.dev — Next.js standalone + better-sqlite3
# Multi-stage: glibc (node:22-slim) — better-sqlite3 ships prebuilt
# binaries for linux-x64 glibc; alpine/musl would need a source build.
#=========================================================================

# ── builder: install everything, build ─────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# better-sqlite3 compiles from source when no prebuilt binary matches —
# keep the toolchain in the builder only (runner gets just the .node file)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# manifests first → dependency layer is cached
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── runner: standalone output only ─────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd -r app && useradd -r -g app app

# standalone server + traced node_modules (incl. better_sqlite3.node)
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

# migrations applied at boot by the entrypoint
COPY --chown=app:app scripts/migrate.js ./scripts/migrate.js
COPY --chown=app:app drizzle ./drizzle

# SQLite data lives in a named volume mounted at /app/data
RUN mkdir -p /app/data && chown app:app /app/data

USER app

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node scripts/migrate.js && node server.js"]

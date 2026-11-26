# Small production image. The SQLite database and backups live in /data,
# which must be a persistent volume (Fly.io volume, Render disk, or a host folder).
FROM node:22-slim AS build
WORKDIR /app
# better-sqlite3 compiles a native module during npm ci, which needs these.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/ledger.db \
    BACKUP_DIR=/data/backups \
    APP_TIMEZONE=Asia/Kolkata
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/next.config.ts ./
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/tsconfig.json ./
EXPOSE 3000
# SEED_DEMO=1 loads demo data into an empty database (the seed refuses if data exists).
CMD ["sh", "-c", "if [ \"$SEED_DEMO\" = \"1\" ]; then npx tsx scripts/seed.ts || true; fi; exec npx next start -p ${PORT:-3000}"]

FROM node:24.13.1-bookworm-slim AS npm-base

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install --global npm@11.16.0

FROM npm-base AS dependencies

RUN npm ci --workspace @uploady/api --omit=dev --ignore-scripts

FROM npm-base AS migration

RUN npm ci --workspace @uploady/api --include=dev --ignore-scripts

COPY apps/api/drizzle.config.ts ./apps/api/drizzle.config.ts
COPY apps/api/drizzle ./apps/api/drizzle
COPY apps/api/src/database ./apps/api/src/database

WORKDIR /app/apps/api

ENTRYPOINT ["npm", "run", "db:migrate"]

FROM dependencies AS object-storage-init

COPY apps/api/scripts ./apps/api/scripts

WORKDIR /app/apps/api

ENTRYPOINT ["node", "./scripts/init-object-storage.mjs"]

FROM oven/bun:1.3.14 AS storage-test

WORKDIR /app

COPY --from=migration /app/node_modules ./node_modules
COPY apps/api/src ./apps/api/src
COPY apps/api/test/storage.integration.ts ./apps/api/test/storage.integration.ts

ENTRYPOINT ["bun", "test", "./apps/api/test/storage.integration.ts"]

FROM oven/bun:1.3.14 AS build

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY apps/api/src ./apps/api/src

RUN bun build \
  --compile \
  --minify-whitespace \
  --minify-syntax \
  --outfile ./server \
  ./apps/api/src/index.ts

FROM gcr.io/distroless/base-debian13:nonroot

WORKDIR /app

COPY --from=build --chown=nonroot:nonroot /app/server ./server

ENV NODE_ENV=production

EXPOSE 3000

ENTRYPOINT ["./server"]

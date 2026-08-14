FROM node:24.13.1-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json

RUN npm install --global npm@11.16.0
RUN npm ci --workspace @uploady/api --omit=dev --ignore-scripts

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

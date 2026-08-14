# API

Elysia API running on Bun.

## Commands

```bash
npm run dev --workspace @uploady/api
npm run test --workspace @uploady/api
npm run build --workspace @uploady/api
```

## Database

The API uses Drizzle ORM with PostgreSQL. Start PostgreSQL and apply the
committed migrations from the repository root:

```bash
docker compose up --detach --wait postgres
npm run db:migrate
```

After changing `src/database/schema.ts`, generate and apply a migration:

```bash
npm run db:generate
npm run db:migrate
```

To inspect the local database with Drizzle Studio:

```bash
npm run db:studio
```

From the repository root, start the containerized API and PostgreSQL database:

```bash
copy .env.example .env
npm run docker:up
```

Compose runs the migrations automatically before starting the API.

Stop the stack without deleting its database volume:

```bash
npm run docker:down
```

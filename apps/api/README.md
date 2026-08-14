# API

Elysia API running on Bun.

## Commands

```bash
npm run dev --workspace @uploady/api
npm run test --workspace @uploady/api
npm run build --workspace @uploady/api
```

From the repository root, start the containerized API and PostgreSQL database:

```bash
copy .env.example .env
npm run docker:up
```

Stop the stack without deleting its database volume:

```bash
npm run docker:down
```

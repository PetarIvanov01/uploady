# RustFS in the Uploady development lifecycle

Uploady uses [RustFS](https://rustfs.com/) as its local S3-compatible object store. It uses the same AWS SDK and presigned browser upload used with Cloudflare R2 without requiring a cloud account for routine development.

## What is implemented

- `compose.yaml` runs RustFS `1.0.0-beta.12` with persistent storage and binds
  its S3 API and console to the local machine only.
- `rustfs-init` idempotently creates the development bucket and applies browser
  CORS using the AWS SDK already used by the API.
- The API supports separate internal and public S3 endpoints. Server-side
  `HEAD` requests use the Compose service name; presigned URLs use the
  browser-reachable endpoint.
- Path-style addressing is configurable and enabled for local RustFS.
- `npm run test:storage` validates CORS, presigned `PUT`, `HEAD` metadata,
  missing objects, and cleanup against a live RustFS container.

RustFS stores bytes only. PostgreSQL remains the source of truth for users,
folders, mutable names, versions, and upload state.

Object keys remain opaque:

```text
users/{userId}/{randomUUID}
```

Do not encode mutable file names or folder paths into object keys.

## Local architecture

```text
Browser :5173
  |-- application requests --> Uploady API :3000 --> PostgreSQL :5432
  `-- presigned PUT ---------> localhost:9000
                                  |
Uploady API container ----------> rustfs:9000
Developer ----------------------> RustFS Console localhost:9001
```

The two endpoints solve a presigned-URL networking constraint:

- `S3_ENDPOINT_URL=http://rustfs:9000` is reachable inside Compose and is used
  for server-side storage operations.
- `S3_PUBLIC_ENDPOINT_URL=http://localhost:9000` is used only to construct
  presigned URLs that the host browser can reach.

When the API runs directly on the host, `S3_ENDPOINT_URL` is already
browser-reachable and `S3_PUBLIC_ENDPOINT_URL` can be empty.

## Start local storage

Copy `apps/api/.env.example` to `apps/api/.env` if it does not exist, then run:

```bash
npm run storage:up
```

This starts RustFS, waits for readiness, creates `uploady-dev` when necessary,
and sets CORS for `http://localhost:5173`.

Default values are intentionally development-only:

| Purpose    | Value                            |
| ---------- | -------------------------------- |
| S3 API     | `http://localhost:9000`          |
| Console    | `http://localhost:9001`          |
| Bucket     | `uploady-dev`                    |
| Access key | `uploady-local`                  |
| Secret key | `uploady-local-secret-change-me` |

Open the console with those credentials to inspect objects and metadata. Ports
are bound to `127.0.0.1`; do not expose the example credentials to an untrusted
network.

For host-run development:

```bash
docker compose up --detach --wait postgres
npm run storage:up
npm run db:migrate
npm run dev:api
npm run dev:web
```

The containerized API stack also includes RustFS and its initializer:

```bash
npm run docker:up
```

## Configuration

The API reads:

| Variable                 | Required | Purpose                                         |
| ------------------------ | -------- | ----------------------------------------------- |
| `S3_ENDPOINT_URL`        | Yes      | Endpoint used by server-side SDK operations     |
| `S3_PUBLIC_ENDPOINT_URL` | No       | Browser-reachable endpoint used for presigning  |
| `S3_ACCESS_KEY_ID`       | Yes      | S3 credential                                   |
| `S3_SECRET_ACCESS_KEY`   | Yes      | S3 credential                                   |
| `S3_BUCKET_NAME`         | Yes      | Object bucket                                   |
| `S3_FORCE_PATH_STYLE`    | No       | Strict `true`/`false`; local RustFS uses `true` |

The API validates these values together at process startup through its Elysia
`t` environment schema. Invalid or missing values prevent the server from
listening and report variable names without printing credential contents.

Compose accepts these project-level overrides:

| Variable                     | Default                          |
| ---------------------------- | -------------------------------- |
| `RUSTFS_ACCESS_KEY`          | `uploady-local`                  |
| `RUSTFS_SECRET_KEY`          | `uploady-local-secret-change-me` |
| `RUSTFS_BUCKET`              | `uploady-dev`                    |
| `RUSTFS_PORT`                | `9000`                           |
| `RUSTFS_CONSOLE_PORT`        | `9001`                           |
| `RUSTFS_CORS_ALLOWED_ORIGIN` | `http://localhost:5173`          |

After changing the web origin, rerun `npm run storage:up` to reapply CORS. If a
host-run API uses a non-default RustFS port, update its `S3_ENDPOINT_URL` too.

For cloud storage, omit `S3_PUBLIC_ENDPOINT_URL` when the normal endpoint is
reachable by both API and browser. Verify whether that provider needs
`S3_FORCE_PATH_STYLE`; do not assume RustFS and R2 behave identically outside
Uploady's tested operation set.

## Live storage test

```bash
npm run test:storage
```

The command starts or reuses RustFS, reapplies bucket configuration, and runs
`apps/api/test/storage.integration.ts` in a dedicated container. It:

1. generates a path-style presigned upload URL;
2. sends a browser-style CORS preflight for `PUT` and `Content-Type`;
3. uploads a unique text object;
4. reads its size, content type, and ETag through `HEAD`;
5. confirms a missing key maps to `null`;
6. deletes every object key it created.

This suite is separate from `npm test`. The regular API suite deliberately
mocks S3 so it stays fast and does not require Docker.

## Persistence and cleanup

RustFS data lives in the `rustfs_data` Compose volume. Normal shutdown preserves
objects:

```bash
npm run docker:down
```

This reset permanently removes both local PostgreSQL and RustFS data, so use it
only when the data is disposable:

```bash
docker compose down --volumes
```

The storage test removes only its unique keys. Future tests must keep cleanup
scoped and must never delete a shared bucket as teardown.

## Lifecycle value and guardrails

RustFS gives Uploady cloud-independent local uploads, catches browser CORS and
signature errors before deployment, provides a repeatable CI storage contract,
and supplies a controlled endpoint for future download, multipart, checksum,
and cleanup work.

Before release, run a provider-neutral subset of the contract against a
non-production R2 bucket. `S3-compatible` is a claim to verify operation by
operation, not a reason to skip provider smoke tests.

For upstream details, see the official [RustFS repository](https://github.com/rustfs/rustfs),
[release history](https://github.com/rustfs/rustfs/releases),
[management documentation](https://docs.rustfs.com/management/), and
[reverse-proxy guidance](https://docs.rustfs.com/fr/developer/integration/reverse-proxy).

# Uploady API — agent handoff

This is the authoritative context document for agents working on `apps/api`.
Read it before changing backend behavior. It describes the implementation as it
exists now, including intentional constraints and unfinished work.

## Role in the monorepo

`@uploady/api` is a Bun/Elysia HTTP API for a hierarchical file vault. It owns:

- PostgreSQL persistence through Drizzle ORM;
- folder mutation and hierarchical vault read APIs;
- direct-to-S3-compatible-storage upload orchestration;
- the exported Elysia `App` type consumed by the web app through Eden Treaty.

All HTTP routes have the `/api/v1` prefix. The runtime entry point is
`src/index.ts`; the reusable and type-exported application is `src/app.ts`.

## Agent startup contract

Every new Codex agent must first follow the `onboard-uploady-project` skill in
`.codex/skills/onboard-uploady-project/SKILL.md`. Any backend, database,
storage, deployment, configuration, command, or backend-test change must update
this README in the same change so it remains an accurate context handoff.

## Current system behavior

### Identity

Authentication is not implemented. Upload, folder, and vault services all use
this hard-coded development user:

```text
9e9a548c-dced-4f30-958d-19d423b53028
```

Keep every read and mutation scoped by `userId`. When authentication is added,
replace all three temporary-user declarations together; search for
`temporaryUserId`.

### Vault hierarchy

- A folder or file with `parent_folder_id = NULL` is in the user's root vault.
- A nested item points to its immediate parent folder.
- Folder names are mutable and are not part of storage keys.
- Duplicate folder names are currently allowed, including among siblings.
- Moving a folder is a database update to `parent_folder_id`.
- The folder service walks the proposed parent's ancestors before a move and
  rejects missing parents, cross-user parents, self-parenting, and cycles.
- Folder and file foreign keys use `ON DELETE CASCADE`. Deleting a folder
  permanently deletes all descendant folders and files. Cascades continue from
  files to versions, upload sessions, and upload parts.

### Object storage invariant

Object keys are deliberately opaque:

```text
users/{userId}/{randomUUID}
```

Do not encode folder paths or file names into the key. Renaming or moving an
item must never require an S3/R2 object copy.

### Single-file upload flow

Only single uploads up to and including `200 * 1024 * 1024` bytes are fully
implemented.

1. `POST /api/v1/uploads/single` validates metadata and creates, in one DB
   transaction, a `files` row, version 1 in `file_versions`, and a SINGLE
   `upload_sessions` row.
2. The API returns a five-minute presigned `PUT` URL and the required
   `content-type` header.
3. The browser uploads bytes directly to object storage; the API never proxies
   the body.
4. `POST /api/v1/uploads/single/:fileId/complete` performs `HEAD` against
   storage, checks that the object exists and its size matches, then marks the
   version/file/session ready in a DB transaction.
5. Expired or size-mismatched sessions are marked failed. Completion is
   idempotent for an already completed session.

The supplied checksum is persisted, but completion currently validates only
object existence and byte size. Content type and checksum are not verified.
New uploads always create root-level files because the upload contract does not
yet accept `parentFolderId`.

### Multipart upload state

Multipart schemas, constants, route shapes, and service function signatures
exist, but every operation intentionally throws
`MultipartUploadNotImplementedError`. The routes return `501`.

The prepared limits are:

- minimum multipart file: 200 MiB + 1 byte;
- default part: 100 MiB;
- minimum part: 5 MiB;
- maximum part: 5 GiB;
- maximum part count: 10,000;
- maximum file: approximately 4.995 TiB.

### Vault read model

Reads are separate from folder mutations. `vault-read.repository.ts` uses raw,
parameterized PostgreSQL queries because the response combines folders, current
file versions, counts, ordering, and recursive breadcrumbs.

- Entries include direct child folders and files with a current version.
- `DELETED` files and files without `current_version_id` are omitted.
- Folders sort before files; each group sorts by case-insensitive name and ID.
- Folder counts describe direct children only, not all descendants.
- Breadcrumbs are root-to-leaf and are built by a recursive CTE.
- The service throws `InvalidFolderHierarchyError` if a discovered path does
  not terminate at the root or does not end at the requested folder.

## HTTP contract

### Health

| Method | Path             | Behavior                      |
| ------ | ---------------- | ----------------------------- |
| `GET`  | `/api/v1/health` | Returns `{ "status": "ok" }`. |

### Vault reads

| Method | Path                        | Behavior                                                                              |
| ------ | --------------------------- | ------------------------------------------------------------------------------------- |
| `GET`  | `/api/v1/vault`             | Root location, empty breadcrumbs, and root entries.                                   |
| `GET`  | `/api/v1/vault/folders/:id` | Folder metadata, full breadcrumbs, and direct entries; `404` if inaccessible/missing. |
| `GET`  | `/api/v1/vault/files/:id`   | File metadata and containing-folder breadcrumbs; `404` if inaccessible/missing.       |

Folder entries contain `counts: { files, folders }`. File entries contain
`size`, MIME `type`, and `UPLOADING | READY | FAILED` status.

### Folder mutations

| Method   | Path                  | Behavior                                                                                     |
| -------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/folders`     | Creates `{ name, parentFolderId? }`; omitted/null parent means root.                         |
| `PATCH`  | `/api/v1/folders/:id` | Renames with `name`, moves with `parentFolderId`, or does both. Explicit null moves to root. |
| `DELETE` | `/api/v1/folders/:id` | Cascades through the full subtree; `204`, `404`, or a generic logged `500`.                  |

Names are trimmed in the service; blank names return `400`. Missing parents
return `404`. Cyclic moves return `409`. Read folders through `/vault`; there is
no folder `GET` mutation endpoint.

### Uploads

| Method   | Path                                                           | Behavior                                                        |
| -------- | -------------------------------------------------------------- | --------------------------------------------------------------- |
| `POST`   | `/api/v1/uploads/single`                                       | Creates a single-upload session; `201`, or `413` above 200 MiB. |
| `POST`   | `/api/v1/uploads/single/:fileId/complete`                      | Verifies storage and finalizes; `200`, `404`, or `409`.         |
| `POST`   | `/api/v1/uploads/multipart`                                    | Contract only; returns `501`.                                   |
| `POST`   | `/api/v1/uploads/multipart/:uploadSessionId/parts/:partNumber` | Contract only; returns `501`.                                   |
| `POST`   | `/api/v1/uploads/multipart/:uploadSessionId/complete`          | Contract only; returns `501`.                                   |
| `DELETE` | `/api/v1/uploads/multipart/:uploadSessionId`                   | Contract only; returns `501`.                                   |

There are currently no endpoints for downloading, moving, renaming, or deleting
individual files. `s3.ts` exposes a one-hour presigned `getUrl`, but no route
uses it.

## Database model

The source of truth is `src/database/schema.ts`; committed migrations live in
`drizzle/`.

| Table/type        | Purpose and important constraints                                                                                                                        |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`           | UUID identity, unique email. Authentication is not implemented.                                                                                          |
| `folders`         | UUID, owner, nullable self-reference, name, timestamps. Parent deletion cascades.                                                                        |
| `files`           | UUID, owner, nullable folder, mutable name, current version, lifecycle status, timestamps. Folder deletion cascades; current-version deletion sets null. |
| `file_versions`   | Immutable-ish storage metadata per version. Unique `(file_id, version)`; file deletion cascades.                                                         |
| `upload_sessions` | Single/multipart orchestration state, expected size/parts, expiration and completion. File/version deletion cascades.                                    |
| `upload_parts`    | Prepared multipart part state. Unique `(upload_session_id, part_number)`.                                                                                |

Enums: `file_status`, `file_version_status`, `upload_session_status`,
`upload_mode`, and `upload_part_status`.

Migration `0004_lethal_mandarin.sql` changed folder and file parent references
to cascading deletion. Preserve that behavior unless the product semantics are
explicitly changed.

## Directory and file map

```text
apps/api/
├── drizzle/                    committed generated SQL and Drizzle snapshots
├── seeds/
│   └── performance.sql         repeatable local folder/file performance seed
├── src/
│   ├── app.ts                  Elysia composition, /api/v1 prefix, CORS, App type
│   ├── env.schema.ts           Elysia t schema, normalization, typed env parser
│   ├── env.ts                  fail-fast validated API environment singleton
│   ├── index.ts                Bun listener on PORT (default 3000)
│   ├── s3.ts                   internal/public S3 clients, presigned GET/PUT, HEAD
│   ├── database/
│   │   ├── index.ts            postgres-js client and Drizzle instance
│   │   └── schema.ts           tables, enums, references, cascade semantics
│   ├── repositories/
│   │   ├── file.repository.ts  transactional single-upload persistence
│   │   ├── folder.repository.ts folder create/find/update/delete queries
│   │   └── vault-read.repository.ts combined entries and recursive paths
│   ├── routes/
│   │   ├── health.ts           health route
│   │   ├── uploads.ts          upload request schemas/status mapping
│   │   ├── folders.ts          folder request schemas/status mapping
│   │   └── vault.ts            vault request schemas/status mapping
│   └── services/
│       ├── upload-file.ts      single-upload initialization and 200 MiB limit
│       ├── complete-upload.ts  storage verification and finalization
│       ├── multipart-upload.ts multipart contracts; deliberately unimplemented
│       ├── folders.ts          name normalization, ownership, cycle validation
│       └── vault.ts            read-model mapping and hierarchy assertions
├── scripts/
│   └── init-object-storage.mjs idempotent local bucket and CORS bootstrap
├── test/
│   ├── app.test.ts             Bun request-level tests with mocked repos/S3
│   ├── env.test.ts             API environment parsing and safe errors
│   └── storage.integration.ts  opt-in live S3 storage contract
├── Dockerfile                  migration/init/test targets + distroless API image
├── drizzle.config.ts           Drizzle Kit config; requires DATABASE_URL
└── package.json                workspace scripts and dependencies
```

Repository modules are the persistence boundary. Services import singleton
repositories directly; there is no application-wide DI container. Repository
factory functions still accept `Database` so repository behavior can be tested
with alternate database instances later.

## Environment and startup

Create `apps/api/.env` from `apps/api/.env.example` and supply:

```text
PORT=3000
DATABASE_URL=postgresql://uploady:uploady@localhost:5432/uploady
S3_ENDPOINT_URL=...
S3_PUBLIC_ENDPOINT_URL=...
S3_FORCE_PATH_STYLE=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=...
```

At module startup, `env.ts` passes an explicit selection of API variables to the
Elysia `t` schema in `env.schema.ts`. Invalid configuration throws one error
listing all failing variable paths before the server listens. Values are
trimmed, empty optional values become undefined, `PORT` and
`S3_FORCE_PATH_STYLE` decode to number and boolean values, and errors never
include credential values. Runtime modules import the typed `env` singleton;
`env.ts` is the only `process.env` access under `src/`.

`PORT` defaults to `3000`, `NODE_ENV` to `development`, and
`S3_FORCE_PATH_STYLE` to `false`. `PORT` must be an integer from 1 through
65,535; `NODE_ENV` accepts only `development`, `test`, or `production`; database
and S3 endpoints must be URIs; and required strings must be non-empty.

`S3_PUBLIC_ENDPOINT_URL` is optional. When supplied, presigned GET/PUT URLs use
it while server-side operations continue to use `S3_ENDPOINT_URL`; this lets a
containerized API use `http://rustfs:9000` internally and return
`http://localhost:9000` URLs to the host browser. `S3_FORCE_PATH_STYLE` is an
optional strict `true`/`false` value and is enabled for local RustFS.

Drizzle Kit and the object-storage initializer are separate processes and
validate only their own required variables; running a database migration does
not require S3 configuration. Do not log credentials.

For browser uploads, the S3/R2 bucket must allow CORS from the web origin for
`PUT` and the `Content-Type` header. The local `rustfs-init` service creates the
development bucket and applies this rule idempotently.

From the repository root:

```bash
docker compose up --detach --wait postgres
npm run storage:up
npm run db:migrate
npm run dev:api
```

Or run the containerized local stack:

```bash
npm run docker:up
```

Compose starts PostgreSQL and pinned RustFS, runs the dedicated `migration` and
`rustfs-init` image targets to completion, then starts the API. RustFS persists
objects in the `rustfs_data` volume and exposes its S3 API at
`http://localhost:9000` and console at `http://localhost:9001`. These ports bind
only to `127.0.0.1`. The production API image itself performs neither database
migration nor bucket initialization on entry.

## Commands and change workflow

Run from the repository root unless noted:

```bash
npm run dev:api
npm run build --workspace @uploady/api
npm run test --workspace @uploady/api
npm run test:storage
npm run storage:up
npm run check
npm run dead-code
npm run dead-code:files
npm run format --workspace @uploady/api
npm run db:generate
npm run db:migrate
npm run db:studio
```

Oxlint handles issues within reachable source files. Root-level Knip handles
unused files, exports, and dependencies across both workspaces;
`dead-code:files` limits that analysis to unreachable files. `knip.json`
disables Knip's Drizzle plugin because loading `drizzle.config.ts` without
`DATABASE_URL` intentionally fails; the config is registered as a static entry
instead. `@knipignore` is reserved for explicitly documented, staged
primitives such as the future download and multipart implementation.

After editing `src/database/schema.ts`:

1. run `npm run db:generate`;
2. inspect the new SQL and snapshot;
3. run `npm run db:migrate` against local PostgreSQL;
4. run checks and tests;
5. commit schema, SQL, journal, and snapshot together.

`seeds/performance.sql` creates the temporary user, a mixed root/nested folder
tree, and completed fake file records. It does not upload real objects, and its
object keys intentionally point to nonexistent fake storage data.

## Testing reality

`test/app.test.ts` exercises Elysia through `app.handle(Request)` and currently
covers health, single upload initialization/size rejection/completion,
multipart `501`, root/folder/file vault reads and `404`s, folder creation,
moving, cycle rejection, and successful delete responses for both empty and
non-empty folders. It also verifies that request-body constraints and UUID path
parameter validation still return `422` before handlers process invalid input.
`test/env.test.ts` covers runtime defaults, trimming empty optional values,
numeric/boolean decoding, aggregated invalid-variable reporting, and secret
redaction.

The request test file mocks S3 and all repositories before importing `app`.
Therefore:

- tests do not require or validate a live PostgreSQL instance;
- regular tests do not send data to S3/R2;
- raw SQL and migration behavior still need separate integration/manual
  verification.

`test/storage.integration.ts` is an opt-in Docker-backed contract run by
`npm run test:storage`. It starts/reuses RustFS, bootstraps the bucket and CORS,
then verifies a browser-style CORS preflight, path-style presigned PUT, object
metadata through HEAD, missing-object behavior, and scoped cleanup. It does not
exercise PostgreSQL or the complete HTTP upload orchestration. Keep it separate
from the fast default test suite.

## Known gaps and next likely work

1. Add authentication and remove all hard-coded user IDs.
2. Accept `parentFolderId` during upload so nested folders can receive files.
3. Implement file mutations: rename, move, soft/hard delete as product requires.
4. Add a download endpoint using a short-lived presigned GET URL.
5. Implement multipart persistence and S3 operations; the current surface is
   only a typed `501` contract.
6. Decide whether persisted checksums must be sent to and verified by storage.
7. Add database integration tests for recursive paths, ordering, counts,
   ownership, concurrent completion, and cascade deletion.
8. Configure an explicit production CORS origin; `app.ts` currently supplies an
   empty origin when `NODE_ENV=production`.

## Invariants for future agents

- Never put mutable names or folder paths into object keys.
- Never trust a folder/file ID without scoping it to the current user.
- Preserve the distinction between mutation routes (`/folders`, `/uploads`) and
  the combined read model (`/vault`) unless deliberately redesigning the API.
- Do not mark a file READY before storage verification succeeds.
- Keep DB state transitions transactional where multiple tables change.
- Keep application/service DTOs and explicit return types as the source of
  truth for responses. Elysia infers those handler return types into `App` for
  Eden Treaty; do not duplicate them with response schemas unless an endpoint
  has a documented runtime output-validation or serialization requirement.
- Keep Elysia schemas for untrusted request bodies, parameters, queries,
  headers, and cookies.
- Keep API runtime environment access centralized in `env.ts`; extend and test
  `env.schema.ts` when adding a required or optional runtime variable.
- Do not claim multipart, download, nested upload, or authentication support
  until the corresponding behavior and tests exist.

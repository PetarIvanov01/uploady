# Resumable uploads implementation plan

Status: partially implemented foundation. Sequential multipart upload is
available for files above 200 MiB, but uploads are not resumable yet. This
document distinguishes current behavior from the proposed resumability work.

## Objective

Add reliable, direct-to-S3-compatible-storage resumable file uploads while
preserving Uploady's current architecture:

- file bodies travel directly from the browser to object storage;
- the API owns upload authorization, session state, ownership checks, and final
  database transitions;
- object keys remain opaque and never contain mutable file or folder names;
- interrupted uploads retry only missing parts rather than restarting the file;
- browser memory is bounded by part size rather than total file size;
- completion remains idempotent and a file becomes `READY` only after storage
  verification succeeds.

## Core decision: resumability does not require checksums

Resumability and checksum validation solve different problems:

```text
session ID + deterministic parts + uploaded-part discovery = resumability
checksums = integrity validation
```

The first resumable release does not need client-generated checksums. It needs:

1. a persistent server-side multipart upload session;
2. deterministic byte ranges and part numbers;
3. short-lived presigned URLs that can be regenerated;
4. storage-backed discovery of already uploaded parts;
5. ordered part ETags for multipart completion;
6. retry, pause, resume, cancel, expiry, and cleanup behavior.

Checksums can be added later per part. Do not block the first resumable release
on a whole-file SHA-256 calculation.

## Important scope distinction

There are two useful levels of resumability.

### Level 1: transient resume

The page still owns the original `File` object. Uploady can recover from:

- a failed part request;
- a temporary network outage;
- pausing and continuing in the same mounted application;
- an expired presigned part URL;
- an API retry or tab remaining open while connectivity returns.

This level does not require a checksum because the browser continues slicing the
same `File` object.

### Level 2: durable resume after reload or browser restart

After a reload, the browser usually cannot silently reacquire the original local
file. The user must reselect it unless a supported persistent file-system handle
is available. Name, size, type, and `lastModified` are useful hints but are not a
cryptographically reliable identity.

Before claiming durable cross-reload resume, choose and implement one strategy:

1. prompt the user to reselect the file and accept metadata matching as a
   documented best-effort check;
2. calculate and persist a bounded-memory file fingerprint;
3. store per-part checksums and verify a reselected file against the original
   part manifest;
4. use the File System Access API where available, with a reselect fallback;
5. limit the first release to transient resume and explicitly defer reload
   recovery.

Recommended rollout: implement Level 1 first. Add Level 2 only after the local
file identity policy is explicit and tested.

## Current implementation progress

The current feature is a sequential multipart uploader, which is the foundation
for resumability but is not itself resumable.

| Capability                     | Status          | Current behavior or remaining work                                                                                                                                                                           |
| ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multipart strategy selection   | Implemented     | Files above 200 MiB use multipart; smaller files use a single presigned `PUT`.                                                                                                                               |
| Multipart initialization       | Implemented     | The API creates database and storage state and returns the upload session, its expiry, and the server-selected part size. The checksum remains optional and the web client does not calculate or submit one. |
| Deterministic slicing          | Implemented     | The browser uses the returned part size, consecutive part numbers starting at 1, and an exact final slice.                                                                                                   |
| Part upload                    | Implemented     | The browser requests a fresh five-minute presigned URL immediately before each part and uploads parts sequentially with `fetch`.                                                                             |
| ETag collection and completion | Implemented     | The browser reads each exposed storage `ETag`, submits the ordered list, and the API atomically completes and byte-size-verifies the object.                                                                 |
| Progress                       | Partial         | Aggregate progress advances after each confirmed part; there is no intra-part byte progress.                                                                                                                 |
| Failure cleanup                | Partial         | A part-signing or part-upload failure triggers a best-effort abort. There is no scheduled cleanup for every expired or orphaned session.                                                                     |
| Session lifetime               | Implemented     | Multipart sessions last 24 hours, independently of five-minute presigned part URLs.                                                                                                                          |
| Retry and URL refresh          | Not implemented | A part failure aborts the session. Retrying from the UI creates a new session and uploads the complete file again.                                                                                           |
| Pause and cancel controls      | Not implemented | The UI cannot pause, retain, resume, or explicitly cancel a multipart session.                                                                                                                               |
| Resume state                   | Not implemented | There is no part acknowledgement endpoint, storage `ListParts` adapter, status/reconciliation endpoint, or client resume manifest.                                                                           |
| Resumability verification      | Not implemented | Existing multipart primitives are not yet covered by the full API, browser, and recovery test matrix below.                                                                                                  |

The backend currently provides these multipart primitives:

- `POST /api/v1/uploads/multipart` initializes database and storage state;
- `POST /api/v1/uploads/multipart/:uploadSessionId/parts/:partNumber`
  returns a presigned part `PUT` URL;
- `POST /api/v1/uploads/multipart/:uploadSessionId/complete` accepts ordered
  part metadata and finalizes storage/database state;
- `DELETE /api/v1/uploads/multipart/:uploadSessionId` aborts the upload,
  including an expired session that remains active;
- concurrent completion is protected by an atomic completion claim;
- finalization verifies that the assembled object exists and has the expected
  byte size.

The database already has `upload_sessions` and `upload_parts`, including part
number, size, ETag, checksum, status, and upload timestamp fields. Successfully
uploaded parts are not yet acknowledged, persisted, or reconciled individually.

### What remains for true resumability

1. Make storage authoritative by adding paginated `ListParts`, a part
   acknowledgement route, and a status/reconciliation route.
2. Retry failed parts without aborting the session, including obtaining a new
   URL when a presigned URL expires or a result is ambiguous.
3. Track per-file and per-part client state so an upload can pause and continue
   while the page still owns the original `File`.
4. Add explicit cancel behavior, active-request abort signals, automatic expiry
   cleanup, and a storage lifecycle fallback for abandoned multipart uploads.
5. Make completion consume reconciled storage parts instead of trusting the
   browser to provide the complete ETag list.
6. Add an IndexedDB resume manifest and a file-reselection identity policy only
   when durable recovery across reloads becomes part of the product scope.
7. Add bounded retry/backoff, intra-part progress, observability, and the
   verification coverage described later in this document.

## Target architecture

Each selected file owns an independent upload session. A multi-file selection
is a queue of these independent workflows; parts from different files must never
share a storage multipart upload ID.

```text
Browser                         Uploady API                    Object storage
   |                                 |                              |
   | initialize file metadata       |                              |
   |------------------------------->| create DB session            |
   |                                | create multipart upload ---->|
   |<----- session + part plan ------|                              |
   |                                 |                              |
   | request URL for part N          |                              |
   |------------------------------->| validate owner/session/part  |
   |                                | presign UploadPart ----------|
   |<----- short-lived URL ----------|                              |
   | PUT exact part bytes ---------------------------------------->|
   |<----- ETag ----------------------------------------------------|
   | acknowledge part N + ETag      |                              |
   |------------------------------->| persist part result          |
   |                                 |                              |
   | status/reconcile request        | ListParts                    |
   |------------------------------->|----------------------------->|
   |<----- confirmed uploaded parts -|<-----------------------------|
   |                                 |                              |
   | complete                        | ListParts + complete          |
   |------------------------------->|----------------------------->|
   |                                | HEAD assembled object        |
   |                                | transactionally mark READY   |
   |<----- completed file -----------|                              |
```

Storage is authoritative about uploaded parts. Database part rows provide fast
application state and observability, but reconciliation must handle this race:

1. storage accepts a part;
2. the browser loses connectivity before acknowledging it to the API;
3. the database still says the part is pending;
4. `ListParts` discovers it during resume or completion.

## Upload strategy selection

Do not confuse the existing 200 MiB single-upload boundary with a fundamental
resumability boundary.

Recommended strategy model:

```ts
type UploadStrategy = "single" | "resumable-multipart";
```

- Use `single` when restarting the complete file is acceptable.
- Use `resumable-multipart` when pause/resume is required, even if the file is
  smaller than 200 MiB.
- Keep the threshold as an explicit product/configuration decision rather than
  embedding it into storage-domain validation.
- Always use multipart above the maximum supported single `PUT` size.

The first UI rollout may retain the current 200 MiB threshold to reduce scope.
If resumability is promised for smaller files, remove the backend
`MULTIPART_TOO_SMALL` restriction and route those files through multipart.

## Part planning

Use deterministic part boundaries so a resumed client produces exactly the same
part numbers and byte ranges:

```ts
start = (partNumber - 1) * partSizeBytes;
end = Math.min(start + partSizeBytes, file.size);
part = file.slice(start, end);
```

Part-size rules:

- every non-final S3 multipart part must be at least 5 MiB;
- part numbers start at 1 and remain consecutive;
- S3-compatible storage permits at most 10,000 parts;
- choose a browser-oriented default such as 8 or 16 MiB after benchmarking;
- dynamically increase part size for large files:

```ts
partSizeBytes = max(
  configuredDefaultPartBytes,
  ceil(fileSizeBytes / maximumPartCount),
);
```

- round dynamic sizes to a stable MiB boundary;
- return the chosen part size and expected part count from initialization;
- never let the browser independently choose a different part plan on resume.

With bounded parallelism, approximate JavaScript memory is:

```text
concurrent parts * part size + protocol/runtime overhead
```

Start sequentially. Add a worker pool of two or three concurrent parts only
after correctness, cancellation, and aggregate progress are verified.

## Proposed API evolution

Prefer extending the existing `/multipart` routes instead of adding a second
resumable protocol.

### 1. Initialize

```http
POST /api/v1/uploads/multipart
```

Proposed request:

```json
{
  "name": "video.mp4",
  "size": 734003200,
  "type": "video/mp4",
  "parentFolderId": null
}
```

The checksum should be omitted from the first resumable release.

Proposed response:

```json
{
  "fileId": "uuid",
  "uploadSessionId": "uuid",
  "partSizeBytes": 8388608,
  "expectedParts": 88,
  "sessionExpiresAt": "ISO-8601 timestamp"
}
```

Initialization must:

1. validate file metadata and ownership of `parentFolderId` when folder upload
   support exists;
2. calculate the deterministic part plan;
3. create file, version, session, and prepared part rows transactionally;
4. create the storage multipart upload;
5. persist the storage upload ID;
6. compensate or mark failure if storage creation/DB activation diverge;
7. return no long-lived storage credentials or storage upload ID.

### 2. Request a part URL

```http
POST /api/v1/uploads/multipart/:uploadSessionId/parts/:partNumber
```

The existing route can remain. Its response should include every header the
browser must send:

```json
{
  "partNumber": 4,
  "method": "PUT",
  "uploadUrl": "https://storage.example/...",
  "headers": {},
  "expiresAt": "ISO-8601 timestamp"
}
```

The API must validate ownership, session state, long-lived session expiry,
expected part range, and storage upload activation before signing.

Part URLs should remain short-lived and regenerable. Never persist them in
IndexedDB because they are bearer credentials and expire quickly.

### 3. Acknowledge a completed part

Add:

```http
POST /api/v1/uploads/multipart/:uploadSessionId/parts/:partNumber/complete
```

Request:

```json
{
  "etag": "storage-returned-etag",
  "size": 8388608
}
```

This endpoint should upsert the part row idempotently. Treat browser-provided
metadata as a claim that can be reconciled with storage, not as the final source
of truth.

If checksums are added later, extend the request with an explicit algorithm and
value rather than an untyped string.

### 4. Get resumable status

Add:

```http
GET /api/v1/uploads/multipart/:uploadSessionId
```

Response:

```json
{
  "fileId": "uuid",
  "status": "UPLOADING",
  "totalSizeBytes": 734003200,
  "partSizeBytes": 8388608,
  "expectedParts": 88,
  "sessionExpiresAt": "ISO-8601 timestamp",
  "completedParts": [
    { "partNumber": 1, "etag": "...", "size": 8388608 },
    { "partNumber": 2, "etag": "...", "size": 8388608 }
  ]
}
```

The endpoint should call storage `ListParts`, reconcile database rows, and
return the authoritative completed-part set. It must not expose the storage
multipart upload ID or object key.

### 5. Complete

```http
POST /api/v1/uploads/multipart/:uploadSessionId/complete
```

Preferred future contract: the browser does not need to submit every ETag.
The API lists and validates storage parts, orders them, claims completion, and
passes the authoritative list to storage completion.

Completion must verify:

- the session belongs to the current user;
- the session is `UPLOADING` or recoverably `COMPLETING`;
- every expected part exists exactly once;
- part numbers are consecutive;
- non-final part sizes match the plan;
- the final part size matches the remaining bytes;
- the assembled object exists;
- final object size equals the declared size;
- the database transition to `READY` is transactional and idempotent.

Preserve the existing atomic completion-claim behavior so concurrent retries do
not finalize storage twice.

### 6. Pause versus cancel

Pause is a browser action:

- stop scheduling new parts;
- abort active XHR requests;
- leave the server/storage multipart session alive;
- retain the local resume manifest.

Cancel is destructive:

```http
DELETE /api/v1/uploads/multipart/:uploadSessionId
```

- abort storage multipart state;
- mark the session aborted;
- mark the file/version failed according to existing lifecycle semantics;
- delete the local resume manifest;
- make subsequent resume attempts fail deliberately.

## Session and URL lifetimes

These concepts are now separated in the current implementation:

```text
upload session lifetime       24 hours
presigned part URL lifetime   five minutes
```

The API rejects new part URLs after the session expires but still allows the
active session to be aborted so its storage state can be cleaned up. The current
web client requests each URL immediately before use, but it does not distinguish
an expired part URL from another part failure: it aborts the session instead of
refreshing the URL. Resumability must change an expired part URL into a new URL
request without discarding confirmed parts.

The remaining lifecycle work for sessions that never complete is:

1. query expired active sessions;
2. abort their storage multipart uploads;
3. mark sessions and file/version rows failed or expired;
4. make the cleanup idempotent;
5. configure a storage lifecycle rule to abort incomplete multipart uploads as
   a final safety net where supported;
6. emit metrics for cleanup failures and orphan candidates.

## Storage adapter changes

Extend `apps/api/src/s3.ts` behind the existing storage abstraction:

- `listMultipartParts(objectKey, storageUploadId)`;
- optionally `headMultipartPart` only if a provider requires it;
- keep create, presign part, complete, and abort operations provider-neutral;
- normalize quoted/unquoted ETags consistently;
- handle pagination because `ListParts` responses can be truncated;
- preserve endpoint separation between internal storage operations and public
  presigned URLs.

Test the contract against every supported S3-compatible provider. Do not assume
an AWS-only checksum or ETag behavior is portable to RustFS and R2.

## Database and repository changes

Use `upload_parts` as active state rather than a prepared unused table.

Repository operations should include:

- create the expected part rows during initialization;
- upsert a successfully acknowledged part by session and part number;
- reconcile rows from storage `ListParts` results;
- list completed parts in order;
- clear or mark stale part state on abort/expiry;
- keep all reads scoped through the owning file/user;
- lock or condition updates so completion and part acknowledgement cannot create
  an invalid final state.

Possible part state transitions:

```text
PENDING -> UPLOADING -> UPLOADED
    |          |             |
    +----------+-----------> FAILED
```

Because direct storage uploads bypass the API, `UPLOADING` may be only a client
view unless the API receives an explicit start notification. Avoid persisting a
state that cannot be made accurate. A simpler server model is:

```text
PENDING -> UPLOADED
```

with storage reconciliation repairing missed acknowledgements.

Any schema change must include a generated Drizzle migration, inspected SQL,
snapshot/journal changes, database migration verification, and repository tests.

## Web client state model

Keep per-file and per-part state separate from the aggregate batch UI.

Suggested file state:

```ts
type ResumableFileStatus =
  | "queued"
  | "initializing"
  | "uploading"
  | "paused"
  | "reconciling"
  | "completing"
  | "success"
  | "error"
  | "cancelled";
```

Suggested part state:

```ts
type UploadPartState = {
  partNumber: number;
  start: number;
  end: number;
  status: "pending" | "signing" | "uploading" | "uploaded" | "error";
  loaded: number;
  etag?: string;
  attempts: number;
  error?: string;
};
```

Derive aggregate progress instead of incrementing a shared counter blindly:

```text
confirmed uploaded bytes + active request loaded bytes
------------------------------------------------------
                  total file bytes
```

Clamp displayed progress below 100% until server completion succeeds. Uploading
all bytes is not the same as completing and verifying the file.

## Browser upload algorithm

For each missing part:

1. derive `start` and `end` from the server-provided part size;
2. obtain `const part = file.slice(start, end)`;
3. request a fresh presigned URL for the part number;
4. send the `Blob` directly with XHR to retain progress events;
5. read the storage `ETag` response header;
6. acknowledge the part to the API;
7. mark the part uploaded locally only after the acknowledgement or subsequent
   reconciliation confirms it;
8. release request references before scheduling more work.

Retry policy:

- retry transient network errors, `408`, `429`, and storage `5xx` responses;
- refresh the presigned URL on signature/expiry failures;
- use exponential backoff with jitter and a bounded attempt count;
- do not retry validation, ownership, invalid-session, or cancelled-session
  errors automatically;
- reconcile before re-uploading when the request outcome is ambiguous;
- allow an explicit user retry after automatic retries are exhausted.

Pause behavior must call `XMLHttpRequest.abort()` for active parts. Keep handles
to active requests by upload session and part number.

## Local persistence

Use IndexedDB rather than `localStorage` for structured resume manifests.

Suggested manifest:

```ts
type ResumeManifest = {
  schemaVersion: 1;
  uploadSessionId: string;
  file: {
    name: string;
    size: number;
    type: string;
    lastModified: number;
    fingerprint?: string;
  };
  partSizeBytes: number;
  expectedParts: number;
  completedParts: Array<{ partNumber: number; etag: string }>;
  sessionExpiresAt: string;
  updatedAt: string;
};
```

Rules:

- never persist presigned URLs;
- never expose or persist the storage upload ID in the browser;
- version the manifest so future migrations can discard incompatible records;
- treat locally completed parts as hints until the API reconciles storage;
- delete manifests after success, cancellation, inaccessible session, or
  unrecoverable expiry;
- do not store the entire `File` or `Blob` in IndexedDB by default because that
  duplicates large user data and can exceed browser quotas.

## Optional future per-part checksums

Checksums should be introduced only after basic resume is correct, or earlier if
the durable file-identity requirements make them necessary.

Per-part calculation bounds memory:

```ts
const part = file.slice(start, end);
const bytes = await part.arrayBuffer();
const digest = await crypto.subtle.digest("SHA-256", bytes);

// Upload the same bytes that were hashed.
xhr.send(bytes);
```

This holds one part, not the whole file, in JavaScript memory. With concurrency,
memory grows approximately with `partSize * concurrentParts`.

If storage validation is enabled:

1. calculate the part checksum before requesting its URL;
2. send the algorithm/value to the API;
3. include it when constructing the storage `UploadPart` command;
4. return the exact required checksum header to the browser;
5. expose checksum response headers through storage CORS;
6. persist the storage-confirmed checksum with the ETag;
7. include required part checksum fields during completion;
8. test the behavior against AWS S3, R2, and RustFS.

Use explicit metadata rather than `sha256:<hex>`:

```ts
type Checksum = {
  algorithm: "SHA256";
  encoding: "base64";
  type: "PART" | "COMPOSITE" | "FULL_OBJECT";
  value: string;
  verified: boolean;
};
```

Do not label an S3 composite multipart SHA-256 as the ordinary SHA-256 of the
full file. They have different semantics.

Relevant specifications and provider documentation:

- [Amazon S3 multipart upload overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [Amazon S3 UploadPart API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_UploadPart.html)
- [Amazon S3 ListParts API](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListParts.html)
- [tus checksum extension](https://github.com/tus/tus-resumable-upload-protocol/blob/main/protocol.md#checksum)
- [Cloudflare R2 S3 compatibility](https://developers.cloudflare.com/r2/api/s3/api/)

## CORS requirements

The storage bucket must support browser part uploads from the web origin.
Verify at minimum:

- allowed method: `PUT`;
- allowed request headers: every signed content/checksum header used by the API;
- exposed response headers: `ETag` and future checksum headers;
- local RustFS bootstrap applies the same policy as production;
- integration tests exercise preflight and JavaScript-readable response headers.

Changing signed headers without updating CORS will produce browser-only failures
even when command-line storage tests pass.

## Security and trust boundaries

- Scope every session and part operation by the authenticated user once auth
  exists; preserve the temporary-user scoping until then.
- Treat presigned URLs as short-lived bearer credentials.
- Validate part numbers, planned sizes, session state, and expiry server-side.
- Do not trust a browser-provided ETag, size, checksum, or completed-part list as
  authoritative without storage reconciliation.
- Never return object keys or storage multipart upload IDs to the browser unless
  a reviewed design specifically requires it.
- Keep names and folder paths out of object keys.
- Add rate limits for session initialization and part URL generation when auth
  and public deployment are introduced.
- A checksum detects accidental byte changes; it does not replace TLS,
  authorization, malware scanning, or content policy enforcement.

## Failure and recovery matrix

| Failure point                                     | Required recovery                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| DB initialization fails                           | Do not create storage state, or compensate safely.                      |
| Storage multipart creation fails                  | Mark the prepared DB session/file failed.                               |
| Storage creation succeeds but DB activation fails | Abort the orphaned storage upload and mark DB failure.                  |
| Part URL expires                                  | Request a new URL for the same part.                                    |
| Part `PUT` definitely fails                       | Retry that part with backoff.                                           |
| Part succeeds but acknowledgement is lost         | `ListParts` reconciliation discovers it.                                |
| Browser pauses                                    | Abort active requests; preserve server session and manifest.            |
| Browser reloads                                   | Restore manifest, reselect/validate file, reconcile storage.            |
| Completion request is retried concurrently        | Existing atomic completion claim prevents duplicate storage completion. |
| Storage completes but API response is lost        | Retry completion; verify assembled object and finalize DB idempotently. |
| Session expires                                   | Reject new parts, clean storage state, and remove local manifest.       |
| User cancels                                      | Abort storage session and mark persisted state aborted.                 |

## Verification plan

### API request tests

Cover:

- initialization and deterministic part planning;
- files both below and above the former 200 MiB boundary if multipart is opened
  to smaller files;
- ownership and inaccessible-session `404`s;
- invalid, duplicate, out-of-range, and missing part numbers;
- short-lived URL regeneration without changing the session;
- status reconciliation from mocked `ListParts` results;
- lost acknowledgement recovery;
- idempotent part acknowledgement;
- expired session versus expired URL behavior;
- pause producing no server mutation;
- abort/cancel semantics;
- completion using authoritative ordered parts;
- concurrent and retried completion;
- storage-completed/database-not-finalized recovery;
- rejection of wrong total and final-part sizes.

### Repository and PostgreSQL integration tests

Cover:

- transactional initialization of file/version/session/parts;
- unique `(upload_session_id, part_number)` behavior;
- idempotent part upsert/reconciliation;
- ownership-scoped reads;
- completion racing with acknowledgement;
- abort/expiry cleanup;
- cascading file/folder deletion during an active upload.

### Storage integration tests

Against RustFS, and provider-specific staging where available:

1. create multipart state;
2. upload only a subset of parts;
3. list parts and assert their ETags/sizes;
4. regenerate a URL and upload a missing part;
5. complete from the listed authoritative parts;
6. verify final object size;
7. abort an incomplete upload;
8. test pagination for many parts;
9. test CORS preflight and exposed `ETag`;
10. add checksum header/response verification only when checksums are enabled.

### Web tests

Cover:

- deterministic slicing and final-part boundaries;
- aggregate progress from confirmed and active bytes;
- retrying only a failed part;
- pause and resume without creating a new session;
- presigned URL refresh;
- multi-file sessions remaining isolated;
- IndexedDB manifest creation, update, migration, and deletion;
- reconciliation overriding stale local state;
- file reselect mismatch behavior;
- completion remaining below 100% until server confirmation;
- cancel versus pause copy and actions.

### Browser/end-to-end scenarios

- throttle and disconnect the network during a part;
- reload during an active upload;
- let a part URL expire while the session remains valid;
- lose the acknowledgement response after a successful storage `PUT`;
- retry completion after its response is dropped;
- resume after several parts already exist;
- cancel and confirm no further part URLs can be issued.

## Observability

Add structured logs and metrics without logging presigned URLs or credentials:

- sessions initialized, resumed, completed, aborted, expired, and failed;
- parts attempted, retried, reconciled, and failed;
- bytes uploaded and bytes avoided through resume;
- time from initialization to completion;
- completion retries and completion-claim outcomes;
- orphan cleanup attempts and failures;
- active incomplete storage uploads by age;
- error counts by domain error code and storage provider.

These signals are necessary to distinguish reliable resumption from uploads that
quietly accumulate abandoned storage parts.

## Suggested implementation phases

### Phase 0: contract cleanup

- [x] Use the existing 200 MiB boundary for the initial multipart rollout.
- [x] Make the whole-file checksum optional and omit it from the web multipart
      request.
- [x] Make the single-upload checksum optional and stop calculating it in the
      web client; do not keep calculating an unverified whole-file hash.
- [x] Separate the 24-hour session lifetime from the five-minute presigned URL
      lifetime.
- [ ] Choose and benchmark a smaller browser-oriented default part size; the
      current default remains 100 MiB.

### Phase 1: authoritative backend resume state

- [ ] Add storage `ListParts` with pagination.
- [ ] Activate repository operations for `upload_parts`.
- [ ] Add part acknowledgement.
- [ ] Add the status/reconciliation endpoint.
- [ ] Make completion use authoritative storage parts.
- [ ] Add scheduled cleanup for expired/orphaned multipart sessions.
- [x] Preserve atomic, idempotent completion and final object-size verification.
- [ ] Complete API, repository, and RustFS resumability coverage.

### Phase 2: sequential browser multipart upload

- [x] Add typed web helpers for initialize, sign part, complete, and abort.
- [ ] Add typed helpers for future part acknowledgement and status routes.
- [x] Implement deterministic slicing with the server-provided part size.
- [x] Upload one part at a time and preserve its storage `ETag`.
- [x] Report aggregate progress at confirmed-part boundaries.
- [x] Best-effort abort the session when signing or uploading a part fails.
- [ ] Replace `fetch` with an upload transport that exposes intra-part progress.
- [ ] Add bounded part retry and presigned URL refresh without discarding
      confirmed parts.
- [ ] Add pause, resume, and explicit cancel controls.
- [x] Keep the original `File` object in memory for future transient resume.
- [x] Do not claim reload persistence yet.

### Phase 3: durable local manifest

- [ ] Add versioned IndexedDB manifests.
- [ ] Restore interrupted sessions on application startup.
- [ ] Reconcile every restored session with the API/storage.
- [ ] Implement the chosen reselect/file-identity policy.
- [ ] Add cross-reload browser tests.

### Phase 4: bounded parallelism

- [ ] Add a two- or three-part worker pool.
- [ ] Ensure pause aborts every active request.
- [ ] Make progress monotonic without double-counting retried bytes.
- [ ] Benchmark memory and throughput on desktop and constrained mobile devices.

### Phase 5: optional verified checksums

- [ ] Select a checksum algorithm supported by AWS S3, R2, and RustFS.
- [ ] Hash one bounded part at a time, optionally in a Web Worker.
- [ ] Bind the checksum header into each presigned part request.
- [ ] Persist and reconcile storage-confirmed part checksums.
- [ ] Store final checksum type/algorithm/encoding explicitly.
- [ ] Extend CORS and provider integration tests.

## Definition of done

The resumable feature is complete only when all applicable statements are true:

- [x] No upload path buffers the complete large file in JavaScript memory.
- [ ] An interrupted part retries without restarting confirmed parts.
- [ ] An expired part URL can be regenerated while the session remains active.
- [ ] The API can authoritatively report uploaded parts from storage.
- [ ] Lost part acknowledgements recover through reconciliation.
- [ ] Pause and cancel have distinct, tested semantics.
- [x] Completion is ordered, size-verified, transactional, and idempotent.
- [x] Session and URL expirations are separate.
- [ ] Expired and orphaned multipart uploads are cleaned up.
- [x] Multiple selected files retain independent sessions and progress.
- [x] Browser memory is bounded by configured part size and sequential
      concurrency.
- [ ] CORS exposes `ETag` and any required future checksum headers.
- [ ] RustFS integration verifies subset upload, list, resume, and completion.
- [x] The UI does not claim cross-reload resume before file identity is enforced.
- [ ] Checksums, if enabled, are independently validated by storage and correctly
      labeled as part, composite, or full-object values.
- [x] API and web READMEs describe current implemented behavior rather than
      treating this proposal as the source of truth.

## Open product and architecture decisions

- [x] Target transient resume before durable cross-reload resume.
- [ ] Which file sizes use multipart/resumable upload?
- [ ] What is the default browser part size after benchmarking?
- [ ] What is the maximum concurrent part count?
- [x] Use a 24-hour session lifetime for the current multipart foundation.
- [ ] How does the user reselect and prove the same file after reload?
- [ ] Is storage `ListParts` called on every status request or only during
      reconciliation/completion?
- [ ] Does part acknowledgement verify storage immediately or remain a cached
      claim until reconciliation?
- [x] Defer checksums for the first resumable release.
- [ ] Does pausing persist automatically, and where are resumable sessions shown
      after returning to the application?

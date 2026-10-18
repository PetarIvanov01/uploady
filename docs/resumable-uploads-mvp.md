# Resumable uploads: MVP implementation guide

This document turns the broader proposal in
[`resumable-uploads.md`](./resumable-uploads.md) into a small, actionable first
release. The proposal remains the reference for later production hardening,
durable cross-reload recovery, checksums, cleanup, and observability.

## Intent

Resumability means that an interrupted multipart upload continues from the
parts already accepted by object storage instead of uploading the complete file
again.

```text
Split the file into numbered parts
                |
                v
Upload each part directly to object storage
                |
                v
Ask storage which parts already exist
                |
                v
Upload only the missing parts
                |
                v
Complete and verify the multipart upload
```

The essential operation is storage-backed part discovery. The API must ask
S3-compatible storage which parts exist and return that authoritative state to
the browser.

## Checksums are not resumability

Checksums and resumability solve different problems:

```text
session ID + deterministic parts + uploaded-part discovery = resumability
checksums                                                    = integrity checks
```

The first resumable release does not need a client-generated whole-file
checksum. Multipart initialization should omit it.

The shared repository input can make `checksum` optional and persist `null`
when it is absent. The `file_versions.checksum` database column is already
nullable, so this change does not require a migration.

Whether single uploads should continue calculating a checksum is a separate
decision. The current single-upload checksum is persisted but not verified.

## MVP scope

Implement transient resumability first. The original browser `File` object
remains available while the page is mounted.

The MVP must support:

- retrying a failed part without restarting confirmed parts;
- pausing and continuing while the application remains open;
- recovering from a temporary network interruption;
- regenerating an expired presigned part URL;
- asking storage which parts have already uploaded;
- completing and verifying the upload idempotently.

The MVP does not promise recovery after a reload or browser restart.

Defer the following:

- IndexedDB resume manifests;
- file fingerprints and reselected-file identity;
- per-part checksums;
- concurrent part workers;
- scheduled orphan cleanup;
- production metrics and operational hardening.

## Example recovery

A file is divided into ten parts. Parts 1 through 4 reach storage, and then the
connection fails.

On retry:

1. The browser retains the same `uploadSessionId`.
2. The browser requests the session's resumable status.
3. The API calls storage `ListParts`.
4. Storage reports parts 1 through 4.
5. The browser skips those parts and uploads parts 5 through 10.
6. The API lists and validates the complete part set before finalization.

Storage is authoritative. A part may reach storage even when the browser loses
the HTTP response or cannot acknowledge the result to the API.

## Recommended initial decisions

Use these defaults unless product requirements say otherwise:

- resumability level: transient, without reload recovery;
- upload strategy: retain the current multipart boundary above 200 MiB;
- browser part size: start with 16 MiB and benchmark it;
- concurrency: one part at a time;
- upload-session lifetime: 24 hours;
- presigned part URL lifetime: five minutes;
- status source: storage `ListParts` on resume and completion;
- checksums: deferred for multipart uploads.

The session and URL lifetimes must be independent:

```text
multipart upload session    24 hours
presigned part URL           5 minutes
```

An expired URL requires a replacement URL for the same part. It must not
invalidate the multipart session.

## Implementation sequence

### 1. Remove the multipart checksum requirement

Update the multipart HTTP schema and service input so initialization accepts:

```json
{
  "name": "video.mp4",
  "size": 734003200,
  "type": "video/mp4"
}
```

Relevant files:

- `apps/api/src/routes/uploads.schemas.ts`;
- `apps/api/src/services/uploads/multipart-upload.types.ts`;
- `apps/api/src/repositories/file.repository.ts`.

Because single and multipart initialization share the repository input, use an
optional internal field:

```ts
checksum?: string;
```

Persist it as:

```ts
checksum: input.checksum ?? null;
```

Keep the single-upload contract unchanged during this step unless its checksum
policy is intentionally being changed too.

### 2. Separate session expiry from URL expiry

Multipart initialization must create a long-lived upload session. Part URL
generation must continue returning a short-lived URL.

Do not derive both expirations from
`PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS`. Introduce a separate multipart-session
lifetime constant or configuration value.

### 3. Add authoritative storage part discovery

Extend the storage abstraction in `apps/api/src/s3.ts` with:

```ts
type StoredMultipartPart = {
  partNumber: number;
  etag: string;
  size: number;
};

listMultipartParts(
  objectKey: string,
  storageUploadId: string,
): Promise<StoredMultipartPart[]>;
```

The implementation must:

- use the provider's `ListParts` operation;
- follow pagination until every part is returned;
- return parts ordered by part number;
- normalize ETags consistently;
- avoid exposing the object key or storage upload ID to the browser.

Add RustFS integration coverage for uploading only a subset of parts and then
listing them.

### 4. Add a resumable-status endpoint

Add:

```http
GET /api/v1/uploads/multipart/:uploadSessionId
```

The endpoint must:

1. find the current user's multipart session;
2. reject missing, inaccessible, cancelled, or expired sessions;
3. call `listMultipartParts` using server-only storage identifiers;
4. validate the returned part numbers and sizes;
5. return the authoritative completed-part set.

Suggested response:

```json
{
  "fileId": "uuid",
  "status": "UPLOADING",
  "totalSizeBytes": 734003200,
  "partSizeBytes": 16777216,
  "expectedParts": 44,
  "sessionExpiresAt": "ISO-8601 timestamp",
  "completedParts": [
    {
      "partNumber": 1,
      "etag": "storage-etag",
      "size": 16777216
    }
  ]
}
```

This endpoint answers the browser's main resume question: which parts can be
skipped?

### 5. Make completion use storage state

The current completion request trusts the browser to submit the complete ETag
list. Replace that behavior with an authoritative storage lookup.

On completion, the API must:

1. find and authorize the session;
2. call `listMultipartParts`;
3. require every expected part exactly once;
4. require consecutive part numbers;
5. verify every non-final part size against the plan;
6. verify the final part size against the remaining bytes;
7. preserve the existing atomic completion claim;
8. pass the ordered storage-derived parts to multipart completion;
9. verify the assembled object size;
10. transactionally mark the file, version, and session complete.

The preferred browser request has no ETag list:

```http
POST /api/v1/uploads/multipart/:uploadSessionId/complete
```

### 6. Implement sequential browser multipart upload

Implement the multipart branch in
`apps/web/src/components/FileUpload/useFileUpload.ts` one part at a time.

The server chooses the part plan. The browser derives each byte range from that
plan:

```ts
const start = (partNumber - 1) * partSizeBytes;
const end = Math.min(start + partSizeBytes, file.size);
const part = file.slice(start, end);
```

The browser workflow is:

```text
initialize the multipart session
get resumable status

for every expected part:
    skip it if storage already reports it
    request a fresh URL for that part number
    upload the File slice directly with XHR

request server-side completion
```

Use XHR so upload progress and cancellation remain available. Upload only the
part `Blob`; never call `file.arrayBuffer()` for the complete large file.

### 7. Distinguish pause from cancel

Pause is local and non-destructive:

- stop scheduling parts;
- abort the active XHR;
- retain the `File`, upload session ID, and progress state;
- leave database and storage multipart state active.

Resume fetches status again and continues with the missing parts.

Cancel is destructive:

- call `DELETE /api/v1/uploads/multipart/:uploadSessionId`;
- abort storage multipart state;
- mark the persisted upload aborted according to existing lifecycle behavior;
- discard local state.

## Progress calculation

Progress should be derived from confirmed parts plus the active request:

```text
bytes in storage-confirmed parts + bytes loaded by the active XHR
----------------------------------------------------------------
                        total file size
```

Keep the displayed value below 100 percent until server completion and object
verification succeed. Sending all bytes does not mean the file is ready.

## Testing order

### API and storage

Cover these cases first:

- multipart initialization without a checksum;
- session lifetime independent from URL lifetime;
- `ListParts` returning a subset of uploaded parts;
- paginated part listing;
- status returning authoritative completed parts;
- expired part URL regeneration without a new session;
- completion rejecting missing, duplicate, out-of-range, or incorrectly sized
  parts;
- completion using storage-derived ordered ETags;
- existing concurrent and retried completion behavior remaining idempotent.

### Web

Cover:

- deterministic part boundaries, including the final part;
- skipping parts returned by resumable status;
- retrying only a failed part;
- pausing by aborting the active XHR;
- resuming through a fresh status request;
- requesting a replacement URL for an expired part URL;
- progress not reaching 100 percent before server completion.

## MVP definition of done

The first resumable release is complete when:

- [ ] Multipart initialization does not require a checksum.
- [ ] The complete large file is never buffered in JavaScript memory.
- [ ] Part boundaries are deterministic and server-controlled.
- [ ] A failed part can retry without restarting confirmed parts.
- [ ] A part URL can be regenerated while its session remains active.
- [ ] The API can authoritatively list uploaded parts from storage.
- [ ] A retry skips parts already reported by storage.
- [ ] Pause leaves the server and storage session intact.
- [ ] Cancel destroys the server and storage session deliberately.
- [ ] Completion validates ordered part numbers and exact planned sizes.
- [ ] Completion remains transactional and idempotent.
- [ ] The UI does not promise recovery after reload or browser restart.

## Work deferred after the MVP

After transient resume works reliably, implement later phases in this order:

1. activate `upload_parts` acknowledgement and reconciliation for cached state
   and observability;
2. add expired-session and orphaned-storage cleanup;
3. add versioned IndexedDB manifests;
4. choose and implement a reselected-file identity policy;
5. add bounded parallel uploads with two or three workers;
6. add independently verified per-part checksums only if product integrity
   requirements justify them.

Do not describe cross-reload resume as implemented until IndexedDB restoration
and file identity are both designed and tested.

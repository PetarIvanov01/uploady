import { describe, expect, it, mock } from "bun:test";
import type {
  CreateFolderInput,
  UpdateFolderInput,
} from "../src/repositories/folder.repository";
import type { CreateSingleUploadSessionInput } from "../src/repositories/file.repository";

const singleUploadLimitBytes = 200 * 1024 * 1024;

const fileId = "f0a6d1d4-1ef7-48df-9d8f-e13b2aa68bc1";
const uploadSessionId = "9462f628-276c-42cc-9a0d-1aa794ad7f06";
const fileVersionId = "68827f7a-b376-4905-a898-3cd5d45a2978";
const createdAt = "2026-08-14T18:00:00.000Z";
const expiresAt = new Date("2026-08-14T18:05:00.000Z");
const objectKey = `users/test/${fileId}`;
const folderId = "a528cd92-3d83-4e05-ab7b-777341322916";
const childFolderId = "30e8a81f-0ee7-4eb8-8e78-e296cfbe674a";
const createdFolderId = "e60f0291-6c88-4e27-bbab-78ad98487df5";

const folderRecord = {
  createdAt: new Date(createdAt),
  id: folderId,
  name: "Projects",
  parentFolderId: null,
  updatedAt: new Date(createdAt),
  userId: "9e9a548c-dced-4f30-958d-19d423b53028",
};

const childFolderRecord = {
  ...folderRecord,
  id: childFolderId,
  name: "System Design",
  parentFolderId: folderId,
};

const fileRecord = {
  createdAt: new Date(createdAt),
  id: fileId,
  mimeType: "text/plain",
  name: "vault-note.txt",
  size: 12,
  status: "READY" as const,
};

const singleUploadSession = {
  contentType: "text/plain",
  expiresAt: new Date(Date.now() + 60_000),
  fileId,
  fileVersionId,
  objectKey,
  status: "UPLOADING" as const,
  totalSizeBytes: 12,
  uploadSessionId,
};

await mock.module("../src/s3", () => ({
  PRESIGNED_UPLOAD_EXPIRES_IN_SECONDS: 300,
  getObjectMetadata: async () => ({
    contentType: "text/plain",
    etag: '"test-etag"',
    size: 12,
  }),
  putUrl: async () => "https://storage.example/upload",
}));

await mock.module("../src/repositories/file.repository", () => ({
  fileRepository: {
    completeSingleUploadSession: async () => true,
    createSingleUploadSession: async (
      _input: CreateSingleUploadSessionInput,
    ) => ({
      expiresAt,
      fileId,
      objectKey,
      uploadSessionId,
    }),
    failSingleUploadSession: async () => undefined,
    findAll: async () => [fileRecord],
    findById: async (id: string) => (id === fileId ? fileRecord : null),
    findSingleUploadSession: async (
      requestedFileId: string,
      requestedSessionId: string,
    ) =>
      requestedFileId === fileId && requestedSessionId === uploadSessionId
        ? singleUploadSession
        : null,
  },
}));

await mock.module("../src/repositories/folder.repository", () => ({
  folderRepository: {
    create: async (input: CreateFolderInput) => ({
      ...folderRecord,
      ...input,
      id: createdFolderId,
    }),
    findAll: async (_userId: string, parentFolderId: string | null) =>
      parentFolderId === null ? [folderRecord] : [childFolderRecord],
    findById: async (id: string) => {
      if (id === folderId) return folderRecord;
      if (id === childFolderId) return childFolderRecord;
      return null;
    },
    remove: async (id: string) => (id === folderId ? "NOT_EMPTY" : "DELETED"),
    update: async (id: string, _userId: string, input: UpdateFolderInput) => ({
      ...(id === childFolderId ? childFolderRecord : folderRecord),
      ...input,
    }),
  },
}));

const { app } = await import("../src/app");

describe("API", () => {
  it("reports its health", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("creates a presigned single-upload session", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads/single", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checksum: "sha256:test",
          name: "vault-note.txt",
          size: 12,
          type: "text/plain",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      expiresAt: expiresAt.toISOString(),
      fileId,
      headers: { "content-type": "text/plain" },
      method: "PUT",
      mode: "SINGLE",
      uploadSessionId,
      uploadUrl: "https://storage.example/upload",
    });
  });

  it("rejects a file larger than 200 MiB from the single-upload path", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads/single", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checksum: "sha256:test",
          name: "large.bin",
          size: singleUploadLimitBytes + 1,
          type: "application/octet-stream",
        }),
      }),
    );

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({
      maxSizeBytes: singleUploadLimitBytes,
      message: `Single uploads cannot exceed ${singleUploadLimitBytes} bytes`,
    });
  });

  it("completes a single upload after storage verification", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/uploads/single/${fileId}/complete`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadSessionId }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      fileId,
      status: "COMPLETED",
      uploadSessionId,
    });
  });

  it("exposes the multipart initiation contract as not implemented", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads/multipart", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          checksum: "sha256:test",
          name: "large.bin",
          size: singleUploadLimitBytes + 1,
          type: "application/octet-stream",
        }),
      }),
    );

    expect(response.status).toBe(501);
    expect(await response.json()).toEqual({
      message: "Multipart uploads are not implemented yet",
    });
  });

  it("retrieves uploaded file metadata", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/uploads/${fileId}`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      createdAt,
      id: fileId,
      name: "vault-note.txt",
      size: 12,
      status: "READY",
      type: "text/plain",
    });
  });

  it("lists uploaded file metadata", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        createdAt,
        id: fileId,
        name: "vault-note.txt",
        size: 12,
        status: "READY",
        type: "text/plain",
      },
    ]);
  });

  it("returns 404 when file metadata does not exist", async () => {
    const response = await app.handle(
      new Request(
        "http://localhost/api/v1/uploads/cc2f5e63-2308-4e3f-8f86-694163b2f2ec",
      ),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ message: "File not found" });
  });

  it("lists folders in the vault root", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/folders"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        createdAt,
        id: folderId,
        name: "Projects",
        parentFolderId: null,
        updatedAt: createdAt,
      },
    ]);
  });

  it("creates a nested folder", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/folders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Architecture",
          parentFolderId: folderId,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      createdAt,
      id: createdFolderId,
      name: "Architecture",
      parentFolderId: folderId,
      updatedAt: createdAt,
    });
  });

  it("moves a folder to the vault root", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/folders/${childFolderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentFolderId: null }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      createdAt,
      id: childFolderId,
      name: "System Design",
      parentFolderId: null,
      updatedAt: createdAt,
    });
  });

  it("rejects moving a folder inside itself", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/folders/${folderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ parentFolderId: folderId }),
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "Folder move would create a cycle",
    });
  });

  it("rejects deleting a non-empty folder", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/folders/${folderId}`, {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      message: "Folder must be empty before deletion",
    });
  });

  it("deletes an empty folder", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/folders/${childFolderId}`, {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

import { describe, expect, it, mock } from "bun:test";
import type { CreateUploadSessionInput } from "../src/repositories/file.repository";

const fileId = "f0a6d1d4-1ef7-48df-9d8f-e13b2aa68bc1";
const createdAt = "2026-08-14T18:00:00.000Z";

const fileRecord = {
  id: fileId,
  name: "vault-note.txt",
  size: 12,
  mimeType: "text/plain",
  lastModified: 1786640400000,
  createdAt: new Date(createdAt),
};

await mock.module("../src/repositories/file.repository", () => ({
  fileRepository: {
    createSession: async ({
      name,
      size,
      type,
      lastModified,
    }: CreateUploadSessionInput) => ({
      id: fileId,
      name,
      size,
      mimeType: type,
      lastModified,
      createdAt: new Date(createdAt),
    }),
    findAll: async () => [fileRecord],
    findById: async (id: string) => (id === fileId ? fileRecord : null),
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

  it("accepts file metadata for an upload", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          name: "vault-note.txt",
          size: 12,
          type: "text/plain",
          lastModified: 1786640400000,
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: fileId,
      name: "vault-note.txt",
      size: 12,
      type: "text/plain",
      lastModified: 1786640400000,
      receivedSize: 12,
    });
  });

  it("retrieves uploaded file metadata", async () => {
    const response = await app.handle(
      new Request(`http://localhost/api/v1/uploads/${fileId}`),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: fileId,
      name: "vault-note.txt",
      size: 12,
      type: "text/plain",
      lastModified: 1786640400000,
      createdAt,
    });
  });

  it("lists uploaded file metadata", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: fileId,
        name: "vault-note.txt",
        size: 12,
        type: "text/plain",
        lastModified: 1786640400000,
        createdAt,
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
});

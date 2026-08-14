import { describe, expect, it } from "bun:test";

import { createApp } from "../src/app";

const fileId = "f0a6d1d4-1ef7-48df-9d8f-e13b2aa68bc1";
const createdAt = "2026-08-14T18:00:00.000Z";

const app = createApp({
  listFiles: async () => [
    {
      id: fileId,
      name: "vault-note.txt",
      size: 12,
      type: "text/plain",
      lastModified: 1786640400000,
      createdAt,
    },
  ],
  retrieveFile: async (id) =>
    id === fileId
      ? {
          id: fileId,
          name: "vault-note.txt",
          size: 12,
          type: "text/plain",
          lastModified: 1786640400000,
          createdAt,
        }
      : null,
  uploadFile: async ({ name, size, type, lastModified, file }) => ({
    id: fileId,
    name,
    size,
    type,
    lastModified,
    receivedSize: file.size,
  }),
});

describe("API", () => {
  it("reports its health", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/v1/health"),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("accepts a multipart file upload", async () => {
    const body = new FormData();
    body.append("name", "vault-note.txt");
    body.append("size", "12");
    body.append("type", "text/plain");
    body.append("lastModified", "1786640400000");
    body.append(
      "file",
      new File(["private note"], "vault-note.txt", { type: "text/plain" }),
    );

    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads", {
        method: "POST",
        body,
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

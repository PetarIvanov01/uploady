import { describe, expect, it } from "bun:test";

import { app } from "../src/app";

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
    body.append("file", new File(["private note"], "vault-note.txt"));

    const response = await app.handle(
      new Request("http://localhost/api/v1/uploads", {
        method: "POST",
        body,
      }),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      name: "vault-note.txt",
      size: 12,
    });
  });
});

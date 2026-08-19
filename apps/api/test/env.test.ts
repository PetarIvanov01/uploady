import { describe, expect, it } from "bun:test";
import { parseApiEnvironment, type EnvironmentSource } from "../src/env.schema";

const validEnvironment = {
  DATABASE_URL: "postgresql://uploady:uploady@localhost:5432/uploady",
  S3_ACCESS_KEY_ID: "test-access-key",
  S3_BUCKET_NAME: "uploady-test",
  S3_ENDPOINT_URL: "http://localhost:9000",
  S3_SECRET_ACCESS_KEY: "test-secret-key",
} satisfies EnvironmentSource;

describe("API environment", () => {
  it("applies defaults and normalizes an empty public endpoint", () => {
    expect(
      parseApiEnvironment({
        ...validEnvironment,
        S3_PUBLIC_ENDPOINT_URL: "  ",
      }),
    ).toEqual({
      ...validEnvironment,
      NODE_ENV: "development",
      PORT: 3000,
      S3_FORCE_PATH_STYLE: false,
      S3_PUBLIC_ENDPOINT_URL: undefined,
    });
  });

  it("decodes numeric and boolean strings", () => {
    const environment = parseApiEnvironment({
      ...validEnvironment,
      NODE_ENV: "production",
      PORT: "8080",
      S3_FORCE_PATH_STYLE: "true",
      S3_PUBLIC_ENDPOINT_URL: "http://localhost:9001",
    });

    expect(environment.PORT).toBe(8080);
    expect(environment.S3_FORCE_PATH_STYLE).toBe(true);
    expect(environment.NODE_ENV).toBe("production");
  });

  it("reports every invalid variable without exposing secret values", () => {
    const secret = "must-not-appear-in-errors";
    const invalidEnvironment = {
      ...validEnvironment,
      DATABASE_URL: "",
      PORT: "70000",
      S3_FORCE_PATH_STYLE: "yes",
      S3_SECRET_ACCESS_KEY: secret,
    };

    try {
      parseApiEnvironment(invalidEnvironment);
      throw new Error("Expected environment validation to fail");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      expect(message).toContain("DATABASE_URL");
      expect(message).toContain("PORT");
      expect(message).toContain("S3_FORCE_PATH_STYLE");
      expect(message).not.toContain(secret);
    }
  });
});

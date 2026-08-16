import { describe, expect, it } from "bun:test";
import { DrizzleQueryError } from "drizzle-orm";
import { hasDatabaseErrorCode } from "../src/repositories/database-error";

describe("hasDatabaseErrorCode", () => {
  it("finds a Postgres error code wrapped by DrizzleQueryError", () => {
    const postgresError = Object.assign(new Error("Foreign key violation"), {
      code: "23503",
    });
    const error = new DrizzleQueryError(
      'delete from "folders" where "id" = $1',
      ["folder-id"],
      postgresError,
    );

    expect(hasDatabaseErrorCode(error, "23503")).toBe(true);
  });

  it("does not match an unrelated database error", () => {
    const postgresError = Object.assign(new Error("Unique violation"), {
      code: "23505",
    });
    const error = new DrizzleQueryError(
      "insert into folders",
      [],
      postgresError,
    );

    expect(hasDatabaseErrorCode(error, "23503")).toBe(false);
  });
});

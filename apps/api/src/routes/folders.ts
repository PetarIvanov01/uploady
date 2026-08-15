import Elysia from "elysia";

export const folders = new Elysia().get("/folders", () => ({
  status: "ok",
}));

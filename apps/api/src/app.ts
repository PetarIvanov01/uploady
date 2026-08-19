import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { health } from "./routes/health";
import { uploads } from "./routes/uploads";
import "./s3";
import { folders } from "./routes/folders";
import { vault } from "./routes/vault";
import { env } from "./env";

const frontendOrigin =
  env.NODE_ENV === "production" ? "" : "http://localhost:5173";

export const app = new Elysia({ prefix: "/api/v1" })
  .use(
    cors({
      origin: frontendOrigin,
    }),
  )
  .use(health)
  .use(uploads)
  .use(folders)
  .use(vault);

export type App = typeof app;

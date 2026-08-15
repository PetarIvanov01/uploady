import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { health } from "./routes/health";
import { uploads } from "./routes/uploads";
import "./s3";
import { folders } from "./routes/folders";

const frontendOrigin =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5173";

export const app = new Elysia({ prefix: "/api/v1" })
  .use(
    cors({
      origin: frontendOrigin,
    }),
  )
  .use(health)
  .use(uploads)
  .use(folders);

export type App = typeof app;

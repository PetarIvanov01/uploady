import { Elysia } from "elysia";
import { cors } from "@elysia/cors";
import { health } from "./routes/health";
import { uploads } from "./routes/uploads";

const frontendOrigin =
  process.env.NODE_ENV === "production" ? "" : "http://localhost:5173";

export const app = new Elysia({ prefix: "/api/v1" })
  .use(
    cors({
      origin: frontendOrigin,
    }),
  )
  .use(health)
  .use(uploads);

export type App = typeof app;

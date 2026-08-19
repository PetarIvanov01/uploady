import { app } from "./app";
import { env } from "./env";

app.listen(env.PORT);

console.log(
  `Elysia is running at http://${app.server?.hostname}:${app.server?.port}`,
);
